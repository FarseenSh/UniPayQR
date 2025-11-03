import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 Starting AI Matching Service');
console.log('Network: Mezo Testnet (31611)');
console.log('RPC: Spectrum Nodes (Custom)');

const PAYMENT_FACTORY_ABI = [
  {
    type: 'event',
    name: 'PaymentCreated',
    inputs: [
      { name: 'paymentId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amountMUSD', type: 'uint256', indexed: false },
      { name: 'amountINR', type: 'uint256', indexed: false },
      { name: 'location', type: 'string', indexed: false },
      { name: 'expiresAt', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'function',
    name: 'assignSolver',
    inputs: [
      { name: '_paymentId', type: 'bytes32' },
      { name: '_solver', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getPayment',
    inputs: [{ name: '_paymentId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'amountMUSD', type: 'uint256' },
          { name: 'amountINR', type: 'uint256' },
          { name: 'merchantVPA', type: 'string' },
          { name: 'location', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'assignedSolver', type: 'address' },
          { name: 'status', type: 'uint8' },
          { name: 'upiTxnId', type: 'string' }
        ]
      }
    ],
    stateMutability: 'view'
  },
] as const;

const SOLVER_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'getActiveSolvers',
    inputs: [],
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getSolver',
    inputs: [{ name: '_solver', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'solverAddress', type: 'address' },
          { name: 'stakedAmount', type: 'uint256' },
          { name: 'tier', type: 'uint8' },
          { name: 'totalVolume', type: 'uint256' },
          { name: 'successfulPayments', type: 'uint256' },
          { name: 'failedPayments', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'location', type: 'string' },
          { name: 'feePercent', type: 'uint256' },
          { name: 'monthlyVolumeLimit', type: 'uint256' },
          { name: 'currentMonthVolume', type: 'uint256' },
          { name: 'monthStartTimestamp', type: 'uint256' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'isActiveSolver',
    inputs: [{ name: '_solver', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'checkMonthlyLimit',
    inputs: [
      { name: '_solver', type: 'address' },
      { name: '_amountINR', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  }
] as const;

const provider = new ethers.JsonRpcProvider(
  process.env.MEZO_RPC_URL || 'https://spectrum-01.simplystaking.xyz/cm5iZ2x3dG0tMDEtOWM1YTZiNjA/XWxVfwIYGwqt_A/mezo/testnet/'
);

provider.getNetwork().then((network) => {
  if (network.chainId === BigInt(31611)) {
    console.log('✅ Connected to Mezo Testnet via Spectrum');
  } else {
    console.error(`❌ Wrong chain: ${network.chainId}`);
  }
}).catch(console.error);

const wallet = new ethers.Wallet(
  process.env.MATCHING_SERVICE_PRIVATE_KEY!,
  provider
);

const paymentContract = new ethers.Contract(
  process.env.PAYMENT_FACTORY_ADDRESS!,
  PAYMENT_FACTORY_ABI,
  wallet
);

const solverRegistry = new ethers.Contract(
  process.env.SOLVER_REGISTRY_ADDRESS!,
  SOLVER_REGISTRY_ABI,
  wallet
);

class AIMatchingService {
  private calculateScore(solver: any, payment: any): number {
    let score = 0;

    // Success Rate (40%)
    const total = Number(solver.successfulPayments) + Number(solver.failedPayments);
    const successRate = total > 0
      ? (Number(solver.successfulPayments) / total) * 100
      : 70;
    
    score += successRate * 0.4;

    // Location Match (25%)
    const sameCity = solver.location.trim().toLowerCase() === payment.location.trim().toLowerCase();
    score += sameCity ? 25 : 5;

    // Fee Competitiveness (20%)
    const feePercent = Number(solver.feePercent) / 100;
    const feeScore = Math.max(0, 100 - feePercent * 10);
    score += feeScore * 0.2;

    // Volume History (15%)
    const volumePercentile = Math.min(100, (Number(solver.totalVolume) / 1000000) * 100);
    score += volumePercentile * 0.15;

    return score;
  }

  async matchPaymentToSolver(paymentId: string): Promise<string | null> {
    try {
      console.log(`📍 Matching: ${paymentId.slice(0, 10)}...`);

      // Get payment and validate
      const payment = await paymentContract.getPayment(paymentId);
      const now = Math.floor(Date.now() / 1000);
      
      console.log(`💡 Payment details:`, {
        user: payment.user,
        status: Number(payment.status),
        assignedSolver: payment.assignedSolver,
        expiresAt: Number(payment.expiresAt)
      });

      // Check payment expiry BEFORE proceeding
      if (Number(payment.expiresAt) <= now + 120) {
        console.warn('⚠️ Payment expires in < 2 min, skipping');
        return null;
      }

      // Check payment status is PENDING (0) AND no solver assigned
      if (Number(payment.status) !== 0) {
        console.warn(`⚠️ Payment status ${Number(payment.status)}, skipping`);
        return null;
      }
      
      if (payment.assignedSolver !== '0x0000000000000000000000000000000000000000') {
        console.warn(`⚠️ Payment already has solver ${payment.assignedSolver.slice(0, 6)}..., skipping`);
        return null;
      }

      const activeSolvers = await solverRegistry.getActiveSolvers();

      if (activeSolvers.length === 0) {
        console.warn('⚠️ No active solvers');
        return null;
      }

      // Score all solvers
      const scored = await Promise.all(
        activeSolvers.map(async (solverAddress: string) => {
          const solver = await solverRegistry.getSolver(solverAddress);
          
          // Check monthly limit before scoring
          const withinLimit = await solverRegistry.checkMonthlyLimit(solverAddress, payment.amountINR);
          if (!withinLimit) {
            console.log(`⚠️ Solver ${solverAddress.slice(0, 6)}... exceeded monthly limit, skipping`);
            return { solverAddress, score: -1 }; // Negative score = excluded
          }
          
          const score = this.calculateScore(solver, payment);
          return { solverAddress, score };
        })
      );

      // Filter out excluded solvers and sort
      const validSolvers = scored.filter(s => s.score >= 0);
      
      if (validSolvers.length === 0) {
        console.warn('⚠️ No solvers available within monthly limits');
        return null;
      }

      validSolvers.sort((a, b) => b.score - a.score);
      const bestSolver = validSolvers[0];

      console.log(`✅ Best solver: ${bestSolver.solverAddress} (score: ${bestSolver.score.toFixed(2)})`);

      // Add retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          const tx = await paymentContract.assignSolver(paymentId, bestSolver.solverAddress);
          const receipt = await tx.wait();
          console.log(`✅ Block: ${receipt?.blockNumber}`);
          return bestSolver.solverAddress;
        } catch (error: any) {
          retries--;
          if (retries > 0) {
            console.warn(`⚠️ Retry ${4 - retries}/3...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }

      return null;

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      return null;
    }
  }

  async startWatching(): Promise<void> {
    console.log('🔄 Listening for payments...\n');
    
    paymentContract.on('PaymentCreated', async (paymentId: string) => {
      console.log(`\n🆕 NEW PAYMENT: ${paymentId.slice(0, 10)}...`);
      await this.matchPaymentToSolver(paymentId);
    });
  }
}

const service = new AIMatchingService();
service.startWatching().catch(console.error);

console.log('✅ Matching service ready!\n');

