import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar, MobileNav } from '@/components/dashboard/sidebar';
import { RealtimeRefresher } from '@/components/dashboard/realtime-refresher';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen bg-brand-surface">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        {children}
      </div>
      <MobileNav />
      <RealtimeRefresher />
    </div>
  );
}
