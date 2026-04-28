# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev          # Next.js em dev (porta 3000)
npm run build        # build de producao (output: standalone)
npm run start        # roda o build (server.js do standalone)
npm run lint         # eslint via next lint
npm run typecheck    # tsc --noEmit, sem testes configurados
```

Nao existe suite de testes nem framework de testes neste repo. Para validar mudancas, rode `npm run typecheck && npm run lint && npm run build`.

Aplicar migrations no Supabase (rodar em ordem, sao idempotentes):

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_triggers_and_views.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_rls_policies.sql
```

Variaveis de ambiente: copie `.env.example` para `.env.local`. As chaves Supabase sao obrigatorias para qualquer execucao alem de `/api/health`. `N8N_SYNC_WEBHOOK_URL` e necessaria para o botao "Sincronizar agora".

## Arquitetura

Pipeline ETL externo grava no Supabase; o Next.js so le.

```
Meta Ads, WTS/ZapConnecta, ZapSign, Cal.com  -->  n8n (pasta n8n/)  -->  Supabase  <--  Next.js (este repo)
```

O frontend **nunca** chama as APIs externas (Meta, WTS, ZapSign, Cal.com) diretamente. Toda integracao mora em workflows n8n; tokens de terceiros nao precisam estar no env do Next. A unica saida do Next para fora do Supabase e `POST /api/sync`, que dispara o webhook do workflow `07-webhook-sync-now.json`.

### Camadas

- **`app/`** Next.js 14 App Router. Paginas sao Server Components (`export const dynamic = 'force-dynamic'`, `revalidate = 0`) que buscam dados via `lib/queries.ts` no render. URL search params (`from`, `to`, `tipo`) sao a fonte da verdade dos filtros, parseados por `lib/filtros.ts`.
- **`middleware.ts`** Faz `supabase.auth.getUser()` em todo request fora de `/login`, `/api/health`, `/_next`, `/auth/callback`. Sem usuario em `/dashboard/*`, redireciona para `/login?next=...`. Dois clientes Supabase em `lib/supabase/`: `createClient()` (anon, com cookies, para Server Components / Route Handlers autenticados) e `createServiceClient()` (service role, sem cookies, **bypassa RLS** - use so em rotas server-only como `/api/health`).
- **`components/dashboard/realtime-refresher.tsx`** Client Component montado no `app/dashboard/layout.tsx`. Subscreve `postgres_changes` em `leads`, `contratos`, `reunioes`, `campanhas_meta` e chama `router.refresh()` (debounce 3s) quando algo muda. Para isso funcionar, as tabelas precisam estar em `Database > Replication > supabase_realtime` no Supabase.
- **`lib/queries.ts`** Todas as queries do dashboard. Padrao: cada funcao recebe `SupabaseClient` + `PeriodoFiltro` e devolve dados ja agregados. Para inserir filtro de tipo de campanha, use o helper `aplicaTipoFiltro` (a coluna varia: `tipo_campanha` em leads/reunioes, `tipo_contrato` em contratos, `tipo` em campanhas_meta).
- **`lib/metrics.ts`** Calculos puros a partir de `FunilTotais`. Nenhuma chamada de I/O aqui. KPIs (CAC, CPL, ROI) usam `BUSINESS_CONSTANTS` de `lib/constants.ts`.
- **`supabase/migrations/`** Schema, triggers e RLS. Os triggers `classificar_lead()` e `classificar_contrato()` (em `0002`) preenchem automaticamente `tipo_campanha` / `tipo_contrato` por regex no nome da campanha/UTM. Se mudar a regra de classificacao, edite a funcao na migration e rode de novo (sao idempotentes); para reclassificar linhas existentes, faca `UPDATE ... SET updated_at = NOW()` para disparar o `BEFORE UPDATE`.
- **`n8n/`** 7 workflows JSON com placeholders `{{SUPABASE_PG_CRED_ID}}`, `{{WTS_AUTH_CRED_ID}}`, `{{ZAPSIGN_AUTH_CRED_ID}}`, `{{CALCOM_AUTH_CRED_ID}}` que sao substituidos pelos IDs reais das credenciais do n8n no momento do import. Detalhes em `docs/IMPLEMENTACAO.md`.

### Modelo de dados (resumo)

Tabelas core: `leads`, `campanhas_meta`, `reunioes`, `contratos`, `signatarios`, `funil_diario` (snapshot diario), `sync_log` (heartbeat por fonte: `wts`, `meta`, `zapsign`, `calcom`). `/api/health` le `sync_log` para reportar `ultima_sync` por fonte. RLS permite `select` apenas a `authenticated`; o frontend depende dessa autenticacao via cookie do middleware.

`TipoCampanha` em `lib/types.ts`: `APP_MOBILIDADE | SERVIDOR_PUBLICO | NAO_CLASSIFICADO | GENERICO`. Prefixo de criativo: `PP | ABE | SEG | null`.

## Convencoes do projeto

- Idioma: PT-BR em UI, comentarios e nomes de identificadores de dominio (ex: `buscarLeads`, `tipo_campanha`).
- **Nao usar travessao (`-`)** em texto exibido; usar virgula, dois pontos ou ponto e virgula. Aplica a copy de UI, mensagens e tambem a comentarios/strings em SQL e codigo (vide README e migrations existentes).
- Datas formatadas em `America/Sao_Paulo` via `formatInTimeZone` (`lib/utils.ts`). Nunca use `toLocaleString` direto.
- Valores monetarios em BRL via `formatBRL`; percentuais via `formatPercent`. Divisoes que podem zerar passam por `safeDiv`.
- Mobile-first: sempre cheque o layout em viewport pequeno; o `MobileNav` aparece so em mobile.
- Path alias `@/*` aponta para a raiz (`tsconfig.json`).

Constantes de negocio em `lib/constants.ts` (`BUSINESS_CONSTANTS`):

- `VALOR_CONTRATO_ENTRADA = 399.00`
- `VALOR_POTENCIAL_CASO = 3000.00`
- `META_TEMPO_RESPOSTA_MIN = 5`
- `META_TAXA_AGENDAMENTO = 0.50`
- `META_TAXA_ASSINATURA = 0.85`

Mudar esses valores afeta CAC, CPL, ROI, receita potencial em todas as paginas.

## Deploy

Easypanel via Dockerfile multi-stage com `output: standalone`. Porta 3000, healthcheck `GET /api/health`. Tutorial completo em `docs/IMPLEMENTACAO.md` (12 passos: migrations, n8n, dominio, webhook Meta).
