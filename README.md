# Funil Comercial: Wendrill Cassol Advogados

Dashboard em tempo real do funil comercial. Consolida dados de Meta Ads,
WTS/ZapConnecta, Cal.com e ZapSign em um Supabase self-hosted, com
Next.js 14 servindo a interface.

## Arquitetura

```
[Meta Ads]    \
[WTS]          --> [n8n] --> [Supabase] <-- [Next.js dashboard]
[ZapSign]     /
[Cal.com]    /
```

- Banco: Supabase self-hosted no Easypanel.
- ETL: workflows n8n (pasta `n8n/`).
- Frontend: Next.js 14 App Router + Tailwind + Recharts + Supabase Auth.
- Realtime: `postgres_changes` em leads, contratos, reunioes e campanhas.

## Setup local

```bash
npm install
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Para o passo a passo completo de implementacao em producao
(Supabase, n8n, Easypanel, dominio, webhook Meta), veja
[`docs/IMPLEMENTACAO.md`](docs/IMPLEMENTACAO.md).

Aplique as migrations no Supabase (psql ou SQL Editor):

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_initial_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_triggers_and_views.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_rls_policies.sql
psql "$DATABASE_URL" -f supabase/migrations/0004_rpc_functions.sql
psql "$DATABASE_URL" -f supabase/migrations/0005_juridico.sql
psql "$DATABASE_URL" -f supabase/migrations/0006_operacional.sql
```

A migration 0005 adiciona o nucleo juridico: clientes, casos,
honorarios, parcelas, audiencias, prazos e membros (equipe interna).

A migration 0006 adiciona a camada operacional: tags flexiveis com
escopo, notas internas (sobre cliente ou caso), documentos anexados
(metadados; arquivos vivem no Supabase Storage no bucket "documentos")
e a view agenda_completa que une audiencias, prazos e reunioes.

Em seguida, crie usuarios autorizados em Authentication > Users no painel do Supabase.

## Workflows n8n

Importe os JSONs da pasta `n8n/` em ordem:

1. `01-sync-leads-wts.json` (a cada 15 min)
2. `02-sync-meta-ads.json` (a cada hora)
3. `03-sync-zapsign.json` (a cada 30 min)
4. `04-sync-calcom.json` (a cada 30 min)
5. `05-snapshot-diario.json` (00:05 BRT)
6. `06-webhook-meta-leads.json` (em tempo real)
7. `07-webhook-sync-now.json` (botao Sincronizar agora)

Antes de ativar, crie no n8n:

- Credencial Header Auth para ZapSign (`Authorization: Bearer ...`). Substitua `{{ZAPSIGN_AUTH_CRED_ID}}`.
- Credencial Header Auth para Cal.com. Substitua `{{CALCOM_AUTH_CRED_ID}}`.
- Variaveis de ambiente no n8n: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` e `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (para os nos lerem `$env`).
- Substitua `{{SUPABASE_SERVICE_ROLE_KEY}}` em todos os workflows pelo valor real da `SERVICE_ROLE_KEY` do Supabase (ou crie uma var de ambiente no n8n e troque por `={{$env.SUPABASE_SERVICE_ROLE_KEY}}`).

Os workflows usam `https://supabase.zapconnecta.com/rest/v1/...` (PostgREST) em vez de Postgres direto, ja que o n8n e o compose Supabase ficam em redes Docker isoladas no Easypanel. Toda escrita passa pelo Kong do Supabase com `service_role`.

## Deploy no Easypanel

1. Crie um servico do tipo App > Docker (GitHub) apontando para este repo.
2. Branch: `main` (ou conforme a sua estrategia).
3. Build: usa o `Dockerfile` da raiz, output `standalone`.
4. Variaveis de ambiente (ver `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `N8N_SYNC_WEBHOOK_URL` (URL do workflow 07)
   - `N8N_SYNC_WEBHOOK_TOKEN` (opcional)
5. Porta exposta: `3000`.
6. Health check: `GET /api/health`.
7. Dominio: configure `dashboard.wendrillcassol.adv.br` com HTTPS automatico.

## Estrutura do projeto

```
app/
  api/health/        endpoint de saude
  api/sync/          dispara workflow 07 do n8n
  auth/signout/      faz logout do Supabase
  dashboard/         paginas do app (visao geral, campanhas, criativos, leads, contratos, financeiro)
  login/             tela de login
components/
  dashboard/         header, sidebar, KPI card, funil, charts, realtime
  ui/                primitivas estilo shadcn (card, button, table, badge, ...)
lib/
  supabase/          clients server e browser
  constants.ts       cores, labels, BUSINESS_CONSTANTS
  metrics.ts         calculos de KPIs e taxas
  queries.ts         consultas usadas pelas paginas
  types.ts           tipos do dominio
  utils.ts           formatacao BRL, datas, percentuais
n8n/                 workflows importaveis
supabase/migrations  schema, triggers, views, RLS
```

## Convencoes

- Nao usar travessao (`-`) em texto. Usar virgula, dois pontos ou ponto e virgula.
- Datas exibidas no fuso `America/Sao_Paulo`.
- Valores em formato pt-BR (R$ 1.234,56).
- Mobile-first em todas as paginas.

## Constantes de negocio

Veja `lib/constants.ts`:

- `VALOR_CONTRATO_ENTRADA = R$ 399,00`
- `VALOR_POTENCIAL_CASO = R$ 3.000,00`
- `META_TEMPO_RESPOSTA_MIN = 5`
- `META_TAXA_AGENDAMENTO = 50%`
- `META_TAXA_ASSINATURA = 85%`
