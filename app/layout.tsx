import type { Metadata } from 'next';
import './globals.css';
import { RuntimeConfigScript } from '@/components/runtime-config-script';

export const dynamic = 'force-dynamic';

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
      <head>
        <RuntimeConfigScript />
      </head>
      <body className="min-h-screen bg-brand-surface antialiased">{children}</body>
    </html>
  );
}
