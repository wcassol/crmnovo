import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const inicio = Date.now();
  let supabaseStatus: 'ok' | 'erro' = 'erro';
  let ultimaSync: Record<string, string | null> = {};
  let erroSupabase: string | null = null;

  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error('Variaveis Supabase nao configuradas');
    }
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('sync_log')
      .select('fonte, finalizado_em, status')
      .order('finalizado_em', { ascending: false })
      .limit(50);
    if (error) throw error;
    supabaseStatus = 'ok';
    for (const row of data ?? []) {
      if (!ultimaSync[row.fonte] && row.status === 'sucesso') {
        ultimaSync[row.fonte] = row.finalizado_em;
      }
    }
  } catch (err) {
    erroSupabase = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(
    {
      status: supabaseStatus === 'ok' ? 'ok' : 'degraded',
      supabase: { status: supabaseStatus, error: erroSupabase },
      ultima_sync: {
        wts: ultimaSync.wts ?? null,
        meta: ultimaSync.meta ?? null,
        zapsign: ultimaSync.zapsign ?? null,
        calcom: ultimaSync.calcom ?? null,
      },
      latency_ms: Date.now() - inicio,
      timestamp: new Date().toISOString(),
    },
    { status: supabaseStatus === 'ok' ? 200 : 503 },
  );
}
