export const CONTRACTS = {
  MUSD: (process.env.NEXT_PUBLIC_MUSD_ADDRESS || 
    '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503') as `0x${string}`, // Official mUSD address
  PAYMENT_FACTORY: (process.env.NEXT_PUBLIC_PAYMENT_FACTORY_ADDRESS || 
    '0x48956982ec190A688585fcB2A123f160C6226CA2') as `0x${string}`,
  SOLVER_REGISTRY: (process.env.NEXT_PUBLIC_SOLVER_REGISTRY_ADDRESS || 
    '0xf6E9364090bccB6e7dB82beFe7413005510D3ca3') as `0x${string}`,
};

export const MUSD_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const PAYMENT_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: '_amountMUSD', type: 'uint256' },
      { internalType: 'uint256', name: '_amountINR', type: 'uint256' },
      { internalType: 'string', name: '_merchantVPA', type: 'string' },
      { internalType: 'string', name: '_location', type: 'string' },
    ],
    name: 'createPayment',
    outputs: [{ internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_paymentId', type: 'bytes32' }],
    name: 'getPayment',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'amountMUSD', type: 'uint256' },
          { internalType: 'uint256', name: 'amountINR', type: 'uint256' },
          { internalType: 'string', name: 'merchantVPA', type: 'string' },
          { internalType: 'string', name: 'location', type: 'string' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
          { internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
          { internalType: 'address', name: 'assignedSolver', type: 'address' },
          { internalType: 'uint8', name: 'status', type: 'uint8' },
          { internalType: 'string', name: 'upiTxnId', type: 'string' },
        ],
        internalType: 'struct MUSDPaymentFactory.Payment',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserPayments',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_solver', type: 'address' }],
    name: 'getSolverPayments',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_paymentId', type: 'bytes32' }],
    name: 'cancelPayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_paymentId', type: 'bytes32' },
      { internalType: 'string', name: '_upiTxnId', type: 'string' },
    ],
    name: 'submitPaymentProof',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: '_paymentId', type: 'bytes32' },
      { internalType: 'string', name: '_upiTxnId', type: 'string' },
    ],
    name: 'submitProof',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_paymentId', type: 'bytes32' }],
    name: 'completePayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '_paymentId', type: 'bytes32' }],
    name: 'isExpired',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'paymentId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountMUSD', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amountINR', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'location', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'expiresAt', type: 'uint256' },
    ],
    name: 'PaymentCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'paymentId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'solver', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'SolverMatched',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'paymentId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'solver', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'solverAmount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'platformFee', type: 'uint256' },
    ],
    name: 'PaymentCompleted',
    type: 'event',
  },
] as const;

export const SOLVER_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: '_stakeAmount', type: 'uint256' },
      { internalType: 'string', name: '_location', type: 'string' },
      { internalType: 'uint256', name: '_feePercent', type: 'uint256' },
    ],
    name: 'registerSolver',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_solver', type: 'address' }],
    name: 'getSolver',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'solverAddress', type: 'address' },
          { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
          { internalType: 'uint8', name: 'tier', type: 'uint8' },
          { internalType: 'uint256', name: 'totalVolume', type: 'uint256' },
          { internalType: 'uint256', name: 'successfulPayments', type: 'uint256' },
          { internalType: 'uint256', name: 'failedPayments', type: 'uint256' },
          { internalType: 'bool', name: 'isActive', type: 'bool' },
          { internalType: 'uint256', name: 'registeredAt', type: 'uint256' },
          { internalType: 'string', name: 'location', type: 'string' },
          { internalType: 'uint256', name: 'feePercent', type: 'uint256' },
          { internalType: 'uint256', name: 'monthlyVolumeLimit', type: 'uint256' },
          { internalType: 'uint256', name: 'currentMonthVolume', type: 'uint256' },
          { internalType: 'uint256', name: 'monthStartTimestamp', type: 'uint256' },
        ],
        internalType: 'struct SolverRegistry.Solver',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getActiveSolvers',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_solver', type: 'address' }],
    name: 'isActiveSolver',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_solver', type: 'address' }],
    name: 'getSuccessRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'addStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_solver', type: 'address' },
      { internalType: 'uint256', name: '_amountINR', type: 'uint256' },
    ],
    name: 'checkMonthlyLimit',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_solver', type: 'address' },
      { internalType: 'uint256', name: '_amountINR', type: 'uint256' },
    ],
    name: 'updateMonthlyVolume',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '_location', type: 'string' }],
    name: 'getSolversInLocation',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

