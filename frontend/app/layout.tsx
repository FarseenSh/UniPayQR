import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'UniPayQR - Bitcoin-Backed UPI Payments',
  description: 'Auto-matched UPI payments with real mUSD on Mezo L2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

