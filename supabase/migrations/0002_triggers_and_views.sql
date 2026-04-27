-- =====================================================================
-- Triggers e Views derivadas
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funcao de classificacao automatica do lead.
-- Roda em BEFORE INSERT/UPDATE para preencher prefixo_criativo e
-- tipo_campanha conforme regras de negocio.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION classificar_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset prefixo se primeira_mensagem foi alterada
    IF NEW.primeira_mensagem IS NOT NULL THEN
        IF UPPER(LEFT(TRIM(NEW.primeira_mensagem), 2)) = 'PP' THEN
            NEW.prefixo_criativo := 'PP';
        ELSIF UPPER(LEFT(TRIM(NEW.primeira_mensagem), 3)) = 'ABE' THEN
            NEW.prefixo_criativo := 'ABE';
        ELSIF UPPER(LEFT(TRIM(NEW.primeira_mensagem), 3)) = 'SEG' THEN
            NEW.prefixo_criativo := 'SEG';
        ELSE
            NEW.prefixo_criativo := NULL;
        END IF;
    END IF;

    -- Classifica tipo_campanha em cascata
    IF NEW.prefixo_criativo IN ('PP', 'ABE', 'SEG') THEN
        NEW.tipo_campanha := 'APP_MOBILIDADE';
    ELSIF NEW.utm_content IS NOT NULL AND (
        UPPER(NEW.utm_content) LIKE '%MOTORISTA%' OR
        UPPER(NEW.utm_content) LIKE '%BANIDA%' OR
        UPPER(NEW.utm_content) LIKE '%BLOQUEADA%'
    ) THEN
        NEW.tipo_campanha := 'APP_MOBILIDADE';
    ELSIF NEW.utm_content IS NOT NULL AND (
        UPPER(NEW.utm_content) LIKE '%SERVIDOR%' OR
        UPPER(NEW.utm_content) LIKE '%PUBLICO%' OR
        UPPER(NEW.utm_content) LIKE '%PÚBLICO%'
    ) THEN
        NEW.tipo_campanha := 'SERVIDOR_PUBLICO';
    ELSIF NEW.primeira_mensagem IS NOT NULL AND (
        LOWER(NEW.primeira_mensagem) LIKE '%motorista%' OR
        LOWER(NEW.primeira_mensagem) LIKE '%bloqueada%' OR
        LOWER(NEW.primeira_mensagem) LIKE '%uber%' OR
        LOWER(NEW.primeira_mensagem) LIKE '%app%'
    ) THEN
        NEW.tipo_campanha := 'APP_MOBILIDADE';
    ELSIF NEW.primeira_mensagem IS NOT NULL AND (
        LOWER(NEW.primeira_mensagem) LIKE '%servidor%' OR
        LOWER(NEW.primeira_mensagem) LIKE '%superendividamento%' OR
        LOWER(NEW.primeira_mensagem) LIKE '%consignado%'
    ) THEN
        NEW.tipo_campanha := 'SERVIDOR_PUBLICO';
    ELSE
        NEW.tipo_campanha := 'NAO_CLASSIFICADO';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_classificar_lead ON leads;
CREATE TRIGGER trg_classificar_lead
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION classificar_lead();

-- ---------------------------------------------------------------------
-- Funcao para classificar contrato pelo nome do documento.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION classificar_contrato()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nome_documento IS NOT NULL AND (
        UPPER(NEW.nome_documento) LIKE '%UBER%' OR
        UPPER(NEW.nome_documento) LIKE '%99%' OR
        UPPER(NEW.nome_documento) LIKE '%INDRIVE%' OR
        UPPER(NEW.nome_documento) LIKE '%APP MOBILIDADE%' OR
        UPPER(NEW.nome_documento) LIKE '%MOBILIDADE%'
    ) THEN
        NEW.tipo_contrato := 'APP_MOBILIDADE';
    ELSIF NEW.tipo_contrato IS NULL THEN
        NEW.tipo_contrato := 'GENERICO';
    END IF;

    -- Calcula tempo entre criacao e assinatura quando ambos estao setados
    IF NEW.data_criacao IS NOT NULL AND NEW.data_assinatura IS NOT NULL THEN
        NEW.tempo_para_assinar_min :=
            EXTRACT(EPOCH FROM (NEW.data_assinatura - NEW.data_criacao)) / 60.0;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_classificar_contrato ON contratos;
CREATE TRIGGER trg_classificar_contrato
    BEFORE INSERT OR UPDATE ON contratos
    FOR EACH ROW
    EXECUTE FUNCTION classificar_contrato();

-- ---------------------------------------------------------------------
-- VIEW: funil atual (mes corrente) por tipo_campanha
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_funil_atual AS
SELECT
    tipo_campanha,
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE status = 'Concluido') AS leads_atendidos,
    COUNT(*) FILTER (WHERE status = 'Em andamento') AS leads_andamento,
    COUNT(*) FILTER (WHERE status = 'Pendente') AS leads_pendentes,
    COUNT(*) FILTER (WHERE prefixo_criativo = 'PP') AS leads_pp,
    COUNT(*) FILTER (WHERE prefixo_criativo = 'ABE') AS leads_abe,
    COUNT(*) FILTER (WHERE prefixo_criativo = 'SEG') AS leads_seg,
    ROUND(AVG(tempo_atendimento_min) FILTER (WHERE tempo_atendimento_min IS NOT NULL), 1) AS tempo_medio_min,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tempo_atendimento_min)
        FILTER (WHERE tempo_atendimento_min IS NOT NULL) AS tempo_mediano_min,
    COUNT(*) FILTER (WHERE tempo_atendimento_min < 5) AS resp_menos_5min,
    COUNT(*) FILTER (WHERE tempo_atendimento_min >= 60) AS resp_mais_60min,
    COUNT(*) FILTER (WHERE utm_source = 'INSTAGRAM') AS leads_instagram,
    COUNT(*) FILTER (WHERE utm_source = 'FACEBOOK') AS leads_facebook,
    MIN(data_criacao) AS primeiro_lead,
    MAX(data_criacao) AS ultimo_lead
FROM leads
WHERE data_criacao >= date_trunc('month', CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')
GROUP BY tipo_campanha;

-- ---------------------------------------------------------------------
-- VIEW: leads agregados por dia (para grafico de linha)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_leads_por_dia AS
SELECT
    (data_criacao AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
    tipo_campanha,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'Concluido') AS atendidos,
    COUNT(*) FILTER (WHERE prefixo_criativo = 'PP') AS pp,
    COUNT(*) FILTER (WHERE prefixo_criativo = 'ABE') AS abe,
    COUNT(*) FILTER (WHERE prefixo_criativo = 'SEG') AS seg
FROM leads
WHERE data_criacao IS NOT NULL
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- ---------------------------------------------------------------------
-- VIEW: contratos resumo por tipo
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_contratos_resumo AS
SELECT
    tipo_contrato,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'Assinado') AS assinados,
    COUNT(*) FILTER (WHERE status = 'Em curso') AS em_curso,
    COUNT(*) FILTER (WHERE status = 'Recusado') AS recusados,
    COUNT(*) FILTER (WHERE status = 'Expirado') AS expirados,
    ROUND(AVG(tempo_para_assinar_min) FILTER (WHERE tempo_para_assinar_min IS NOT NULL), 1) AS tempo_medio_min,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tempo_para_assinar_min)
        FILTER (WHERE tempo_para_assinar_min IS NOT NULL) AS tempo_mediano_min,
    COALESCE(SUM(valor_entrada) FILTER (WHERE status = 'Assinado'), 0) AS receita_entrada
FROM contratos
WHERE data_criacao >= date_trunc('month', CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')
GROUP BY tipo_contrato;

-- ---------------------------------------------------------------------
-- VIEW: campanhas com metricas derivadas
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_campanhas_resumo AS
SELECT
    tipo,
    COUNT(*) AS total_campanhas,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') AS ativas,
    COALESCE(SUM(impressoes), 0) AS impressoes,
    COALESCE(SUM(alcance), 0) AS alcance,
    COALESCE(SUM(resultados), 0) AS resultados,
    COALESCE(SUM(gasto), 0) AS gasto,
    CASE
        WHEN COALESCE(SUM(resultados), 0) > 0
        THEN ROUND(SUM(gasto) / SUM(resultados), 2)
        ELSE 0
    END AS cpr_consolidado
FROM campanhas_meta
GROUP BY tipo;
