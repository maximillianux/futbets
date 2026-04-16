import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

export const metadata: Metadata = {
  title: 'futbets — Today\'s Football Odds',
  description: 'Live football odds for today\'s matches across the top European leagues. 1X2 and Over/Under markets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0a0b14]">{children}</body>
    </html>
  );
}
