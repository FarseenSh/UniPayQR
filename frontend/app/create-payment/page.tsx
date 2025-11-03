'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAppStore } from '@/lib/store';
import { useMUSDBalance } from '@/hooks/useMUSD';
import { CONTRACTS, PAYMENT_FACTORY_ABI, MUSD_ABI } from '@/lib/contracts';
import { parseUnits } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import { toast } from 'sonner';
import { Zap, AlertCircle, CheckCircle } from 'lucide-react';

export default function CreatePaymentPage() {
  const { address } = useAccount();
  const router = useRouter();
  const scannedUPI = useAppStore((state) => state.scannedUPI);
  const [amountINR, setAmountINR] = useState('900');
  const [location, setLocation] = useState('Delhi');
  const [isApproving, setIsApproving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>();
  const [createHash, setCreateHash] = useState<`0x${string}` | undefined>();

  const { formatted } = useMUSDBalance(address);
  const { writeContractAsync: approve } = useWriteContract();
  const { writeContractAsync: createPayment } = useWriteContract();
  const publicClient = usePublicClient();

  // Wait for approval transaction receipt (for UI updates)
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Wait for create payment transaction receipt (for UI updates)
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  const exchangeRate = 83;
  const amount = Number(amountINR);
  const requiredMUSD = (amount / exchangeRate).toFixed(2);
  const balance = Number(formatted);
  
  const isValidAmount = amount >= 100 && amount <= 100000;
  const hasSufficientBalance = balance >= Number(requiredMUSD);
  const canPay = isValidAmount && hasSufficientBalance;

  const handleCreatePayment = async () => {
    if (!scannedUPI || !address || !canPay) return;

    try {
      const musdAmount = parseUnits(requiredMUSD, 18);

      setIsApproving(true);
      toast.loading('🔐 Approving mUSD...');

      const approveTxHash = await approve({
        address: CONTRACTS.MUSD as `0x${string}`,
        abi: MUSD_ABI,
        functionName: 'approve',
        args: [CONTRACTS.PAYMENT_FACTORY as `0x${string}`, musdAmount],
      });

      setApproveHash(approveTxHash);
      toast.loading('⏳ Waiting for approval confirmation...');

      // Wait for transaction confirmation using viem
      if (publicClient) {
        await waitForTransactionReceipt(publicClient, {
          hash: approveTxHash,
          timeout: 60000, // 60 seconds timeout
        });
      }
      
      toast.dismiss();
      toast.success('✅ Approval confirmed!');
      setIsApproving(false);
      setApproveHash(undefined);

      setIsCreating(true);
      toast.loading('⚡ Creating payment...');

      const createTxHash = await createPayment({
        address: CONTRACTS.PAYMENT_FACTORY as `0x${string}`,
        abi: PAYMENT_FACTORY_ABI,
        functionName: 'createPayment',
        args: [
          musdAmount,
          BigInt(Math.floor(amount)),
          scannedUPI.payeeAddress,
          location
        ],
      });

      setCreateHash(createTxHash);
      toast.loading('⏳ Waiting for payment creation confirmation...');

      // Wait for transaction confirmation using viem
      if (publicClient) {
        await waitForTransactionReceipt(publicClient, {
          hash: createTxHash,
          timeout: 60000, // 60 seconds timeout
        });
      }
      
      toast.dismiss();
      toast.success('✅ Payment created!');
      setIsCreating(false);
      setTimeout(() => router.push('/dashboard'), 2000);
      setCreateHash(undefined);
    } catch (error: any) {
      toast.dismiss();
      toast.error(`❌ ${error.message || 'Transaction failed'}`);
      setIsApproving(false);
      setIsCreating(false);
      setApproveHash(undefined);
      setCreateHash(undefined);
    }
  };

  if (!scannedUPI) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No Payment Data</h2>
          <p className="text-gray-600 mb-6">Please scan a QR code or enter UPI ID first</p>
          <button
            onClick={() => router.push('/scan')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Go to Scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Confirm Payment</h1>
        <p className="text-gray-600 mb-8 text-lg">Review details and confirm</p>

        <div className="glass rounded-2xl p-8 shadow-xl border-2 border-gray-200 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
            <p className="text-sm text-gray-700 font-medium mb-2">Paying to</p>
            <p className="text-lg font-mono text-gray-900 font-bold">{scannedUPI.payeeAddress}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">Amount (₹)</label>
            <input
              type="number"
              value={amountINR}
              onChange={(e) => setAmountINR(e.target.value)}
              className="w-full px-4 py-3 glass border-2 border-gray-200 rounded-xl text-2xl font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1000"
            />
            {!isValidAmount && amount > 0 && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                Amount must be ₹100-₹100,000
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 glass border-2 border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai'].map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border-2 border-blue-300 space-y-3">
            <div className="flex justify-between text-gray-700">
              <span className="font-medium">Amount</span>
              <span className="font-bold">₹{amount}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span className="font-medium">Exchange Rate</span>
              <span className="font-bold">₹{exchangeRate}/mUSD</span>
            </div>
            <div className="border-t-2 border-blue-200 pt-3 flex justify-between">
              <span className="font-bold text-gray-900">You pay</span>
              <span className="text-2xl font-black text-blue-600">{requiredMUSD} mUSD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Your Balance</span>
              <span className={`font-bold ${balance >= Number(requiredMUSD) ? 'text-green-600' : 'text-red-600'}`}>
                {formatted} mUSD
              </span>
            </div>
          </div>

          {!hasSufficientBalance && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 text-sm font-medium">Insufficient mUSD balance</p>
            </div>
          )}

          {canPay && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-700 text-sm font-medium">Ready to pay!</p>
            </div>
          )}

          <button
            onClick={handleCreatePayment}
            disabled={!canPay || isApproving || isCreating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transform hover:scale-105 transition-all shadow-lg"
          >
            <Zap className="w-5 h-5" />
            {isApproving ? 'Approving mUSD...' : isCreating ? 'Creating Payment...' : `Pay ${requiredMUSD} mUSD`}
          </button>
        </div>
      </div>
    </div>
  );
}

