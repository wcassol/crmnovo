'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function RealtimeRefresher() {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const debouncedRefresh = () => {
      const now = Date.now();
      if (now - lastRefresh.current < 3000) return;
      lastRefresh.current = now;
      router.refresh();
    };

    const channel = supabase
      .channel('funil-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        debouncedRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contratos' },
        debouncedRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reunioes' },
        debouncedRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campanhas_meta' },
        debouncedRefresh,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
