-- =====================================================================
-- Sprint 3: financeiro juridico
-- Recibos, comissoes para captadores/parceiros e views agregadas
-- (receita prevista por mes, inadimplencia, comissoes a pagar).
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- RECIBOS: comprovantes emitidos por parcela. Um recibo pode cobrir
-- multiplas parcelas (parcelas_ids como JSONB) ou ser autonomo
-- (avulso). O PDF, se gerado, vive em Storage; aqui guardamos o path.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recibos (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(40) NOT NULL UNIQUE,
    cliente_id INTEGER NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
    caso_id INTEGER REFERENCES casos (id) ON DELETE SET NULL,
    valor DECIMAL(14, 2) NOT NULL,
    emitido_em DATE NOT NULL DEFAULT CURRENT_DATE,
    forma_pagamento VARCHAR(30),
    descricao TEXT,
    storage_path VARCHAR(500),
    parcelas_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    emitido_por INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    cancelado_em TIMESTAMP WITH TIME ZONE,
    motivo_cancelamento TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recibos_cliente ON recibos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_recibos_caso ON recibos (caso_id);
CREATE INDEX IF NOT EXISTS idx_recibos_data ON recibos (emitido_em);
CREATE INDEX IF NOT EXISTS idx_recibos_cancelado ON recibos (cancelado_em);

-- ---------------------------------------------------------------------
-- COMISSOES: comissao a pagar a captador ou parceiro pelo caso. Pode
-- ser % sobre o honorario assinado, % sobre exito, ou valor fixo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comissoes (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER NOT NULL REFERENCES casos (id) ON DELETE CASCADE,
    honorario_id INTEGER REFERENCES honorarios (id) ON DELETE SET NULL,
    beneficiario_membro_id INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    beneficiario_externo_nome VARCHAR(255),
    beneficiario_externo_doc VARCHAR(20),
    tipo VARCHAR(30) NOT NULL DEFAULT 'captacao',
    base_calculo VARCHAR(30) NOT NULL DEFAULT 'honorario_entrada',
    percentual DECIMAL(5, 2),
    valor DECIMAL(14, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    devida_em DATE,
    paga_em DATE,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_comissao_tipo CHECK (tipo IN ('captacao','parceria','indicacao','outro')),
    CONSTRAINT chk_comissao_base CHECK (base_calculo IN (
        'honorario_entrada','honorario_exito','valor_causa','fixo'
    )),
    CONSTRAINT chk_comissao_status CHECK (status IN ('pendente','paga','cancelada')),
    CONSTRAINT chk_comissao_beneficiario CHECK (
        beneficiario_membro_id IS NOT NULL OR beneficiario_externo_nome IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_comissoes_caso ON comissoes (caso_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes (status);
CREATE INDEX IF NOT EXISTS idx_comissoes_membro ON comissoes (beneficiario_membro_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_devida ON comissoes (devida_em);

-- ---------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['recibos','comissoes'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_%I ON %I;', tbl, tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_touch_%I BEFORE UPDATE ON %I '
            'FOR EACH ROW EXECUTE FUNCTION touch_updated_at();',
            tbl, tbl
        );
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- VIEW: parcelas_resumo
-- Junta parcela + honorario + caso + cliente em uma linha so, com
-- coluna situacao calculada (paga / a_vencer / vence_hoje / vencida).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW parcelas_resumo AS
SELECT p.id,
       p.honorario_id,
       p.numero,
       p.valor,
       p.vencimento,
       p.pago_em,
       p.valor_pago,
       p.forma_pagamento,
       p.observacao,
       h.tipo AS tipo_honorario,
       h.status AS status_honorario,
       h.caso_id,
       c.titulo AS caso_titulo,
       c.cliente_id,
       cli.nome AS cliente_nome,
       cli.telefone AS cliente_telefone,
       cli.email AS cliente_email,
       CASE
           WHEN p.pago_em IS NOT NULL THEN 'paga'
           WHEN p.vencimento < CURRENT_DATE THEN 'vencida'
           WHEN p.vencimento = CURRENT_DATE THEN 'vence_hoje'
           ELSE 'a_vencer'
       END AS situacao,
       (CURRENT_DATE - p.vencimento) AS dias_atraso
  FROM parcelas p
  JOIN honorarios h ON h.id = p.honorario_id
  JOIN casos c ON c.id = h.caso_id
  JOIN clientes cli ON cli.id = c.cliente_id;

-- ---------------------------------------------------------------------
-- VIEW: receita_prevista_mes
-- Soma valores das parcelas a vencer por mes do ano corrente e
-- proximo. Util pra projecao de caixa.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW receita_prevista_mes AS
SELECT to_char(vencimento, 'YYYY-MM') AS mes_ref,
       date_trunc('month', vencimento)::date AS mes,
       count(*) AS qtd_parcelas,
       sum(valor) AS valor_total,
       sum(valor) FILTER (WHERE pago_em IS NOT NULL) AS valor_pago,
       sum(valor) FILTER (WHERE pago_em IS NULL AND vencimento < CURRENT_DATE) AS valor_vencido,
       sum(valor) FILTER (WHERE pago_em IS NULL AND vencimento >= CURRENT_DATE) AS valor_a_vencer
  FROM parcelas
 WHERE vencimento BETWEEN date_trunc('month', CURRENT_DATE - INTERVAL '6 months')::date
                      AND date_trunc('month', CURRENT_DATE + INTERVAL '12 months')::date
 GROUP BY mes_ref, mes
 ORDER BY mes;

-- ---------------------------------------------------------------------
-- VIEW: inadimplencia_clientes
-- Total devido (vencido nao pago) por cliente.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW inadimplencia_clientes AS
SELECT cli.id AS cliente_id,
       cli.nome,
       cli.telefone,
       cli.email,
       count(p.*) AS qtd_parcelas_vencidas,
       sum(p.valor) AS valor_total_vencido,
       min(p.vencimento) AS parcela_mais_antiga,
       max(CURRENT_DATE - p.vencimento) AS max_dias_atraso
  FROM clientes cli
  JOIN casos c ON c.cliente_id = cli.id
  JOIN honorarios h ON h.caso_id = c.id
  JOIN parcelas p ON p.honorario_id = h.id
 WHERE p.pago_em IS NULL
   AND p.vencimento < CURRENT_DATE
 GROUP BY cli.id, cli.nome, cli.telefone, cli.email
HAVING sum(p.valor) > 0
 ORDER BY valor_total_vencido DESC;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
    policy_name TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['recibos','comissoes'])
    LOOP
        policy_name := tbl || '_select_authenticated';
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', policy_name, tbl);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true);',
            policy_name, tbl
        );
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- RPC: gerar_proximo_numero_recibo()
-- Numera receboes no formato YYYY-NNNNN sequencial por ano.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gerar_proximo_numero_recibo()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ano TEXT;
    seq INTEGER;
BEGIN
    ano := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(
        max(NULLIF(regexp_replace(numero, '^[0-9]{4}-', ''), '')::int),
        0
    ) + 1
      INTO seq
      FROM recibos
     WHERE numero LIKE ano || '-%';
    RETURN ano || '-' || lpad(seq::text, 5, '0');
END $$;

REVOKE ALL ON FUNCTION gerar_proximo_numero_recibo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION gerar_proximo_numero_recibo() TO service_role, authenticated;
