'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { ArrowLeft, Copy, Check, Loader } from 'lucide-react';
import { useState, useMemo } from 'react';
import { CONTRACTS, PAYMENT_FACTORY_ABI, SOLVER_REGISTRY_ABI } from '@/lib/contracts';
import { formatUnits } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import { usePublicClient } from 'wagmi';
import { toast } from 'sonner';
import { PaymentStatus } from '@/lib/types';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [copied, setCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const paymentId = params.id as `0x${string}`;
  
  const { writeContractAsync: completePayment } = useWriteContract();

  // Fetch payment from blockchain
  const { data: paymentData, isLoading } = useReadContract({
    address: CONTRACTS.PAYMENT_FACTORY,
    abi: PAYMENT_FACTORY_ABI,
    functionName: 'getPayment',
    args: [paymentId],
    query: {
      enabled: !!paymentId && CONTRACTS.PAYMENT_FACTORY !== '0x',
      refetchInterval: 5000,
    },
  });

  // Fetch solver data if payment has assigned solver
  const { data: solverData } = useReadContract({
    address: CONTRACTS.SOLVER_REGISTRY,
    abi: SOLVER_REGISTRY_ABI,
    functionName: 'getSolver',
    args: [(paymentData as any)?.assignedSolver as `0x${string}`],
    query: {
      enabled: !!paymentData && 
              (paymentData as any)?.assignedSolver && 
              (paymentData as any)?.assignedSolver !== '0x0000000000000000000000000000000000000000' &&
              CONTRACTS.SOLVER_REGISTRY !== '0x',
    },
  });

  const payment = useMemo(() => {
    if (!paymentData) return null;
    
    const p = paymentData as any;
    const statusMap: Record<number, string> = {
      0: 'Pending',
      1: 'Matched',
      2: 'Processing',
      3: 'Completed',
      4: 'Cancelled',
      5: 'Expired',
    };

    const amountMUSD = formatUnits(p.amountMUSD, 18);
    const amountINR = formatUnits(p.amountINR, 0);
    
    // Calculate platform fee based on solver tier
    let platformFeePercent = 0.001; // Default 0.1%
    if (solverData) {
      const solver = solverData as any;
      const tier = Number(solver.tier);
      // Tier 0 (Free), 1 (Tier1), 2 (Tier2) = 0.20%, Tier 3 & 4 = 0.10%
      if (tier <= 2) {
        platformFeePercent = 0.002; // 0.20%
      } else {
        platformFeePercent = 0.001; // 0.10%
      }
    }
    
    const platformFee = Number(p.amountMUSD) * platformFeePercent / 1e18;
    const solverAmount = Number(amountMUSD) - platformFee;

    return {
      id: paymentId,
      user: p.user,
      solver: p.assignedSolver && p.assignedSolver !== '0x0000000000000000000000000000000000000000' ? p.assignedSolver : null,
      amount: `${amountMUSD} mUSD`,
      inrAmount: `₹${amountINR}`,
      vpa: p.merchantVPA,
      location: p.location,
      status: statusMap[Number(p.status)] || 'Pending',
      statusCode: Number(p.status),
      createdAt: new Date(Number(p.createdAt) * 1000).toLocaleString(),
      expiresAt: new Date(Number(p.expiresAt) * 1000).toLocaleString(),
      upiTxnId: p.upiTxnId || 'Pending',
      fee: `${platformFee.toFixed(4)} mUSD`,
      feePercent: `${(platformFeePercent * 100).toFixed(2)}%`,
      solverReceived: `${solverAmount.toFixed(4)} mUSD`,
      isCompleted: Number(p.status) === PaymentStatus.Completed,
    };
  }, [paymentData, solverData, paymentId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    try {
      setIsConfirming(true);
      toast.loading('⏳ Confirming payment...');

      const hash = await completePayment({
        address: CONTRACTS.PAYMENT_FACTORY as `0x${string}`,
        abi: PAYMENT_FACTORY_ABI,
        functionName: 'completePayment',
        args: [paymentId],
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
      
      // Refresh data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast.dismiss();
      toast.error(`❌ ${error.message || 'Failed to confirm payment'}`);
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4 flex items-center justify-center">
        <p className="text-red-600 font-bold">Payment not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4">
      <nav className="glass border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="text-gray-700 hover:text-blue-600 flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Payment Details</h1>
        <p className="text-gray-600 mb-8 text-lg font-mono">ID: {paymentId.slice(0, 10)}...</p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className={`glass bg-gradient-to-br ${
              payment.isCompleted 
                ? 'from-green-50 to-emerald-50 border-green-300' 
                : 'from-blue-50 to-cyan-50 border-blue-300'
            } border-2 rounded-2xl p-6`}>
              <p className={`${payment.isCompleted ? 'text-green-700' : 'text-blue-700'} text-sm font-bold mb-2`}>Status</p>
              <p className={`text-3xl font-black ${payment.isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                {payment.isCompleted ? '✓ Completed' : payment.status}
              </p>
              {payment.isCompleted && (
                <p className="text-green-700 text-sm font-medium mt-2">Settled</p>
              )}
            </div>

            {/* Amount Card */}
            <div className="glass border-2 border-gray-200 rounded-2xl p-6">
              <p className="text-gray-900 text-sm font-black mb-4">Amount</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Sent (mUSD)</p>
                  <p className="text-2xl font-black text-gray-900">{payment.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Equivalent (INR)</p>
                  <p className="text-2xl font-black text-gray-900">{payment.inrAmount}</p>
                </div>
              </div>
            </div>

            {/* UPI Transaction */}
            <div className="glass border-2 border-gray-200 rounded-2xl p-6">
              <p className="text-gray-900 text-sm font-black mb-4">UPI Transaction</p>
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200">
                <span className="text-gray-900 font-mono text-sm font-bold">{payment.upiTxnId}</span>
                {payment.upiTxnId !== 'Pending' && (
                  <button
                    onClick={() => copyToClipboard(payment.upiTxnId)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Payment Details */}
            <div className="glass border-2 border-gray-200 rounded-2xl p-6">
              <p className="text-gray-900 text-sm font-black mb-4">Payment Details</p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Merchant VPA</span>
                  <span className="text-gray-900 font-mono font-bold">{payment.vpa}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Location</span>
                  <span className="text-gray-900 font-bold">📍 {payment.location}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Created</span>
                  <span className="text-gray-900 font-bold">{payment.createdAt}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Expires</span>
                  <span className="text-gray-900 font-bold">{payment.expiresAt}</span>
                </div>
              </div>
            </div>

            {/* Settlement Breakdown */}
            {payment.isCompleted && (
              <div className="glass bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl p-6">
                <p className="text-gray-900 text-sm font-black mb-4">Settlement</p>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Sent Amount</span>
                    <span className="text-gray-900 font-bold">{payment.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Platform Fee ({payment.feePercent})</span>
                    <span className="text-red-600 font-bold">-{payment.fee}</span>
                  </div>
                  <div className="border-t-2 border-blue-300 pt-3 flex justify-between">
                    <span className="text-gray-900 font-bold">Solver Received</span>
                    <span className="text-green-600 font-black">{payment.solverReceived}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Addresses */}
            <div className="glass border-2 border-gray-200 rounded-2xl p-6">
              <p className="text-gray-900 text-sm font-black mb-4">Addresses</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">From (You)</p>
                  <p className="text-xs font-mono text-gray-900 font-bold break-all">{payment.user}</p>
                </div>
                {payment.solver && (
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">Solver</p>
                    <p className="text-xs font-mono text-gray-900 font-bold break-all">{payment.solver}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Payment Button - Only shows for user when status is Processing */}
        {payment.statusCode === PaymentStatus.Processing && payment.user.toLowerCase() === address?.toLowerCase() && (
          <div className="mt-8">
            <div className="glass border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6">
              <h3 className="text-xl font-black text-gray-900 mb-2">✋ Action Required!</h3>
              <p className="text-gray-700 mb-4 font-medium">
                The solver has marked this payment as complete. Please confirm with the merchant that they received the payment, then click below to release funds to the solver.
              </p>
              <button
                onClick={handleConfirmPayment}
                disabled={isConfirming}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-black text-lg transform hover:scale-105 transition-all shadow-lg disabled:scale-100"
              >
                {isConfirming ? '⏳ Confirming...' : '✅ Confirm Payment Received'}
              </button>
              <p className="text-xs text-gray-600 mt-3 text-center font-medium">
                By confirming, you release the locked mUSD to the solver
              </p>
            </div>
          </div>
        )}

        {/* View on Explorer */}
        <div className="mt-8 text-center">
          <a
            href={`https://explorer.test.mezo.org/tx/${paymentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold transform hover:scale-105 transition-all shadow-lg"
          >
            View on Explorer →
          </a>
        </div>
      </main>
    </div>
  );
}

