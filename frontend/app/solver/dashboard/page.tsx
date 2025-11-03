'use client';

import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Award, DollarSign, MapPin, User, ExternalLink, Clock, Loader } from 'lucide-react';
import { CONTRACTS, SOLVER_REGISTRY_ABI, PAYMENT_FACTORY_ABI } from '@/lib/contracts';
import { useMemo, useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { toast } from 'sonner';

export default function SolverDashboardPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [submittingProof, setSubmittingProof] = useState<string | null>(null);

  const { data: solverData, isLoading } = useReadContract({
    address: CONTRACTS.SOLVER_REGISTRY,
    abi: SOLVER_REGISTRY_ABI,
    functionName: 'getSolver',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && CONTRACTS.SOLVER_REGISTRY !== '0x',
      refetchInterval: 5000,
    },
  });

  // WORKAROUND: Fetch recent payment events and filter by assigned solver
  // Since getSolverPayments doesn't exist, we query payment IDs from events/storage
  const [assignedPaymentIds, setAssignedPaymentIds] = useState<`0x${string}`[]>([]);
  
  useEffect(() => {
    if (!address) return;
    
    const fetchPayments = () => {
      const solverKey = `solver_payments_${address.toLowerCase()}`;
      const stored = localStorage.getItem(solverKey);
      
      console.log(`🔍 Checking localStorage for key: ${solverKey}`);
      console.log(`📦 Found data:`, stored);
      
      if (stored) {
        try {
          const ids = JSON.parse(stored);
          console.log(`✅ Parsed ${ids.length} payment IDs:`, ids);
          setAssignedPaymentIds(ids);
        } catch (e) {
          console.error('❌ Failed to parse stored payments', e);
        }
      } else {
        console.log('⚠️ No payments found in localStorage for this solver');
      }
    };
    
    // Fetch immediately
    fetchPayments();
    
    // Poll every 3 seconds
    const interval = setInterval(fetchPayments, 3000);
    
    return () => clearInterval(interval);
  }, [address]);

  // Fetch details of all assigned payments
  const paymentContracts = useMemo(() => {
    if (!assignedPaymentIds || assignedPaymentIds.length === 0) return [];
    return (assignedPaymentIds as `0x${string}`[]).map((id: `0x${string}`) => ({
      address: CONTRACTS.PAYMENT_FACTORY,
      abi: PAYMENT_FACTORY_ABI,
      functionName: 'getPayment' as const,
      args: [id],
    }));
  }, [assignedPaymentIds]);

  const { data: paymentsData } = useReadContracts({
    contracts: paymentContracts,
    query: {
      enabled: paymentContracts.length > 0,
    },
  });

  const { writeContractAsync: submitProof } = useWriteContract();

  const solver = useMemo(() => {
    if (!solverData) return null;
    
    const s = solverData as any;
    const tierNames = ['Free', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
    const tierName = tierNames[Number(s.tier)] || 'Unknown';

    const total = Number(s.successfulPayments) + Number(s.failedPayments);
    const successRate = total > 0 
      ? (Number(s.successfulPayments) / total) * 100 
      : 100;

    return {
      address: s.solverAddress,
      stake: formatUnits(s.stakedAmount, 18),
      tier: tierName,
      tierNumber: Number(s.tier),
      volume: formatUnits(s.totalVolume, 18),
      successful: Number(s.successfulPayments),
      failed: Number(s.failedPayments),
      successRate: successRate.toFixed(1),
      location: s.location,
      fee: (Number(s.feePercent) / 100).toFixed(2),
      monthlyLimit: Number(s.monthlyVolumeLimit) > 1e30 
        ? 'Unlimited' 
        : `₹${(Number(s.monthlyVolumeLimit) / 1e18).toLocaleString('en-IN')}`,
      currentMonth: `₹${(Number(s.currentMonthVolume) / 1e18).toLocaleString('en-IN')}`,
      limitPercent: Number(s.monthlyVolumeLimit) > 1e30 
        ? 0 
        : (Number(s.currentMonthVolume) / Number(s.monthlyVolumeLimit)) * 100,
      isActive: s.isActive,
    };
  }, [solverData]);

  const payments = useMemo(() => {
    if (!paymentsData || !assignedPaymentIds) return [];
    
    return paymentsData
      .map((result: any, index: number) => {
        if (!result.result) return null;
        const p = result.result;
        const paymentId = assignedPaymentIds[index] as string;
        
        const statusMap: Record<number, string> = {
          0: 'Pending',
          1: 'Matched',
          2: 'Processing',
          3: 'Completed',
          4: 'Cancelled',
          5: 'Expired',
        };

        return {
          id: paymentId,
          user: p.user,
          amount: formatUnits(p.amountMUSD, 18),
          inrAmount: formatUnits(p.amountINR, 0),
          vpa: p.merchantVPA,
          location: p.location,
          status: statusMap[Number(p.status)] || 'Pending',
          statusCode: Number(p.status),
          createdAt: new Date(Number(p.createdAt) * 1000).toLocaleString(),
          expiresAt: new Date(Number(p.expiresAt) * 1000).toLocaleString(),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.statusCode === 1 ? 1 : -1) - (a?.statusCode === 1 ? 1 : -1)); // Matched first
  }, [paymentsData, assignedPaymentIds]);

  const handleSubmitProof = async (paymentId: string) => {
    try {
      setSubmittingProof(paymentId);
      
      // Find payment to validate
      const payment = payments.find((p: any) => p.id === paymentId);
      
      if (!payment) {
        toast.error('❌ Payment not found!');
        setSubmittingProof(null);
        return;
      }
      
      console.log('🔍 Payment details before submit:', {
        id: payment.id.slice(0, 10),
        status: payment.status,
        statusCode: payment.statusCode,
        user: payment.user,
        connectedAddress: address,
      });
      
      // Validate status is "Matched" (1)
      if (payment.statusCode !== 1) {
        toast.error(`❌ Cannot submit! Payment status is "${payment.status}". Must be "Matched".`);
        setSubmittingProof(null);
        return;
      }
      
      toast.loading('📝 Submitting proof of payment...');
      
      const hash = await submitProof({
        address: CONTRACTS.PAYMENT_FACTORY as `0x${string}`,
        abi: PAYMENT_FACTORY_ABI,
        functionName: 'submitProof',
        args: [paymentId as `0x${string}`, 'UPI_TXN_' + Date.now()],
      });

      toast.dismiss();
      toast.success('✅ Proof submitted! Waiting for user confirmation...');
      setSubmittingProof(null);
    } catch (error: any) {
      console.error('❌ Submit proof error:', error);
      toast.dismiss();
      toast.error(`❌ ${error.message || 'Failed to submit proof'}`);
      setSubmittingProof(null);
    }
  };

  // Client-side only rendering to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!solver || !solver.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4">
        <div className="max-w-2xl mx-auto py-12 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-4">Not Registered</h1>
          <p className="text-gray-600 mb-8 text-lg">You need to register as a solver first</p>
          <button
            onClick={() => router.push('/solver/onboarding')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold"
          >
            Register Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50">
      <nav className="glass border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button 
            onClick={() => router.push('/')} 
            className="text-gray-700 hover:text-blue-600 flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Home
          </button>
          <h1 className="text-xl font-black text-gray-900">Solver Dashboard</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Solver Information */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 border-2 border-gray-200 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-black text-gray-900">Solver Profile</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Address</p>
                  <p className="text-xs font-mono text-gray-900 font-bold break-all">
                    {solver.address.slice(0, 8)}...{solver.address.slice(-6)}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Location</p>
                  <p className="text-sm text-gray-900 font-bold">📍 {solver.location}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Tier</p>
                  <p className="text-sm text-gray-900 font-bold">{solver.tier}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Service Fee</p>
                  <p className="text-sm text-gray-900 font-bold">{solver.fee}%</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Stake</p>
                  <p className="text-sm text-gray-900 font-bold">{solver.stake} mUSD</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Cards - 4 in one row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Tier Card */}
              <div className="glass bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl p-5 card-hover">
                <Award className="w-8 h-8 text-blue-600 mb-2" />
                <div className="text-gray-600 text-xs font-medium mb-1">Current Tier</div>
                <div className="text-gray-900 font-black text-xl">{solver.tier}</div>
              </div>

              {/* Success Rate Card */}
              <div className="glass bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-5 card-hover">
                <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                <div className="text-gray-600 text-xs font-medium mb-1">Success Rate</div>
                <div className="text-gray-900 font-black text-xl">{solver.successRate}%</div>
                <div className="text-green-700 text-xs font-medium mt-1">
                  {solver.successful} / {solver.successful + solver.failed}
                </div>
              </div>

              {/* Total Volume Card */}
              <div className="glass bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-2xl p-5 card-hover">
                <DollarSign className="w-8 h-8 text-purple-600 mb-2" />
                <div className="text-gray-600 text-xs font-medium mb-1">Total Volume</div>
                <div className="text-gray-900 font-black text-xl">{parseFloat(solver.volume).toFixed(2)}</div>
                <div className="text-purple-700 text-xs font-medium mt-1">mUSD</div>
              </div>

              {/* Monthly Limits Card */}
              <div className="glass bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-2xl p-5 card-hover">
                <Clock className="w-8 h-8 text-orange-600 mb-2" />
                <div className="text-gray-600 text-xs font-medium mb-1">This Month</div>
                <div className="text-gray-900 font-black text-xl truncate">{solver.currentMonth}</div>
                <div className="text-orange-700 text-xs font-medium mt-1">
                  of {solver.monthlyLimit}
                </div>
                {solver.monthlyLimit !== 'Unlimited' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-orange-600 to-red-600 h-1.5 rounded-full transition-all" 
                        style={{ width: `${Math.min(100, solver.limitPercent)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Incoming Payments */}
            <div className="glass rounded-2xl p-6 border-2 border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-gray-900">Incoming Payments</h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-300">
                  {payments.length} assigned
                </span>
              </div>
              
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">No incoming payments yet</p>
                  <p className="text-gray-500 text-sm mt-2">Payments will appear here when assigned to you</p>
                  <p className="text-yellow-600 text-xs mt-4">
                    💡 Demo mode: Payments auto-detected via blockchain events
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div 
                      key={payment.id}
                      className="glass border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              payment.statusCode === 1 
                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
                                : payment.statusCode === 2
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : payment.statusCode === 3
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}>
                              {payment.status}
                            </span>
                            <span className="text-xs text-gray-600 font-medium">📍 {payment.location}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                              <span className="text-gray-600 font-medium">Amount:</span>
                              <span className="text-gray-900 font-black ml-1">₹{payment.inrAmount}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 font-medium">mUSD:</span>
                              <span className="text-gray-900 font-black ml-1">{parseFloat(payment.amount).toFixed(4)}</span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-600 font-mono">
                            VPA: {payment.vpa}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {payment.statusCode === 1 && (
                            <button
                              onClick={() => handleSubmitProof(payment.id)}
                              disabled={submittingProof === payment.id}
                              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap"
                            >
                              {submittingProof === payment.id ? 'Submitting...' : 'Mark Complete'}
                            </button>
                          )}
                          {payment.statusCode === 2 && (
                            <span className="text-xs text-blue-700 font-bold bg-blue-100 px-3 py-2 rounded-lg text-center">
                              Waiting for user confirmation
                            </span>
                          )}
                          {payment.statusCode === 3 && (
                            <span className="text-xs text-green-700 font-bold bg-green-100 px-3 py-2 rounded-lg text-center">
                              ✓ Settled
                            </span>
                          )}
                          <button
                            onClick={() => router.push(`/payment/${payment.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                          >
                            Details <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
