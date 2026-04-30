# Tutorial de implementacao: Funil Wendrill Cassol

Guia passo a passo para colocar o dashboard em producao a partir do
clone deste repositorio. Tempo estimado: 90 a 120 minutos se voce ja
tem acesso ao Easypanel, n8n e Supabase. Considere todos os comandos
sem necessidade de mudar pastas; o repositorio assume `pwd` na raiz.

## Sumario

1. [Pre-requisitos](#1-pre-requisitos)
2. [Aplicar as migrations no Supabase](#2-aplicar-as-migrations-no-supabase)
3. [Criar usuarios no Supabase Auth](#3-criar-usuarios-no-supabase-auth)
4. [Coletar todos os tokens das integracoes](#4-coletar-todos-os-tokens-das-integracoes)
5. [Configurar credenciais no n8n](#5-configurar-credenciais-no-n8n)
6. [Importar e ajustar os workflows n8n](#6-importar-e-ajustar-os-workflows-n8n)
7. [Testar cada workflow manualmente](#7-testar-cada-workflow-manualmente)
8. [Deploy do frontend no Easypanel](#8-deploy-do-frontend-no-easypanel)
9. [Configurar dominio e HTTPS](#9-configurar-dominio-e-https)
10. [Configurar webhook Meta Lead Ads](#10-configurar-webhook-meta-lead-ads)
11. [Verificar saude do sistema](#11-verificar-saude-do-sistema)
12. [Solucao de problemas](#12-solucao-de-problemas)

---

## 1. Pre-requisitos

Antes de comecar, garanta acesso a:

- Painel do Easypanel em `72.61.38.174` (usuario com permissao admin).
- Painel do Supabase self-hosted no Easypanel (URL como
  `https://supabase.zapconnecta.com`).
- Painel do n8n (`https://n8n.zapconnecta.com` ou similar).
- Conta Meta Business com permissao na conta de anuncios e Page ID
  `106803178488980`.
- Token de API da WTS/ZapConnecta com permissao de leitura.
- Token de API da ZapSign (perfil admin do escritorio).
- Token Bearer da Cal.com da conta que recebe os agendamentos.
- Repositorio no GitHub com o branch
  `claude/funnel-dashboard-realtime-RTqi5` ja publicado.

Tenha tambem o `psql` instalado localmente (opcional, se preferir
aplicar SQL pelo terminal) ou use o SQL Editor do painel do Supabase.

---

## 2. Aplicar as migrations no Supabase

As migrations estao em `supabase/migrations/` e sao idempotentes; podem
rodar varias vezes.

### Opcao A: pelo SQL Editor do Supabase

1. Abra `https://supabase.zapconnecta.com` e faca login.
2. Va em `SQL Editor` no menu lateral.
3. Clique em `New query`.
4. Cole o conteudo de `supabase/migrations/0001_initial_schema.sql` e
   clique em `Run`.
5. Aguarde mensagem de sucesso, abra outra query e cole
   `supabase/migrations/0002_triggers_and_views.sql`. Rode.
6. Por fim, cole `supabase/migrations/0003_rls_policies.sql` e rode.

### Opcao B: via `psql` (mais rapido)

1. No painel do Supabase, va em `Settings > Database` e copie a
   `Connection string` (URI). Vai parecer:
   `postgresql://postgres:SENHA@db.supabase.zapconnecta.com:5432/postgres`.
2. Exporte como variavel:
   ```bash
   export DATABASE_URL='postgresql://postgres:SENHA@db.supabase.zapconnecta.com:5432/postgres'
   ```
3. Aplique as tres migrations em ordem:
   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/0001_initial_schema.sql
   psql "$DATABASE_URL" -f supabase/migrations/0002_triggers_and_views.sql
   psql "$DATABASE_URL" -f supabase/migrations/0003_rls_policies.sql
   ```

### Validacao

No SQL Editor, rode:

```sql
SELECT count(*) AS tabelas
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'leads','campanhas_meta','reunioes','contratos','signatarios',
    'funil_diario','sync_log'
  );
```

Deve retornar `7`.

E:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('classificar_lead','classificar_contrato');
```

Deve listar as duas funcoes.

### Habilitar Realtime no Supabase

No painel, va em `Database > Replication > supabase_realtime` e
adicione as tabelas: `leads`, `contratos`, `reunioes`, `campanhas_meta`.
Sem isso, o `RealtimeRefresher` do dashboard nao recebe eventos.

---

## 3. Criar usuarios no Supabase Auth

Como o dashboard tem `RLS` permitindo leitura apenas a usuarios
autenticados, voce precisa criar pelo menos um usuario.

1. No painel do Supabase, va em `Authentication > Users`.
2. Clique em `Add user > Create new user`.
3. Preencha email e senha forte. Marque `Auto confirm user` para nao
   precisar de email de verificacao.
4. Clique em `Create user`.
5. Repita para cada pessoa do escritorio que vai acessar o dashboard.

Sugestao: crie um email tipo `dashboard@wendrillcassol.adv.br` para
o uso no dia a dia.

Em `Authentication > Providers`, deixe apenas `Email` ativado e
desmarque `Confirm email` se nao quiser fluxo de confirmacao.

---

## 4. Coletar todos os tokens das integracoes

Anote todos os valores em um gerenciador de senhas; voce vai cola-los
no n8n e nas variaveis de ambiente do Easypanel.

### 4.1 Supabase

No painel, em `Settings > API`:

- `URL` -> `NEXT_PUBLIC_SUPABASE_URL` (algo como
  `https://supabase.zapconnecta.com`).
- `anon public` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `service_role secret` -> `SUPABASE_SERVICE_ROLE_KEY` (cuidado:
  bypassa RLS, nunca exponha no frontend).

Em `Settings > Database`:

- Anote o host, porta, usuario, senha e nome do banco (vai precisar
  para criar a credencial Postgres no n8n).

### 4.2 WTS / ZapConnecta

1. Acesse o painel da WTS.
2. Va em `Configuracoes > API` (ou equivalente).
3. Gere um token Bearer com escopo de leitura em sessions e contacts.
4. Salve como `WTS_API_TOKEN`.

### 4.3 Meta Marketing API

Voce precisa de um token de longa duracao (60 dias) com escopo
`ads_read` na conta de anuncios.

1. Va em `https://developers.facebook.com/tools/explorer/`.
2. Selecione o app vinculado ao escritorio.
3. Em `Permissions`, adicione `ads_read` e `business_management`.
4. Clique em `Generate Access Token`.
5. Copie o token. Para estende-lo para 60 dias, va em
   `https://developers.facebook.com/tools/debug/accesstoken/`,
   cole o token e clique em `Extend Access Token`.
6. Salve o token como `META_ACCESS_TOKEN`.
7. Pegue o ID da conta de anuncios em
   `https://business.facebook.com/settings/ad-accounts`. O formato
   final tem que ser `act_XXXXXXXXX`. Salve como
   `META_AD_ACCOUNT_ID`.

### 4.4 ZapSign

1. No painel ZapSign, va em `Configuracoes > API`.
2. Gere um token e salve como `ZAPSIGN_API_TOKEN`.

### 4.5 Cal.com

1. Acesse `https://app.cal.com/settings/developer/api-keys`.
2. Crie uma chave com escopos `bookings:read` (no minimo).
3. Salve como `CALCOM_BEARER_TOKEN`.

---

## 5. Configurar credenciais no n8n

Os workflows JSON tem placeholders como `{{SUPABASE_PG_CRED_ID}}` que
voce vai substituir depois. Antes, crie cada credencial manualmente
no n8n e anote os IDs.

### 5.1 Credencial Postgres (Supabase)

1. No n8n, va em `Credentials > New > Postgres`.
2. Nome: `Supabase Postgres`.
3. Host: o host do Supabase (`db.supabase.zapconnecta.com` ou similar).
4. Database: `postgres`.
5. User: `postgres`.
6. Password: a senha do banco.
7. Port: `5432`.
8. SSL: `require` (deixe `Reject Unauthorized` desligado se for
   certificado interno).
9. Salve. Copie o `id` da credencial (aparece na URL ao editar:
   `/credentials/<id>`).

### 5.2 Credencial WTS Bearer

1. `New > HTTP Header Auth`.
2. Nome: `WTS Bearer`.
3. Header Name: `Authorization`.
4. Header Value: `Bearer SEU_WTS_API_TOKEN`.
5. Salve. Copie o id.

### 5.3 Credencial ZapSign Bearer

1. `New > HTTP Header Auth`.
2. Nome: `ZapSign Bearer`.
3. Header Name: `Authorization`.
4. Header Value: `Bearer SEU_ZAPSIGN_API_TOKEN`.
5. Salve. Copie o id.

### 5.4 Credencial Cal.com Bearer

1. `New > HTTP Header Auth`.
2. Nome: `Cal.com Bearer`.
3. Header Name: `Authorization`.
4. Header Value: `Bearer SEU_CALCOM_BEARER_TOKEN`.
5. Salve. Copie o id.

### 5.5 Variaveis de ambiente do n8n

No Easypanel, abra o servico do n8n e va em `Environment`. Adicione:

```
META_ACCESS_TOKEN=<seu token>
META_AD_ACCOUNT_ID=act_XXXXXXXXX
```

Salve e reinicie o container do n8n para que `$env.*` funcione nos
workflows.

---

## 6. Importar e ajustar os workflows n8n

Os JSONs estao em `n8n/`. Importe na seguinte ordem:

1. `01-sync-leads-wts.json`
2. `02-sync-meta-ads.json`
3. `03-sync-zapsign.json`
4. `04-sync-calcom.json`
5. `05-snapshot-diario.json`
6. `06-webhook-meta-leads.json`
7. `07-webhook-sync-now.json`

### Procedimento por workflow

1. No n8n, clique em `+` no canto superior direito e escolha
   `Import from File`.
2. Selecione o JSON.
3. Apos importar, abra o workflow. O n8n vai mostrar erros de
   credenciais nao mapeadas.
4. Em cada node Postgres, selecione `Supabase Postgres` na credencial.
5. Em cada node HTTP Request com auth header, selecione a credencial
   correspondente (`WTS Bearer`, `ZapSign Bearer`, `Cal.com Bearer`).
6. No workflow `02-sync-meta-ads.json`, garanta que as variaveis
   `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` ja estao no env do n8n
   (ver passo 5.5).
7. Salve e clique em `Active` para habilitar o schedule.

### Substituir placeholders manualmente (opcional)

Se preferir editar os JSONs antes do import, substitua:

- `{{SUPABASE_PG_CRED_ID}}` pelo id da credencial Postgres.
- `{{WTS_AUTH_CRED_ID}}` pelo id da credencial WTS.
- `{{ZAPSIGN_AUTH_CRED_ID}}` pelo id da credencial ZapSign.
- `{{CALCOM_AUTH_CRED_ID}}` pelo id da credencial Cal.com.

```bash
sed -i 's/{{SUPABASE_PG_CRED_ID}}/abc123/g' n8n/*.json
sed -i 's/{{WTS_AUTH_CRED_ID}}/def456/g' n8n/01-sync-leads-wts.json
sed -i 's/{{ZAPSIGN_AUTH_CRED_ID}}/ghi789/g' n8n/03-sync-zapsign.json
sed -i 's/{{CALCOM_AUTH_CRED_ID}}/jkl012/g' n8n/04-sync-calcom.json
```

### Anotar a URL do webhook de sync

Apos importar `07-webhook-sync-now.json`, abra o node `Webhook
/sync-now`. O n8n mostra a URL final, algo como:

```
https://zapconnecta-n8n-webhook.2ym3x9.easypanel.host/webhook/sync-now
```

Salve esse valor; ele vai virar `N8N_SYNC_WEBHOOK_URL` no Easypanel.

---

## 7. Testar cada workflow manualmente

Antes de ativar tudo no schedule, faca uma execucao manual e confira
se os dados aparecem no Supabase.

1. Em cada workflow, clique em `Execute Workflow` (botao no canto
   inferior).
2. Aguarde o status verde em todos os nodes.
3. No Supabase, abra o `Table Editor` e confira:
   - Apos `Sync Leads WTS`: tabela `leads` com linhas, e
     `tipo_campanha` ja preenchido pelo trigger.
   - Apos `Sync Meta Ads`: tabela `campanhas_meta` com gasto e
     resultados.
   - Apos `Sync Contratos ZapSign`: tabelas `contratos` e
     `signatarios`.
   - Apos `Sync Reunioes Cal.com`: tabela `reunioes`.
4. Se algum node falhar, abra `Executions` no n8n e veja o erro
   detalhado. Os erros mais comuns sao:
   - 401: token errado ou expirado.
   - SSL: ajuste a flag `Reject Unauthorized` na credencial Postgres.
   - Coluna nao existe: confira se as migrations rodaram completas.

Se tudo passar, marque os workflows como `Active`. O schedule comeca a
rodar automaticamente.

---

## 8. Deploy do frontend no Easypanel

### 8.1 Garantir o branch publicado no GitHub

Voce precisa que o branch tenha codigo:

```bash
git push -u origin claude/funnel-dashboard-realtime-RTqi5
```

Se preferir mergear em `main`, faca isso depois de validar.

### 8.2 Criar servico no Easypanel

1. No Easypanel, clique em `+ Service > App`.
2. Nome: `wcassol-funil-dashboard`.
3. Source: `GitHub`.
4. Conecte sua conta do GitHub se ainda nao conectou (botao
   `Connect GitHub`).
5. Repositorio: `wcassol/crmnovo`.
6. Branch: `claude/funnel-dashboard-realtime-RTqi5` (ou `main` se
   tiver mergeado).
7. Build:
   - Method: `Dockerfile`.
   - Dockerfile path: `Dockerfile` (raiz).
8. Deploy:
   - Port: `3000`.
   - Health check path: `/api/health`.

### 8.3 Variaveis de ambiente

Em `Environment`, adicione (use os valores coletados no passo 4):

```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.zapconnecta.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
N8N_SYNC_WEBHOOK_URL=https://zapconnecta-n8n-webhook.2ym3x9.easypanel.host/webhook/sync-now
N8N_SYNC_WEBHOOK_TOKEN=
TZ=America/Sao_Paulo
NODE_ENV=production
```

Variaveis dos tokens externos (`WTS_API_TOKEN`, `META_ACCESS_TOKEN`
etc.) nao precisam estar no frontend, pois o frontend nunca chama
essas APIs diretamente; quem fala com elas e o n8n.

### 8.3.1 IMPORTANTE: Build Args do Docker

As variaveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
sao embutidas no bundle JavaScript que roda no navegador, em build time.
Variaveis configuradas apenas em `Environment` so existem no runtime do
servidor; o cliente browser nao enxerga, e o login fica preso em
`Entrando...` indefinidamente.

No Easypanel, va em `Build > Build Args` (ou `Advanced > Build Args`,
depende da versao) e adicione exatamente os mesmos valores:

```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.zapconnecta.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Se o servico ja foi criado sem isso, edite os Build Args, salve e
clique em `Rebuild` (nao apenas `Redeploy`, que reaproveita a imagem).
Para confirmar, abra o navegador, F12 > Network, tente logar e veja
se o request sai para `https://supabase.zapconnecta.com/auth/v1/token`.
Se sair para `undefined/auth/v1/...` ou para a propria URL do dashboard,
os Build Args nao foram aplicados.

### 8.4 Build e deploy

1. Clique em `Save` e depois `Deploy`.
2. Acompanhe o build em `Logs`. O Dockerfile usa multi-stage com
   `output: standalone`, build leva de 2 a 4 minutos.
3. Quando o status virar `Running`, abra a URL temporaria que o
   Easypanel oferece (algo como
   `https://wcassol-funil-dashboard.<hash>.easypanel.host`).
4. Voce deve ver a tela de login.

---

## 9. Configurar dominio e HTTPS

1. No DNS do dominio (Cloudflare, Registro.br, etc.), crie um registro
   `A` apontando `dashboard.wendrillcassol.adv.br` para o IP
   `72.61.38.174`. Se usar Cloudflare, deixe em modo `DNS only`
   (cinza), sem proxy, na primeira hora; o Let's Encrypt precisa do
   acesso direto.
2. No Easypanel, abra o servico `wcassol-funil-dashboard` e va em
   `Domains`.
3. Adicione `dashboard.wendrillcassol.adv.br`.
4. Marque `HTTPS` para gerar certificado Let's Encrypt automatico.
5. Aguarde 1 a 2 minutos. O Easypanel emite o certificado e ja redireciona.
6. Depois que o HTTPS estiver verde, voce pode reativar o proxy do
   Cloudflare se quiser.

Acesse `https://dashboard.wendrillcassol.adv.br` e faca login com o
usuario criado no passo 3.

---

## 10. Configurar webhook Meta Lead Ads

Esta etapa so e necessaria se voce capta leads via formulario nativo
do Meta (Lead Ads). Se todo o trafego cai direto no WhatsApp via WTS,
pule este passo.

1. URL do webhook: pegue do node `Webhook /meta-leads` no n8n. Vai ser
   algo como
   `https://zapconnecta-n8n-webhook.2ym3x9.easypanel.host/webhook/meta-leads`.
2. Va em `https://developers.facebook.com/apps/<APP_ID>/webhooks/`.
3. Clique em `Add Subscription > Page`.
4. Cole a URL do webhook e um `Verify Token` (defina um valor proprio,
   ex: `wcassol-2026`).
5. Adicione o `Verify Token` como variavel no n8n se quiser validar
   handshake. Por padrao, o nosso webhook responde 200 imediatamente.
6. Em `Subscription Fields`, marque `leadgen`.
7. Salve.
8. Em `https://business.facebook.com/`, vincule a Page
   `106803178488980` ao app.
9. Teste enviando um lead de teste pelo
   `https://developers.facebook.com/tools/lead-ads-testing/`.
10. Confira se aparece em `leads` no Supabase com `wts_session_id`
    comecando com `meta-`.

---

## 11. Verificar saude do sistema

### 11.1 Endpoint de health

```bash
curl https://dashboard.wendrillcassol.adv.br/api/health | jq
```

Resposta esperada:

```json
{
  "status": "ok",
  "supabase": { "status": "ok", "error": null },
  "ultima_sync": {
    "wts": "2026-04-28T12:00:00Z",
    "meta": "2026-04-28T11:00:00Z",
    "zapsign": "2026-04-28T11:30:00Z",
    "calcom": "2026-04-28T11:30:00Z"
  },
  "latency_ms": 87,
  "timestamp": "2026-04-28T12:05:11Z"
}
```

Se algum `ultima_sync` estiver `null`, o workflow correspondente ainda
nao rodou. Aguarde o proximo schedule ou clique em `Sincronizar agora`
no header do dashboard.

### 11.2 Botao "Sincronizar agora"

1. No dashboard, clique em `Sincronizar agora` no header.
2. A mensagem `Sincronizacao disparada.` deve aparecer ao lado do
   botao.
3. No n8n, va em `Executions` e veja os 4 workflows rodando em
   paralelo.

### 11.3 Realtime

1. Abra o dashboard em duas abas.
2. No Supabase, va em `Table Editor > leads` e adicione uma linha
   manual qualquer.
3. As duas abas devem atualizar sozinhas em ate 3 segundos.

Se nao atualizar, confira se voce ativou Realtime nas tabelas no
passo 2.

---

## 12. Solucao de problemas

### Build no Easypanel falha com `Module not found`

Verifique se o `package-lock.json` foi commitado. Se nao foi:

```bash
git add package-lock.json
git commit -m "chore: include package-lock"
git push
```

### Login retorna `Invalid login credentials`

Cheque se o usuario realmente foi criado em `Authentication > Users`
e se voce marcou `Auto confirm user` (sem isso, o login fica bloqueado
ate o email de confirmacao ser clicado, o que nao vai chegar se SMTP
nao estiver configurado no Supabase).

### Login fica preso em `Entrando...` e nao acontece nada

Sintoma: o botao vira `Entrando...` e nunca volta, sem mensagem de erro.

Causa quase certa: as variaveis `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY` nao foram passadas como Build Args do
Docker, entao foram embutidas como `undefined` no bundle do navegador.

Como confirmar:

1. Abra o site, F12 > `Console`. Voce deve ver um `Error: Configuracao
   do Supabase ausente no bundle do cliente`.
2. Ou em `Network`, ao clicar `Entrar`, o request vai para uma URL
   estranha (`undefined/auth/v1/token` ou para a propria URL do
   dashboard) em vez de `https://supabase.zapconnecta.com/...`.

Como corrigir:

1. No Easypanel, abra o servico `wcassol-funil-dashboard`.
2. Va em `Build > Build Args` (algumas versoes chamam de `Build
   Variables` ou ficam em `Advanced`).
3. Adicione, com os mesmos valores que estao em `Environment`:
   - `NEXT_PUBLIC_SUPABASE_URL=https://supabase.zapconnecta.com`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`
4. Salve e clique em `Rebuild` (nao `Redeploy`, que reaproveita a
   imagem antiga).
5. Aguarde o build terminar e teste o login outra vez.

### `RealtimeRefresher` nao atualiza nada

- Verifique se as tabelas estao em `Database > Replication >
  supabase_realtime`.
- Verifique se a `anon key` consegue ler as tabelas (RLS permite
  `select` apenas para `authenticated`, e a sessao do navegador esta
  autenticada por padrao apos login).
- Abra o DevTools do navegador, aba `Network > WS`, e veja se ha
  uma conexao WebSocket aberta com o Supabase.

### Workflow Postgres falha com `permission denied for table`

A credencial Postgres do n8n esta usando o usuario `postgres`. Se voce
trocou para um usuario com menos privilegios, garanta que ele tem
`INSERT, UPDATE, SELECT` em todas as tabelas e `USAGE` no schema
`public`.

### CPL e CAC ficam zerados

Os calculos dependem de `gasto` na tabela `campanhas_meta`. Confira:

- O `META_AD_ACCOUNT_ID` esta no formato `act_XXXXXXXXX`.
- O token Meta tem permissao `ads_read`.
- O nome das campanhas contem `Uber/99/InDrive/Mobilidade` (mapeia
  para `APP_MOBILIDADE`) ou `NAV/SERV/PUB` (mapeia para
  `SERVIDOR_PUBLICO`). Caso contrario, ficam em `NAO_CLASSIFICADO`.

### Lead chega sem `tipo_campanha`

O trigger `classificar_lead()` nao encontrou nenhuma das regras. Se
quiser ajustar:

1. Abra `supabase/migrations/0002_triggers_and_views.sql`.
2. Edite a funcao `classificar_lead()`.
3. Rode a migration de novo no SQL Editor (ela e idempotente).

Para reclassificar leads ja existentes, rode no SQL Editor:

```sql
UPDATE leads SET updated_at = NOW();
```

O trigger `BEFORE UPDATE` reaplica as regras a cada linha.

### Botao "Sincronizar agora" retorna 502

Verifique se `N8N_SYNC_WEBHOOK_URL` aponta para a URL real do node
webhook em `07-webhook-sync-now.json` e se o workflow esta `Active`.
n8n nao processa webhooks de workflows desativados.

### Domino HTTPS nao gera certificado

- Confira se o DNS resolveu para o IP correto: `dig
  dashboard.wendrillcassol.adv.br`.
- Se estiver usando Cloudflare com proxy ativo, desative o proxy
  temporariamente (modo `DNS only`).
- Apos o certificado ser emitido, voce pode reativar o proxy.

---

Ao final destes 12 passos, o dashboard esta operando em producao,
sincronizando automaticamente a cada 15 a 30 minutos, exibindo dados
em tempo real via Supabase Realtime e protegido por autenticacao por
e-mail e senha.
