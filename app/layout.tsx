import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Funil Wendrill Cassol Advogados',
  description:
    'Dashboard em tempo real do funil comercial: Meta Ads, WTS, Cal.com e ZapSign.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-brand-surface antialiased">{children}</body>
    </html>
  );
}
