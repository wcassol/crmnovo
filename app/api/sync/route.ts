import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'nao autenticado' }, { status: 401 });
  }

  const url = process.env.N8N_SYNC_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json(
      { error: 'N8N_SYNC_WEBHOOK_URL nao configurado' },
      { status: 500 },
    );
  }

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_SYNC_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.N8N_SYNC_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        triggered_by: user.email ?? user.id,
        triggered_at: new Date().toISOString(),
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json(
        { error: `n8n retornou ${resp.status}: ${txt}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
