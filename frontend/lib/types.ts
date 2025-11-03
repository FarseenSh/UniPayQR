// Payment Types
export enum PaymentStatus {
  Pending = 0,
  Matched = 1,
  Processing = 2,
  Completed = 3,
  Cancelled = 4,
  Expired = 5,
}

export interface Payment {
  id: string;
  user: string;
  amountMUSD: bigint;
  amountINR: bigint;
  merchantVPA: string;
  location: string;
  createdAt: bigint;
  expiresAt: bigint;
  assignedSolver: string | null;
  status: PaymentStatus;
  upiTxnId: string;
}

export interface PaymentDetail extends Payment {
  platformFee: bigint;
  solverAmount: bigint;
}

// Solver Types
export enum SolverTier {
  Free = 0,      // 0 stake, 10k INR/month limit, 0.5% fee
  Tier1 = 1,    // 100 mUSD stake
  Tier2 = 2,    // 500 mUSD stake
  Tier3 = 3,    // 1000 mUSD stake
  Tier4 = 4     // 10000 mUSD stake, unlimited, 2% fee
}

export interface Solver {
  solverAddress: string;
  stakedAmount: bigint;
  tier: SolverTier;
  totalVolume: bigint;
  successfulPayments: bigint;
  failedPayments: bigint;
  isActive: boolean;
  registeredAt: bigint;
  location: string;
  feePercent: bigint;
  monthlyVolumeLimit: bigint;
  currentMonthVolume: bigint;
  monthStartTimestamp: bigint;
}

export interface SolverScore {
  solver: string;
  score: number;
  successRate: number;
  locationMatch: boolean;
  fee: number;
  volume: number;
}

// Transaction Types
export interface TransactionResult {
  hash: string;
  blockNumber: number;
  status: boolean;
}

// App State Types
export interface ScannedUPI {
  payeeAddress: string;
  payeeName: string;
  amount: string;
}

