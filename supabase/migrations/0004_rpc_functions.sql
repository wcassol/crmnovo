-- =====================================================================
-- Functions RPC chamadas pelo n8n via PostgREST.
-- O n8n nao tem acesso de rede ao Postgres do Supabase (composes
-- isolados no Easypanel), entao toda escrita passa por HTTP em
-- /rest/v1/rpc/<funcao> usando o service_role key.
-- =====================================================================

-- ---------------------------------------------------------------------
-- vincular_reunioes_leads(): casa reunioes orfas a leads pelo telefone
-- normalizado. Usado pelo workflow 04 (Cal.com) apos o upsert.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION vincular_reunioes_leads()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    n INTEGER;
BEGIN
    UPDATE reunioes r
       SET tipo_campanha = l.tipo_campanha,
           lead_id = l.id
      FROM leads l
     WHERE r.lead_id IS NULL
       AND regexp_replace(r.telefone_cliente, '\D', '', 'g')
         = regexp_replace(l.telefone, '\D', '', 'g')
       AND length(regexp_replace(r.telefone_cliente, '\D', '', 'g')) >= 10;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;

-- ---------------------------------------------------------------------
-- snapshot_diario_run(): grava em funil_diario o snapshot do dia
-- anterior. Usado pelo workflow 05 que roda 00:05 BRT.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION snapshot_diario_run()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    n INTEGER;
BEGIN
    WITH ontem AS (
        SELECT (CURRENT_DATE - INTERVAL '1 day')::date AS d
    ),
    agg_leads AS (
        SELECT COALESCE(tipo_campanha, 'NAO_CLASSIFICADO') AS tipo,
               COUNT(*) AS leads,
               COUNT(*) FILTER (WHERE status = 'Concluido') AS atend
          FROM leads, ontem
         WHERE (data_criacao AT TIME ZONE 'America/Sao_Paulo')::date = d
         GROUP BY tipo_campanha
    ),
    agg_reunioes AS (
        SELECT COALESCE(tipo_campanha, 'NAO_CLASSIFICADO') AS tipo,
               COUNT(*) FILTER (WHERE status <> 'cancelada') AS reun
          FROM reunioes, ontem
         WHERE (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = d
         GROUP BY tipo_campanha
    ),
    agg_contratos AS (
        SELECT COALESCE(tipo_contrato, 'GENERICO') AS tipo,
               COUNT(*) AS env,
               COUNT(*) FILTER (WHERE status = 'Assinado') AS ass,
               COALESCE(SUM(valor_entrada) FILTER (WHERE status = 'Assinado'), 0) AS receita
          FROM contratos, ontem
         WHERE (data_criacao AT TIME ZONE 'America/Sao_Paulo')::date = d
         GROUP BY tipo_contrato
    ),
    agg_meta AS (
        SELECT tipo,
               SUM(impressoes) AS imp,
               SUM(alcance) AS alc,
               SUM(resultados) AS conv,
               SUM(gasto) AS gasto
          FROM campanhas_meta
         GROUP BY tipo
    ),
    tipos AS (
        SELECT unnest(ARRAY['APP_MOBILIDADE','SERVIDOR_PUBLICO','NAO_CLASSIFICADO','TOTAL']) AS tipo
    )
    INSERT INTO funil_diario (
        data, tipo_campanha, impressoes, alcance, conversas_meta,
        leads_wts, leads_atendidos, reunioes_agendadas,
        contratos_enviados, contratos_assinados, gasto_meta,
        cpl, cac, receita_entrada, receita_potencial
    )
    SELECT (SELECT d FROM ontem),
           t.tipo,
           COALESCE(m.imp, 0),
           COALESCE(m.alc, 0),
           COALESCE(m.conv, 0),
           COALESCE(l.leads, 0),
           COALESCE(l.atend, 0),
           COALESCE(r.reun, 0),
           COALESCE(c.env, 0),
           COALESCE(c.ass, 0),
           COALESCE(m.gasto, 0),
           CASE WHEN COALESCE(l.leads, 0) > 0
                THEN COALESCE(m.gasto, 0) / l.leads ELSE 0 END,
           CASE WHEN COALESCE(c.ass, 0) > 0
                THEN COALESCE(m.gasto, 0) / c.ass ELSE 0 END,
           COALESCE(c.receita, 0),
           COALESCE(c.ass, 0) * 3000
      FROM tipos t
      LEFT JOIN agg_leads l ON l.tipo = t.tipo
      LEFT JOIN agg_reunioes r ON r.tipo = t.tipo
      LEFT JOIN agg_contratos c ON c.tipo = t.tipo
      LEFT JOIN agg_meta m ON m.tipo = t.tipo
        ON CONFLICT (data, tipo_campanha) DO UPDATE
       SET impressoes = EXCLUDED.impressoes,
           alcance = EXCLUDED.alcance,
           conversas_meta = EXCLUDED.conversas_meta,
           leads_wts = EXCLUDED.leads_wts,
           leads_atendidos = EXCLUDED.leads_atendidos,
           reunioes_agendadas = EXCLUDED.reunioes_agendadas,
           contratos_enviados = EXCLUDED.contratos_enviados,
           contratos_assinados = EXCLUDED.contratos_assinados,
           gasto_meta = EXCLUDED.gasto_meta,
           cpl = EXCLUDED.cpl,
           cac = EXCLUDED.cac,
           receita_entrada = EXCLUDED.receita_entrada,
           receita_potencial = EXCLUDED.receita_potencial;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;

-- ---------------------------------------------------------------------
-- upsert_signatarios_batch(payload jsonb): recebe um array de signers
-- com zapsign_doc_id, faz lookup do contrato e upsert. Usado pelo
-- workflow 03 (ZapSign) porque o INSERT...SELECT com JOIN nao se faz
-- bem via REST puro.
--
-- Formato do payload:
-- [
--   { "zapsign_doc_id": "xxx", "zapsign_signer_token": "yyy",
--     "nome": "...", "email": "...", "telefone": "...",
--     "status": "...", "data_assinatura": "..." },
--   ...
-- ]
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_signatarios_batch(payload JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    n INTEGER;
BEGIN
    INSERT INTO signatarios (
        contrato_id, zapsign_signer_token, nome, email, telefone,
        status, data_assinatura
    )
    SELECT c.id,
           s ->> 'zapsign_signer_token',
           COALESCE(s ->> 'nome', ''),
           COALESCE(s ->> 'email', ''),
           COALESCE(s ->> 'telefone', ''),
           COALESCE(s ->> 'status', 'Nao abriu'),
           NULLIF(s ->> 'data_assinatura', '')::timestamptz
      FROM jsonb_array_elements(payload) s
      JOIN contratos c ON c.zapsign_doc_id = s ->> 'zapsign_doc_id'
     WHERE s ->> 'zapsign_signer_token' IS NOT NULL
        ON CONFLICT (zapsign_signer_token) DO UPDATE
       SET status = EXCLUDED.status,
           data_assinatura = EXCLUDED.data_assinatura;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;

-- ---------------------------------------------------------------------
-- log_sync(p_fonte text, p_count int): grava sucesso em sync_log.
-- Mais simples que POST /rest/v1/sync_log porque embute NOW() no DB.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_sync(p_fonte TEXT, p_count INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO sync_log (fonte, status, registros_processados, finalizado_em)
    VALUES (p_fonte, 'sucesso', p_count, NOW());
END $$;

-- ---------------------------------------------------------------------
-- Permissoes para o role anon do PostgREST poder chamar via RPC.
-- O service_role ja tem por default. Mantemos anon sem acesso de
-- escrita; apenas SECURITY DEFINER faz as functions rodarem como dono.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION vincular_reunioes_leads() FROM PUBLIC;
REVOKE ALL ON FUNCTION snapshot_diario_run() FROM PUBLIC;
REVOKE ALL ON FUNCTION upsert_signatarios_batch(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION log_sync(TEXT, INT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION vincular_reunioes_leads() TO service_role;
GRANT EXECUTE ON FUNCTION snapshot_diario_run() TO service_role;
GRANT EXECUTE ON FUNCTION upsert_signatarios_batch(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION log_sync(TEXT, INT) TO service_role;
