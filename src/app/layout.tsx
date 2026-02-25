import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Double Cup Live Dashboard',
  description: 'Coffee shop simulation dashboard with live auto-updating metrics.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
