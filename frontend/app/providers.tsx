'use client';

import { WagmiConfig, createConfig, http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const mezoTestnet = {
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { 
    name: 'Bitcoin', 
    symbol: 'BTC', 
    decimals: 18 
  },
  rpcUrls: {
    default: { 
      http: [process.env.NEXT_PUBLIC_MEZO_RPC_URL || 'https://spectrum-01.simplystaking.xyz/cm5iZ2x3dG0tMDEtOWM1YTZiNjA/XWxVfwIYGwqt_A/mezo/testnet/'],
      webSocket: [process.env.NEXT_PUBLIC_MEZO_WSS_URL || 'wss://spectrum-01.simplystaking.xyz/cm5iZ2x3dG0tMDEtOWM1YTZiNjA/XWxVfwIYGwqt_A/mezo/testnet/']
    },
  },
  blockExplorers: {
    default: { 
      name: 'Mezo Explorer', 
      url: 'https://explorer.test.mezo.org' 
    },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: 'UniPayQR',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'fc68e9a76637417fe678897ad713735b',
  chains: [mezoTestnet],
  transports: {
    [mezoTestnet.id]: http(process.env.NEXT_PUBLIC_MEZO_RPC_URL || 'https://spectrum-01.simplystaking.xyz/cm5iZ2x3dG0tMDEtOWM1YTZiNjA/XWxVfwIYGwqt_A/mezo/testnet/'),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
          <Toaster position="top-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

