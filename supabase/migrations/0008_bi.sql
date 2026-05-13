-- =====================================================================
-- Sprint 4: BI juridico
-- Views analiticas para o painel de BI: taxa de exito por tipo de
-- acao, tempo medio de tramitacao, produtividade por advogado, LTV
-- por cliente e forecast de receita ponderado por probabilidade.
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- VIEW: bi_taxa_exito_por_tipo
-- Para cada tipo de acao com pelo menos 1 caso encerrado, calcula a
-- taxa de exito (ganhos / encerrados) e o valor medio recuperado.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW bi_taxa_exito_por_tipo AS
SELECT COALESCE(NULLIF(c.tipo_acao, ''), 'Nao informado') AS tipo_acao,
       count(*) AS total_casos,
       count(*) FILTER (WHERE c.status IN ('ganho','perdido','arquivado','acordo')) AS encerrados,
       count(*) FILTER (WHERE c.status IN ('ganho','acordo')) AS ganhos,
       count(*) FILTER (WHERE c.status = 'perdido') AS perdidos,
       count(*) FILTER (WHERE c.status = 'ativo') AS em_andamento,
       CASE
         WHEN count(*) FILTER (WHERE c.status IN ('ganho','perdido','arquivado','acordo')) > 0
         THEN round(
           count(*) FILTER (WHERE c.status IN ('ganho','acordo'))::numeric
           / count(*) FILTER (WHERE c.status IN ('ganho','perdido','arquivado','acordo'))::numeric,
           4)
         ELSE NULL
       END AS taxa_exito,
       avg(c.valor_provavel_exito) FILTER (WHERE c.status IN ('ganho','acordo'))
         AS valor_medio_exito,
       sum(c.valor_provavel_exito) FILTER (WHERE c.status IN ('ganho','acordo'))
         AS valor_total_exito
  FROM casos c
 GROUP BY tipo_acao
 ORDER BY total_casos DESC;

-- ---------------------------------------------------------------------
-- VIEW: bi_tempo_tramitacao
-- Para cada caso encerrado, calcula dias entre distribuicao e
-- transito em julgado. Retorna media por tipo de acao.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW bi_tempo_tramitacao AS
SELECT COALESCE(NULLIF(tipo_acao, ''), 'Nao informado') AS tipo_acao,
       count(*) AS qtd_casos,
       round(avg(data_transito - data_distribuicao)) AS dias_medio,
       min(data_transito - data_distribuicao) AS dias_minimo,
       max(data_transito - data_distribuicao) AS dias_maximo,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY data_transito - data_distribuicao))
         AS dias_mediana
  FROM casos
 WHERE data_distribuicao IS NOT NULL
   AND data_transito IS NOT NULL
   AND status IN ('ganho','perdido','arquivado','acordo')
 GROUP BY tipo_acao
HAVING count(*) >= 1
 ORDER BY dias_medio;

-- ---------------------------------------------------------------------
-- VIEW: bi_produtividade_membro
-- Casos por responsavel: ativos, encerrados, taxa de exito,
-- valor recuperado, audiencias proximas, prazos vencendo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW bi_produtividade_membro AS
SELECT m.id AS membro_id,
       m.nome,
       m.oab,
       m.cargo,
       count(c.id) AS casos_total,
       count(c.id) FILTER (WHERE c.status = 'ativo') AS casos_ativos,
       count(c.id) FILTER (WHERE c.status IN ('ganho','acordo')) AS casos_ganhos,
       count(c.id) FILTER (WHERE c.status = 'perdido') AS casos_perdidos,
       CASE
         WHEN count(c.id) FILTER (WHERE c.status IN ('ganho','perdido','acordo')) > 0
         THEN round(
           count(c.id) FILTER (WHERE c.status IN ('ganho','acordo'))::numeric
           / count(c.id) FILTER (WHERE c.status IN ('ganho','perdido','acordo'))::numeric,
           4)
         ELSE NULL
       END AS taxa_exito,
       COALESCE(sum(c.valor_provavel_exito) FILTER (WHERE c.status IN ('ganho','acordo')), 0)
         AS valor_recuperado,
       (SELECT count(*) FROM audiencias a
         WHERE a.membro_responsavel_id = m.id
           AND a.status = 'agendada'
           AND a.data_hora BETWEEN NOW() AND NOW() + INTERVAL '30 days')
         AS audiencias_proximas_30d,
       (SELECT count(*) FROM prazos p
         WHERE p.membro_responsavel_id = m.id
           AND p.concluido_em IS NULL
           AND p.data_fatal <= CURRENT_DATE + INTERVAL '7 days')
         AS prazos_proximos_7d
  FROM membros m
  LEFT JOIN casos c ON c.membro_responsavel_id = m.id
 WHERE m.ativo
 GROUP BY m.id, m.nome, m.oab, m.cargo
 ORDER BY casos_ativos DESC NULLS LAST;

-- ---------------------------------------------------------------------
-- VIEW: bi_ltv_cliente
-- LTV (Lifetime Value) por cliente: total de honorarios fechados,
-- pagos, contratos e casos.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW bi_ltv_cliente AS
SELECT cli.id AS cliente_id,
       cli.nome,
       cli.telefone,
       count(DISTINCT c.id) AS qtd_casos,
       count(DISTINCT c.id) FILTER (WHERE c.status IN ('ganho','acordo')) AS casos_ganhos,
       COALESCE(sum(h.valor_total), 0) AS honorarios_contratados,
       COALESCE((
         SELECT sum(p.valor)
           FROM parcelas p
           JOIN honorarios h2 ON h2.id = p.honorario_id
           JOIN casos c2 ON c2.id = h2.caso_id
          WHERE c2.cliente_id = cli.id
            AND p.pago_em IS NOT NULL
       ), 0) AS honorarios_pagos,
       cli.created_at AS cliente_desde,
       (CURRENT_DATE - cli.created_at::date) AS dias_relacionamento
  FROM clientes cli
  LEFT JOIN casos c ON c.cliente_id = cli.id
  LEFT JOIN honorarios h ON h.caso_id = c.id
 GROUP BY cli.id, cli.nome, cli.telefone, cli.created_at
HAVING count(DISTINCT c.id) > 0
 ORDER BY honorarios_pagos DESC;

-- ---------------------------------------------------------------------
-- VIEW: bi_forecast_receita
-- Forecast ponderado de receita: para cada caso ativo, multiplica o
-- valor_provavel_exito pela taxa historica de exito do tipo de acao
-- (vinda de bi_taxa_exito_por_tipo). Soma por tipo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW bi_forecast_receita AS
WITH taxas AS (
    SELECT tipo_acao, COALESCE(taxa_exito, 0.5) AS taxa
      FROM bi_taxa_exito_por_tipo
)
SELECT COALESCE(NULLIF(c.tipo_acao, ''), 'Nao informado') AS tipo_acao,
       count(*) AS qtd_casos_ativos,
       sum(c.valor_provavel_exito) AS valor_provavel_total,
       COALESCE(t.taxa, 0.5) AS taxa_exito_historica,
       round(sum(c.valor_provavel_exito) * COALESCE(t.taxa, 0.5), 2) AS forecast_ponderado
  FROM casos c
  LEFT JOIN taxas t ON t.tipo_acao = COALESCE(NULLIF(c.tipo_acao, ''), 'Nao informado')
 WHERE c.status = 'ativo'
   AND c.valor_provavel_exito IS NOT NULL
 GROUP BY tipo_acao, t.taxa
 ORDER BY forecast_ponderado DESC;

-- ---------------------------------------------------------------------
-- VIEW: bi_funil_juridico
-- Conversao desde leads ate caso ganho. Mostra a "barriga" da
-- captacao juridica: quantos % dos leads viram cliente, % cliente
-- vira caso, % caso vira ganho.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW bi_funil_juridico AS
SELECT
    (SELECT count(*) FROM leads) AS total_leads,
    (SELECT count(*) FROM clientes) AS total_clientes,
    (SELECT count(*) FROM casos) AS total_casos,
    (SELECT count(*) FROM casos WHERE status = 'ativo') AS casos_ativos,
    (SELECT count(*) FROM casos WHERE status IN ('ganho','acordo')) AS casos_ganhos,
    (SELECT count(*) FROM casos WHERE status = 'perdido') AS casos_perdidos,
    CASE
        WHEN (SELECT count(*) FROM leads) > 0
        THEN round(
            (SELECT count(*) FROM clientes)::numeric / (SELECT count(*) FROM leads)::numeric, 4)
        ELSE 0
    END AS taxa_lead_cliente,
    CASE
        WHEN (SELECT count(*) FROM clientes) > 0
        THEN round(
            (SELECT count(*) FROM casos)::numeric / (SELECT count(*) FROM clientes)::numeric, 4)
        ELSE 0
    END AS casos_por_cliente,
    CASE
        WHEN (SELECT count(*) FROM casos WHERE status IN ('ganho','perdido','acordo')) > 0
        THEN round(
            (SELECT count(*) FROM casos WHERE status IN ('ganho','acordo'))::numeric
            / (SELECT count(*) FROM casos WHERE status IN ('ganho','perdido','acordo'))::numeric, 4)
        ELSE 0
    END AS taxa_exito_geral;
