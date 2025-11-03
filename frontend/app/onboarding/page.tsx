'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CheckCircle, Wallet } from 'lucide-react';
import { useMUSDBalance } from '@/hooks/useMUSD';

export default function OnboardingPage() {
  const { address } = useAccount();
  const router = useRouter();
  const { formatted } = useMUSDBalance(address);
  const [step, setStep] = useState(1);

  const hasMUSD = Number(formatted) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-12">Welcome</h1>

        {step === 1 && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 shadow-lg">
            <Wallet className="w-12 h-12 text-blue-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
            {!address ? (
              <>
                <p className="text-blue-100 mb-6">Connect to Mezo Testnet</p>
                <ConnectButton />
              </>
            ) : (
              <>
                <p className="text-green-400 mb-4">✓ Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Continue →
                </button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Get Real mUSD</h2>
            <p className="text-blue-100 mb-4 font-semibold">Steps:</p>
            <ol className="space-y-3 mb-6 text-left text-blue-100">
              <li>1. Join Discord: discord.mezo.org</li>
              <li>2. Get testnet BTC from #faucet</li>
              <li>3. Go to mezo.org</li>
              <li>4. Deposit BTC and borrow mUSD</li>
            </ol>
            <p className="text-blue-200 mb-6">Balance: <span className="font-bold">{formatted} mUSD</span></p>
            <button
              onClick={() => setStep(3)}
              disabled={!hasMUSD}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-500"
            >
              {hasMUSD ? 'Continue →' : 'Get mUSD First'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 shadow-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Ready!</h2>
            <button
              onClick={() => router.push('/scan')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg"
            >
              Scan QR & Pay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

