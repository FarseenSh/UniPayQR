'use client';

import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS, MUSD_ABI } from '@/lib/contracts';
import { formatUnits } from 'viem';

export function useMUSDBalance(address?: string) {
  const { address: connectedAddress } = useAccount();
  const userAddress = address || connectedAddress;

  const { data: balance } = useReadContract({
    address: CONTRACTS.MUSD,
    abi: MUSD_ABI,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: { 
      enabled: !!userAddress, 
      refetchInterval: 3000 
    },
  });

  return { 
    balance: BigInt(balance || 0), 
    formatted: balance ? formatUnits(balance, 18) : '0'
  };
}

