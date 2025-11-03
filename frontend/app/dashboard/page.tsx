'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useDisconnect, useWriteContract, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/navigation';
import { LogOut, TrendingUp, DollarSign, CheckCircle, Clock, Scan, Activity, ArrowRight, Loader, X, ExternalLink } from 'lucide-react';
import { CONTRACTS, PAYMENT_FACTORY_ABI } from '@/lib/contracts';
import { useMUSDBalance } from '@/hooks/useMUSD';
import { formatUnits } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const publicClient = usePublicClient();
  const { formatted: balance } = useMUSDBalance(address);
  const [mounted, setMounted] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { writeContractAsync: completePayment } = useWriteContract();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user's payment IDs
  const { data: paymentIds, isLoading } = useReadContract({
    address: CONTRACTS.PAYMENT_FACTORY,
    abi: PAYMENT_FACTORY_ABI,
    functionName: 'getUserPayments',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!isConnected && CONTRACTS.PAYMENT_FACTORY !== '0x',
      refetchInterval: 5000,
    },
  });

  // Fetch payment details for each ID
  const paymentContracts = (paymentIds as `0x${string}`[] || []).map((id) => ({
    address: CONTRACTS.PAYMENT_FACTORY,
    abi: PAYMENT_FACTORY_ABI,
    functionName: 'getPayment' as const,
    args: [id],
  }));

  const { data: paymentsData } = useReadContracts({
    contracts: paymentContracts,
    query: {
      enabled: paymentContracts.length > 0,
    },
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!paymentsData) return { total: 0, completed: 0, pending: 0, totalSpent: 0, successRate: 0 };
    
    const payments = paymentsData.map((p: any) => p.result).filter(Boolean);
    const completed = payments.filter((p: any) => Number(p.status) === 3).length;
    const pending = payments.filter((p: any) => Number(p.status) === 0 || Number(p.status) === 1).length;
    const totalSpent = payments
      .filter((p: any) => Number(p.status) === 3)
      .reduce((sum: number, p: any) => sum + Number(p.amountMUSD), 0);
    
    return {
      total: payments.length,
      completed,
      pending,
      totalSpent: formatUnits(BigInt(totalSpent || 0), 18),
      successRate: payments.length > 0 ? ((completed / payments.length) * 100).toFixed(1) : '0',
    };
  }, [paymentsData]);

  // Payment history
  const payments = useMemo(() => {
    if (!paymentsData || !paymentIds) return [];
    
    const processedPayments = paymentsData
      .map((result: any, index: number) => {
        if (!result.result) return null;
        const p = result.result;
        const paymentId = paymentIds[index] as string;
        
        const statusMap: Record<number, { label: string; color: string }> = {
          0: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
          1: { label: 'Matched', color: 'bg-blue-100 text-blue-700 border-blue-300' },
          2: { label: 'Processing', color: 'bg-purple-100 text-purple-700 border-purple-300' },
          3: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-300' },
          4: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-300' },
          5: { label: 'Expired', color: 'bg-gray-100 text-gray-700 border-gray-300' },
        };

        const status = statusMap[Number(p.status)] || statusMap[0];

        const payment = {
          id: paymentId,
          amount: formatUnits(p.amountMUSD, 18),
          inrAmount: formatUnits(p.amountINR, 0),
          vpa: p.merchantVPA,
          location: p.location,
          assignedSolver: p.assignedSolver,
          upiTxnId: p.upiTxnId || 'Pending',
          status: status.label,
          statusCode: Number(p.status),
          statusColor: status.color,
          createdAt: new Date(Number(p.createdAt) * 1000).toLocaleString(),
          expiresAt: new Date(Number(p.expiresAt) * 1000).toLocaleString(),
        };
        
        return payment;
      })
      .filter(Boolean)
      .reverse(); // Most recent first
    
    // WORKAROUND: Store ALL payment IDs assigned to solvers in localStorage for demo
    // This runs every time payments are fetched/updated
    processedPayments.forEach((payment: any) => {
      if (payment.assignedSolver && payment.assignedSolver !== '0x0000000000000000000000000000000000000000') {
        const solverKey = `solver_payments_${payment.assignedSolver.toLowerCase()}`;
        try {
          const existing = localStorage.getItem(solverKey);
          const paymentIds = existing ? JSON.parse(existing) : [];
          if (!paymentIds.includes(payment.id)) {
            paymentIds.push(payment.id);
            localStorage.setItem(solverKey, JSON.stringify(paymentIds));
            console.log(`✅ Stored payment ${payment.id.slice(0, 10)}... for solver ${payment.assignedSolver.slice(0, 10)}...`);
          }
        } catch (e) {
          console.error('Failed to store payment for solver', e);
        }
      }
    });
    
    return processedPayments;
  }, [paymentsData, paymentIds]);

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      setIsConfirming(true);
      toast.loading('⏳ Confirming payment...');

      const hash = await completePayment({
        address: CONTRACTS.PAYMENT_FACTORY as `0x${string}`,
        abi: PAYMENT_FACTORY_ABI,
        functionName: 'completePayment',
        args: [paymentId as `0x${string}`],
      });

      toast.dismiss();
      toast.loading('⏳ Waiting for confirmation...');

      if (publicClient) {
        await waitForTransactionReceipt(publicClient, {
          hash,
          timeout: 60000,
        });
      }

      toast.dismiss();
      toast.success('✅ Payment confirmed! Funds distributed to solver!');
      setIsConfirming(false);
      setSelectedPayment(null);
      
      // Refresh page
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast.dismiss();
      toast.error(`❌ ${error.message || 'Failed to confirm payment'}`);
      setIsConfirming(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
            <Scan className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Welcome to UniPayQR</h2>
          <p className="text-gray-600 mb-8 text-lg">
            Connect your wallet to start making payments
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50">
      {/* Navbar */}
      <nav className="glass border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <p className="text-xs text-gray-600 font-medium">mUSD Balance</p>
              <p className="text-lg font-black text-gray-900">{balance || '0'}</p>
            </div>
            <button
              onClick={() => disconnect()}
              className="text-gray-600 hover:text-red-600 flex items-center gap-2 font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Analytics */}
          <div className="lg:col-span-3 space-y-6">
            {/* Quick Action */}
            <div className="glass bg-gradient-to-br from-blue-600 to-purple-600 border-2 border-blue-300 rounded-2xl p-8">
              <h2 className="text-white text-3xl font-black mb-2">Ready to Pay?</h2>
              <p className="text-blue-100 mb-6 text-lg">Scan a QR code or enter merchant details to get started</p>
              <button
                onClick={() => router.push('/scan')}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-black text-lg flex items-center gap-3 hover:scale-105 transition-transform shadow-xl"
              >
                <Scan className="w-6 h-6" />
                New Payment
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Total Payments */}
              <div className="glass bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl p-5 card-hover">
                <Activity className="w-8 h-8 text-blue-600 mb-2" />
                <div className="text-gray-600 text-xs font-medium mb-1">Total Payments</div>
                <div className="text-gray-900 font-black text-3xl">{analytics.total}</div>
              </div>

              {/* Completed */}
              <div className="glass bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-5 card-hover">
                <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                <div className="text-gray-600 text-xs font-medium mb-1">Completed</div>
                <div className="text-gray-900 font-black text-3xl">{analytics.completed}</div>
                <div className="text-green-700 text-xs font-medium mt-1">{analytics.successRate}% success</div>
              </div>

              {/* Pending */}
              <div className="glass bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-5 card-hover">
                <Clock className="w-8 h-8 text-yellow-600 mb-2" />
                <div className="text-gray-600 text-xs font-medium mb-1">Pending</div>
                <div className="text-gray-900 font-black text-3xl">{analytics.pending}</div>
              </div>

              {/* Total Spent */}
              <div className="glass bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-2xl p-5 card-hover">
                <DollarSign className="w-8 h-8 text-purple-600 mb-2" />
                <div className="text-gray-600 text-xs font-medium mb-1">Total Spent</div>
                <div className="text-gray-900 font-black text-xl truncate">{parseFloat(analytics.totalSpent).toFixed(2)}</div>
                <div className="text-purple-700 text-xs font-medium mt-1">mUSD</div>
              </div>
            </div>

            {/* Recent Activity Chart Placeholder */}
            <div className="glass border-2 border-gray-200 rounded-2xl p-6">
              <h3 className="text-2xl font-black text-gray-900 mb-4">Payment Activity</h3>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-gray-200">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Activity chart coming soon</p>
                  <p className="text-gray-500 text-sm mt-2">{analytics.total} total transactions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Payment History */}
          <div className="lg:col-span-1">
            <div className="glass border-2 border-gray-200 rounded-2xl p-6 sticky top-24">
              <h3 className="text-xl font-black text-gray-900 mb-4">Payment History</h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <Scan className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No payments yet</p>
                  <p className="text-gray-500 text-xs mt-2">Create your first payment!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {payments.map((payment) => (
                    <button
                      key={payment.id}
                      onClick={() => setSelectedPayment(payment)}
                      className="w-full glass border border-gray-200 rounded-xl p-4 text-left hover:shadow-lg transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-gray-600">{payment.vpa}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${payment.statusColor}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="text-lg font-black text-gray-900 mb-1">₹{payment.inrAmount}</div>
                      <div className="text-xs text-gray-600 font-medium">{payment.createdAt}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass border-2 border-gray-200 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-black text-gray-900">Payment Details</h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div className="glass bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4">
                <p className="text-sm text-gray-600 font-medium mb-1">Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${selectedPayment.statusColor}`}>
                  {selectedPayment.status}
                </span>
              </div>

              {/* Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass border-2 border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">Amount (INR)</p>
                  <p className="text-2xl font-black text-gray-900">₹{selectedPayment.inrAmount}</p>
                </div>
                <div className="glass border-2 border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">Amount (mUSD)</p>
                  <p className="text-2xl font-black text-gray-900">{parseFloat(selectedPayment.amount).toFixed(4)}</p>
                </div>
              </div>

              {/* Details */}
              <div className="glass border-2 border-gray-200 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Merchant VPA</p>
                  <p className="text-sm font-mono text-gray-900 font-bold">{selectedPayment.vpa}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Location</p>
                  <p className="text-sm text-gray-900 font-bold">📍 {selectedPayment.location}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Created</p>
                  <p className="text-sm text-gray-900 font-bold">{selectedPayment.createdAt}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Assigned Solver</p>
                  <p className="text-xs font-mono text-gray-900 font-bold break-all">
                    {selectedPayment.assignedSolver === '0x0000000000000000000000000000000000000000' 
                      ? 'Not yet assigned' 
                      : selectedPayment.assignedSolver}
                  </p>
                </div>
                {selectedPayment.upiTxnId && selectedPayment.upiTxnId !== 'Pending' && (
                  <div>
                    <p className="text-xs text-gray-600 font-medium">UPI Transaction ID</p>
                    <p className="text-sm font-mono text-gray-900 font-bold">{selectedPayment.upiTxnId}</p>
                  </div>
                )}
              </div>

              {/* Confirm Button - Shows when status is Processing */}
              {selectedPayment.statusCode === 2 && (
                <div className="glass border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6">
                  <h3 className="text-xl font-black text-gray-900 mb-2">✋ Action Required!</h3>
                  <p className="text-gray-700 mb-4 font-medium">
                    The solver has completed the payment. Please confirm with the merchant that they received the money, then click below to release funds.
                  </p>
                  <button
                    onClick={() => handleConfirmPayment(selectedPayment.id)}
                    disabled={isConfirming}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-black text-lg transform hover:scale-105 transition-all shadow-lg disabled:scale-100"
                  >
                    {isConfirming ? '⏳ Confirming...' : '✅ Confirm Payment Received'}
                  </button>
                  <p className="text-xs text-gray-600 mt-3 text-center font-medium">
                    By confirming, you release the locked mUSD to the solver
                  </p>
                </div>
              )}

              {/* View Full Details Link */}
              <button
                onClick={() => {
                  setSelectedPayment(null);
                  router.push(`/payment/${selectedPayment.id}`);
                }}
                className="w-full text-blue-600 hover:text-blue-700 font-bold flex items-center justify-center gap-2 py-3"
              >
                View Full Details
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
