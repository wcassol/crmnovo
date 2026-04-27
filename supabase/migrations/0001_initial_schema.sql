-- =====================================================================
-- Schema do Funil Comercial: Wendrill Cassol Advogados
-- Aplicar no Supabase self-hosted (PostgreSQL).
-- Idempotente: pode rodar varias vezes sem quebrar.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- LEADS (fonte: WTS / ZapConnecta)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    wts_session_id VARCHAR(100) UNIQUE,
    nome VARCHAR(255),
    telefone VARCHAR(20),
    status VARCHAR(30),
    utm_source VARCHAR(50),
    utm_medium VARCHAR(50),
    utm_campaign VARCHAR(100),
    utm_content TEXT,
    primeira_mensagem TEXT,
    prefixo_criativo VARCHAR(10),
    tipo_campanha VARCHAR(30),
    tempo_atendimento_min DECIMAL(10, 2),
    data_criacao TIMESTAMP WITH TIME ZONE,
    data_primeira_mensagem TIMESTAMP WITH TIME ZONE,
    data_ultima_mensagem TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_data_criacao ON leads (data_criacao);
CREATE INDEX IF NOT EXISTS idx_leads_tipo_campanha ON leads (tipo_campanha);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_prefixo ON leads (prefixo_criativo);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads (utm_source);

-- ---------------------------------------------------------------------
-- CAMPANHAS META ADS (fonte: Meta Marketing API)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campanhas_meta (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(50) UNIQUE,
    nome VARCHAR(255),
    tipo VARCHAR(30),
    status VARCHAR(30),
    objetivo VARCHAR(50),
    impressoes INTEGER DEFAULT 0,
    alcance INTEGER DEFAULT 0,
    cliques INTEGER DEFAULT 0,
    resultados INTEGER DEFAULT 0,
    gasto DECIMAL(10, 2) DEFAULT 0,
    cpr DECIMAL(10, 2) DEFAULT 0,
    cpm DECIMAL(10, 2) DEFAULT 0,
    ctr DECIMAL(10, 4) DEFAULT 0,
    data_inicio DATE,
    data_fim DATE,
    raw_actions JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_tipo ON campanhas_meta (tipo);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas_meta (status);

-- ---------------------------------------------------------------------
-- REUNIOES (fonte: Cal.com)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reunioes (
    id SERIAL PRIMARY KEY,
    calcom_booking_id VARCHAR(100) UNIQUE,
    nome_cliente VARCHAR(255),
    email_cliente VARCHAR(255),
    telefone_cliente VARCHAR(50),
    data_hora TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30),
    tipo_campanha VARCHAR(30),
    canal VARCHAR(50),
    owner VARCHAR(100),
    lead_id INTEGER REFERENCES leads (id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reunioes_data ON reunioes (data_hora);
CREATE INDEX IF NOT EXISTS idx_reunioes_status ON reunioes (status);
CREATE INDEX IF NOT EXISTS idx_reunioes_tipo ON reunioes (tipo_campanha);

-- ---------------------------------------------------------------------
-- CONTRATOS (fonte: ZapSign)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contratos (
    id SERIAL PRIMARY KEY,
    zapsign_doc_id VARCHAR(100) UNIQUE,
    nome_documento VARCHAR(500),
    tipo_contrato VARCHAR(30),
    status VARCHAR(30),
    valor_entrada DECIMAL(10, 2) DEFAULT 399.00,
    data_criacao TIMESTAMP WITH TIME ZONE,
    data_assinatura TIMESTAMP WITH TIME ZONE,
    tempo_para_assinar_min DECIMAL(10, 2),
    lead_id INTEGER REFERENCES leads (id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_tipo ON contratos (tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos (status);
CREATE INDEX IF NOT EXISTS idx_contratos_data ON contratos (data_criacao);

-- ---------------------------------------------------------------------
-- SIGNATARIOS (fonte: ZapSign)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signatarios (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER REFERENCES contratos (id) ON DELETE CASCADE,
    zapsign_signer_token VARCHAR(100) UNIQUE,
    nome VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(50),
    status VARCHAR(30),
    data_assinatura TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signatarios_contrato ON signatarios (contrato_id);
CREATE INDEX IF NOT EXISTS idx_signatarios_status ON signatarios (status);

-- ---------------------------------------------------------------------
-- SNAPSHOTS DIARIOS DO FUNIL
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funil_diario (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    tipo_campanha VARCHAR(30) NOT NULL,
    impressoes INTEGER DEFAULT 0,
    alcance INTEGER DEFAULT 0,
    conversas_meta INTEGER DEFAULT 0,
    leads_wts INTEGER DEFAULT 0,
    leads_atendidos INTEGER DEFAULT 0,
    reunioes_agendadas INTEGER DEFAULT 0,
    contratos_enviados INTEGER DEFAULT 0,
    contratos_assinados INTEGER DEFAULT 0,
    gasto_meta DECIMAL(10, 2) DEFAULT 0,
    cpl DECIMAL(10, 2) DEFAULT 0,
    cac DECIMAL(10, 2) DEFAULT 0,
    receita_entrada DECIMAL(10, 2) DEFAULT 0,
    receita_potencial DECIMAL(10, 2) DEFAULT 0,
    UNIQUE (data, tipo_campanha)
);

CREATE INDEX IF NOT EXISTS idx_funil_diario_data ON funil_diario (data);
CREATE INDEX IF NOT EXISTS idx_funil_diario_tipo ON funil_diario (tipo_campanha);

-- ---------------------------------------------------------------------
-- LOG DE SINCRONIZACAO (saude das integracoes)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    fonte VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    registros_processados INTEGER DEFAULT 0,
    erro TEXT,
    iniciado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalizado_em TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sync_log_fonte ON sync_log (fonte, iniciado_em DESC);
