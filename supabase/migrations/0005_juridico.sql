-- =====================================================================
-- Estrutura juridica: clientes, casos, honorarios, parcelas,
-- audiencias, prazos e membros (equipe interna do escritorio).
--
-- Esta migration adiciona o nucleo de CRM juridico ao topo da
-- estrutura comercial ja existente (leads, contratos, etc).
-- Idempotente: pode ser executada multiplas vezes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- MEMBROS: equipe interna (advogados, estagiarios, secretaria).
-- Vinculado opcionalmente a um usuario do Supabase Auth.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membros (
    id SERIAL PRIMARY KEY,
    auth_user_id UUID UNIQUE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    oab VARCHAR(20),
    cargo VARCHAR(50),
    especialidade VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membros_ativo ON membros (ativo);
CREATE INDEX IF NOT EXISTS idx_membros_email ON membros (email);

-- ---------------------------------------------------------------------
-- CLIENTES: pessoa fisica ou juridica que assinou contrato. Cada lead
-- pode virar cliente quando o contrato e assinado.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    tipo_pessoa VARCHAR(2) NOT NULL DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF', 'PJ')),
    nome VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(20) UNIQUE,
    rg VARCHAR(20),
    data_nascimento DATE,
    estado_civil VARCHAR(30),
    profissao VARCHAR(100),
    email VARCHAR(255),
    telefone VARCHAR(20),
    cep VARCHAR(10),
    endereco VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    pix_chave VARCHAR(255),
    pix_tipo VARCHAR(20),
    observacoes TEXT,
    lead_id INTEGER REFERENCES leads (id) ON DELETE SET NULL,
    membro_responsavel_id INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes (cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes (telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_lead ON clientes (lead_id);
CREATE INDEX IF NOT EXISTS idx_clientes_responsavel ON clientes (membro_responsavel_id);

-- ---------------------------------------------------------------------
-- CASOS: processos judiciais ou consultivos atrelados a um cliente.
-- Mesmo cliente pode ter varios casos.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS casos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
    contrato_id INTEGER REFERENCES contratos (id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo_acao VARCHAR(100),
    area VARCHAR(50),
    numero_cnj VARCHAR(30),
    vara VARCHAR(255),
    comarca VARCHAR(100),
    uf VARCHAR(2),
    valor_causa DECIMAL(14, 2),
    valor_provavel_exito DECIMAL(14, 2),
    fase VARCHAR(50) NOT NULL DEFAULT 'pre_processual',
    status VARCHAR(30) NOT NULL DEFAULT 'ativo',
    data_distribuicao DATE,
    data_sentenca DATE,
    data_transito DATE,
    resultado VARCHAR(30),
    membro_responsavel_id INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_casos_fase CHECK (fase IN (
        'pre_processual','inicial','contestacao','instrucao',
        'sentenca','recurso','transitado','execucao','arquivado'
    )),
    CONSTRAINT chk_casos_status CHECK (status IN (
        'ativo','suspenso','arquivado','ganho','perdido','acordo'
    )),
    CONSTRAINT chk_casos_resultado CHECK (resultado IS NULL OR resultado IN (
        'procedente','improcedente','parcial','acordo','extinto'
    ))
);

CREATE INDEX IF NOT EXISTS idx_casos_cliente ON casos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_casos_contrato ON casos (contrato_id);
CREATE INDEX IF NOT EXISTS idx_casos_responsavel ON casos (membro_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_casos_status ON casos (status);
CREATE INDEX IF NOT EXISTS idx_casos_fase ON casos (fase);
CREATE INDEX IF NOT EXISTS idx_casos_cnj ON casos (numero_cnj);
CREATE INDEX IF NOT EXISTS idx_casos_data_distribuicao ON casos (data_distribuicao);

-- ---------------------------------------------------------------------
-- HONORARIOS: linhas de honorario por caso. Um caso tem N honorarios
-- (entrada, exito, recursal). Cada honorario tem N parcelas.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS honorarios (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER NOT NULL REFERENCES casos (id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    descricao VARCHAR(255),
    valor_total DECIMAL(14, 2) NOT NULL,
    percentual DECIMAL(5, 2),
    base_calculo DECIMAL(14, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_honorario_tipo CHECK (tipo IN (
        'entrada','exito','recursal','sucumbencia','fixo','consultivo'
    )),
    CONSTRAINT chk_honorario_status CHECK (status IN (
        'pendente','parcialmente_pago','quitado','cancelado','inadimplente'
    ))
);

CREATE INDEX IF NOT EXISTS idx_honorarios_caso ON honorarios (caso_id);
CREATE INDEX IF NOT EXISTS idx_honorarios_status ON honorarios (status);

-- ---------------------------------------------------------------------
-- PARCELAS: divisao em parcelas dos honorarios.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parcelas (
    id SERIAL PRIMARY KEY,
    honorario_id INTEGER NOT NULL REFERENCES honorarios (id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    valor DECIMAL(14, 2) NOT NULL,
    vencimento DATE NOT NULL,
    pago_em DATE,
    valor_pago DECIMAL(14, 2),
    forma_pagamento VARCHAR(30),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (honorario_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_parcelas_honorario ON parcelas (honorario_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas (vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_pago ON parcelas (pago_em);

-- ---------------------------------------------------------------------
-- AUDIENCIAS: audiencias do caso.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audiencias (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER NOT NULL REFERENCES casos (id) ON DELETE CASCADE,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo VARCHAR(50),
    modalidade VARCHAR(20) NOT NULL DEFAULT 'presencial',
    local_endereco VARCHAR(255),
    link_video VARCHAR(500),
    membro_responsavel_id INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'agendada',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_audiencia_modalidade CHECK (modalidade IN ('presencial','virtual','hibrida')),
    CONSTRAINT chk_audiencia_status CHECK (status IN (
        'agendada','realizada','cancelada','adiada','redesignada'
    ))
);

CREATE INDEX IF NOT EXISTS idx_audiencias_caso ON audiencias (caso_id);
CREATE INDEX IF NOT EXISTS idx_audiencias_data ON audiencias (data_hora);
CREATE INDEX IF NOT EXISTS idx_audiencias_responsavel ON audiencias (membro_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_audiencias_status ON audiencias (status);

-- ---------------------------------------------------------------------
-- PRAZOS: prazos processuais e administrativos atrelados a um caso.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prazos (
    id SERIAL PRIMARY KEY,
    caso_id INTEGER NOT NULL REFERENCES casos (id) ON DELETE CASCADE,
    descricao VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'comum',
    data_fatal DATE NOT NULL,
    membro_responsavel_id INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    concluido_em TIMESTAMP WITH TIME ZONE,
    concluido_por INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_prazo_tipo CHECK (tipo IN ('fatal','comum','administrativo','interno'))
);

CREATE INDEX IF NOT EXISTS idx_prazos_caso ON prazos (caso_id);
CREATE INDEX IF NOT EXISTS idx_prazos_data_fatal ON prazos (data_fatal);
CREATE INDEX IF NOT EXISTS idx_prazos_responsavel ON prazos (membro_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_prazos_concluido ON prazos (concluido_em);

-- ---------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'membros','clientes','casos','honorarios',
            'parcelas','audiencias','prazos'
        ])
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
-- Trigger: atualiza status do honorario quando parcela e paga.
-- Quando todas as parcelas estao com pago_em IS NOT NULL, honorario
-- vira "quitado". Se ao menos uma parcela paga e outras pendentes,
-- "parcialmente_pago". Se nenhuma paga e existe parcela vencida sem
-- pagamento, "inadimplente".
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION atualizar_status_honorario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    hid INTEGER;
    total INTEGER;
    pagas INTEGER;
    vencidas_pendentes INTEGER;
    novo_status VARCHAR(20);
BEGIN
    hid := COALESCE(NEW.honorario_id, OLD.honorario_id);
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE pago_em IS NOT NULL),
           COUNT(*) FILTER (WHERE pago_em IS NULL AND vencimento < CURRENT_DATE)
      INTO total, pagas, vencidas_pendentes
      FROM parcelas
     WHERE honorario_id = hid;
    IF total = 0 THEN
        RETURN NEW;
    ELSIF pagas = total THEN
        novo_status := 'quitado';
    ELSIF pagas > 0 THEN
        novo_status := 'parcialmente_pago';
    ELSIF vencidas_pendentes > 0 THEN
        novo_status := 'inadimplente';
    ELSE
        novo_status := 'pendente';
    END IF;
    UPDATE honorarios SET status = novo_status WHERE id = hid AND status <> 'cancelado';
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_atualizar_status_honorario ON parcelas;
CREATE TRIGGER trg_atualizar_status_honorario
    AFTER INSERT OR UPDATE OR DELETE ON parcelas
    FOR EACH ROW EXECUTE FUNCTION atualizar_status_honorario();

-- ---------------------------------------------------------------------
-- VIEW: parcelas_a_vencer (proximas 30 dias, nao pagas)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW parcelas_a_vencer AS
SELECT p.id, p.honorario_id, p.numero, p.valor, p.vencimento,
       h.tipo AS tipo_honorario, h.caso_id,
       c.titulo AS caso_titulo, c.cliente_id,
       cli.nome AS cliente_nome, cli.telefone AS cliente_telefone,
       (p.vencimento - CURRENT_DATE) AS dias_para_vencer
  FROM parcelas p
  JOIN honorarios h ON h.id = p.honorario_id
  JOIN casos c ON c.id = h.caso_id
  JOIN clientes cli ON cli.id = c.cliente_id
 WHERE p.pago_em IS NULL
   AND p.vencimento BETWEEN CURRENT_DATE - INTERVAL '30 days'
                        AND CURRENT_DATE + INTERVAL '30 days'
 ORDER BY p.vencimento;

-- ---------------------------------------------------------------------
-- VIEW: agenda_proxima (audiencias e prazos dos proximos 30 dias)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW agenda_proxima AS
SELECT 'audiencia' AS tipo,
       a.id, a.caso_id, c.titulo AS caso_titulo,
       cli.nome AS cliente_nome,
       a.data_hora AS quando,
       a.tipo AS subtipo,
       a.status,
       a.membro_responsavel_id,
       a.local_endereco AS local
  FROM audiencias a
  JOIN casos c ON c.id = a.caso_id
  JOIN clientes cli ON cli.id = c.cliente_id
 WHERE a.data_hora BETWEEN NOW() - INTERVAL '7 days'
                       AND NOW() + INTERVAL '30 days'
   AND a.status NOT IN ('realizada','cancelada')
UNION ALL
SELECT 'prazo' AS tipo,
       p.id, p.caso_id, c.titulo AS caso_titulo,
       cli.nome AS cliente_nome,
       p.data_fatal::timestamptz AS quando,
       p.tipo AS subtipo,
       CASE WHEN p.concluido_em IS NOT NULL THEN 'concluido' ELSE 'pendente' END AS status,
       p.membro_responsavel_id,
       NULL AS local
  FROM prazos p
  JOIN casos c ON c.id = p.caso_id
  JOIN clientes cli ON cli.id = c.cliente_id
 WHERE p.data_fatal BETWEEN CURRENT_DATE - INTERVAL '7 days'
                        AND CURRENT_DATE + INTERVAL '30 days'
   AND p.concluido_em IS NULL
 ORDER BY quando;

-- ---------------------------------------------------------------------
-- RLS: leitura para authenticated. Escrita continua via service_role
-- (mantem coerencia com a politica das outras tabelas).
-- ---------------------------------------------------------------------
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE honorarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE prazos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
    policy_name TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'membros','clientes','casos','honorarios',
            'parcelas','audiencias','prazos'
        ])
    LOOP
        policy_name := tbl || '_select_authenticated';
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', policy_name, tbl);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true);',
            policy_name, tbl
        );
    END LOOP;
END $$;
