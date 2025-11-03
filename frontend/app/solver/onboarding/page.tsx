'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useReadContract, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useMUSDBalance } from '@/hooks/useMUSD';
import { CONTRACTS, SOLVER_REGISTRY_ABI, MUSD_ABI } from '@/lib/contracts';
import { parseUnits } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, AlertCircle, Sparkles, Zap, Rocket, Crown, LogOut, ExternalLink } from 'lucide-react';

type SolverTier = 'free' | '100' | '500' | '1000' | '10000';

interface TierInfo {
  id: SolverTier;
  stake: string;
  fee: string;
  monthlyLimit: string;
  icon: any;
  color: string;
  description: string;
}

const TIERS: TierInfo[] = [
  {
    id: 'free',
    stake: '0',
    fee: '0.5%',
    monthlyLimit: '₹10,000',
    icon: Sparkles,
    color: 'from-green-100 to-emerald-100 border-green-300',
    description: 'Start for free! Perfect for testing'
  },
  {
    id: '100',
    stake: '100',
    fee: '0.75%',
    monthlyLimit: '₹50,000',
    icon: Zap,
    color: 'from-blue-100 to-cyan-100 border-blue-300',
    description: 'Great for small volumes'
  },
  {
    id: '500',
    stake: '500',
    fee: '1%',
    monthlyLimit: '₹2 Lakhs',
    icon: Rocket,
    color: 'from-purple-100 to-pink-100 border-purple-300',
    description: 'Best for growing businesses'
  },
  {
    id: '1000',
    stake: '1000',
    fee: '1.5%',
    monthlyLimit: '₹5 Lakhs',
    icon: Crown,
    color: 'from-yellow-100 to-orange-100 border-yellow-300',
    description: 'Premium tier for serious solvers'
  },
  {
    id: '10000',
    stake: '10000',
    fee: '2%',
    monthlyLimit: 'Unlimited',
    icon: Crown,
    color: 'from-red-100 to-rose-100 border-red-300',
    description: 'Maximum volume capability'
  }
];

export default function SolverOnboardingPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const { formatted: balance } = useMUSDBalance(address);
  
  const [selectedTier, setSelectedTier] = useState<SolverTier>('free');
  const [location, setLocation] = useState('Delhi');
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>();
  const [registerHash, setRegisterHash] = useState<`0x${string}` | undefined>();

  // Check if solver is already registered (ONLY if wallet is connected)
  const { data: solverData, isLoading: isCheckingRegistration } = useReadContract({
    address: CONTRACTS.SOLVER_REGISTRY as `0x${string}`,
    abi: SOLVER_REGISTRY_ABI,
    functionName: 'getSolver',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!isConnected, // Only check if wallet is connected
    },
  });

  const isAlreadyRegistered = isConnected && solverData && (solverData as any).isActive; // Access isActive property directly

  // Redirect if already registered
  useEffect(() => {
    if (isAlreadyRegistered && isConnected) {
      toast.error('❌ You are already registered as a solver!');
      setTimeout(() => {
        router.push('/solver/dashboard');
      }, 2000);
    }
  }, [isAlreadyRegistered, isConnected, router]);

  const { writeContractAsync: approve } = useWriteContract();
  const { writeContractAsync: registerSolver } = useWriteContract();
  const publicClient = usePublicClient();

  // Wait for approval transaction receipt (for UI updates)
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Wait for registration transaction receipt (for UI updates)
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });

  const selectedTierInfo = TIERS.find(t => t.id === selectedTier)!;
  const stakeAmount = selectedTierInfo.stake;
  const stakeAmountParsed = parseUnits(stakeAmount, 18);
  const balanceParsed = parseUnits(balance || '0', 18);
  const hasSufficientBalance = balanceParsed >= stakeAmountParsed || selectedTier === 'free';

  // Determine fee percent based on tier (all fixed now)
  const getFeePercent = (): bigint => {
    if (selectedTier === 'free') {
      return BigInt(50); // 0.5% = 50 basis points
    } else if (selectedTier === '100') {
      return BigInt(75); // 0.75% = 75 basis points
    } else if (selectedTier === '500') {
      return BigInt(100); // 1% = 100 basis points
    } else if (selectedTier === '1000') {
      return BigInt(150); // 1.5% = 150 basis points
    } else if (selectedTier === '10000') {
      return BigInt(200); // 2% = 200 basis points
    }
    return BigInt(100); // Default
  };

  const handleRegister = async () => {
    if (!address || (!hasSufficientBalance && selectedTier !== 'free')) return;

    // Double-check if already registered
    if (isAlreadyRegistered) {
      toast.error('❌ You are already registered as a solver!');
      router.push('/solver/dashboard');
      return;
    }

    try {
      // Step 1: Approve mUSD (only if stake > 0)
      if (stakeAmountParsed > 0n) {
        toast.loading('Approving mUSD for staking...');
        const approveTxHash = await approve({
          address: CONTRACTS.MUSD as `0x${string}`,
          abi: MUSD_ABI,
          functionName: 'approve',
          args: [CONTRACTS.SOLVER_REGISTRY as `0x${string}`, stakeAmountParsed],
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
        setApproveHash(undefined);
      }

      // Step 2: Register solver
      toast.loading('Registering as solver...');
      const registerTxHash = await registerSolver({
        address: CONTRACTS.SOLVER_REGISTRY as `0x${string}`,
        abi: SOLVER_REGISTRY_ABI,
        functionName: 'registerSolver',
        args: [
          stakeAmountParsed,
          location,
          getFeePercent(),
        ],
      });

      setRegisterHash(registerTxHash);
      toast.loading('⏳ Waiting for registration confirmation...');

      // Wait for transaction confirmation using viem
      if (publicClient) {
        await waitForTransactionReceipt(publicClient, {
          hash: registerTxHash,
          timeout: 60000, // 60 seconds timeout
        });
      }
      
      toast.dismiss();
      toast.success('✅ Successfully registered as solver!');
      setTimeout(() => {
        router.push('/solver/dashboard');
      }, 2000);
      setRegisterHash(undefined);
    } catch (error: any) {
      toast.dismiss();
      console.error('Registration error:', error);
      
      // Better error messages
      let errorMessage = 'Registration failed';
      if (error.message?.includes('Already registered')) {
        errorMessage = 'You are already registered as a solver';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient mUSD balance';
      } else if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction rejected';
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      }
      
      toast.error(`❌ ${errorMessage}`);
      setApproveHash(undefined);
      setRegisterHash(undefined);
    }
  };

  // Show connect wallet screen FIRST if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Become a Solver</h2>
          <p className="text-gray-600 mb-8 text-lg">
            Connect your wallet to register as a solver and start earning from payments
          </p>
          <ConnectButton />
          <button
            onClick={() => router.back()}
            className="mt-6 text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while checking registration (AFTER wallet connected)
  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Checking registration status...</p>
        </div>
      </div>
    );
  }

  // Show already registered message (AFTER wallet connected and check complete)
  if (isAlreadyRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Already Registered</h2>
          <p className="text-gray-600 mb-6">You are already registered as a solver. Redirecting to your dashboard...</p>
          <button
            onClick={() => router.push('/solver/dashboard')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-4">
      <nav className="glass border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <button 
            onClick={() => router.back()} 
            className="text-gray-700 hover:text-blue-600 flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Become a Solver</h1>
        <p className="text-gray-600 mb-8 text-lg">Choose your tier and start earning from payments</p>

        {/* Tier Selection */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isSelected = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`bg-gradient-to-br ${tier.color} border-2 rounded-xl p-6 text-left transition-all card-hover ${
                  isSelected ? 'ring-4 ring-blue-500 scale-105 shadow-xl' : ''
                }`}
              >
                <Icon className={`w-8 h-8 mb-3 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                <div className="text-gray-900 font-bold text-xl mb-1">
                  {tier.stake === '0' ? 'FREE' : `${tier.stake} mUSD`}
                </div>
                <div className="text-gray-700 text-xs mb-2">{tier.description}</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="font-medium">Fee: {tier.fee}</div>
                  <div className="font-medium">Limit: {tier.monthlyLimit}</div>
                </div>
                {isSelected && (
                  <div className="mt-3 text-green-600 text-sm font-bold">✓ Selected</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="glass rounded-2xl p-8 space-y-6 shadow-xl">
          {/* Selected Tier Info */}
          <div className={`bg-gradient-to-br ${selectedTierInfo.color} rounded-xl p-6 border-2`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900 font-black text-xl">
                  {selectedTierInfo.stake === '0' ? 'Free Tier' : `${selectedTierInfo.stake} mUSD Tier`}
                </h3>
                <p className="text-gray-700 text-sm">{selectedTierInfo.description}</p>
              </div>
              {selectedTierInfo.stake !== '0' && (
                <div className="text-right glass px-4 py-2 rounded-lg">
                  <div className="text-gray-600 text-xs">Your Balance</div>
                  <div className="text-gray-900 font-bold text-lg">{balance} mUSD</div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600 font-medium">Stake Required</div>
                <div className="text-gray-900 font-bold">
                  {selectedTierInfo.stake === '0' ? 'FREE' : `${selectedTierInfo.stake} mUSD`}
                </div>
              </div>
              <div>
                <div className="text-gray-600 font-medium">Service Fee</div>
                <div className="text-gray-900 font-bold">{selectedTierInfo.fee}</div>
              </div>
              <div>
                <div className="text-gray-600 font-medium">Monthly Limit</div>
                <div className="text-gray-900 font-bold">{selectedTierInfo.monthlyLimit}</div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              Operating Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 glass border-2 border-gray-200 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai'].map(city => (
                <option key={city} value={city} className="bg-white">{city}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-2">
              You'll be matched with payments in this location
            </p>
          </div>

          {/* Status */}
          {selectedTier === 'free' ? (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm font-medium">No stake required! Ready to register.</p>
            </div>
          ) : hasSufficientBalance ? (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm font-medium">Sufficient balance! Ready to register.</p>
            </div>
          ) : (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">
                Insufficient balance. Need {selectedTierInfo.stake} mUSD, you have {balance} mUSD
              </p>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={(!hasSufficientBalance && selectedTier !== 'free') || isAlreadyRegistered}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transform hover:scale-105 transition-all shadow-lg"
          >
            {isApproveConfirming || isRegisterConfirming ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : (
              <>Register as Solver</>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

