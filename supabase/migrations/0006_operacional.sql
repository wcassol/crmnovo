-- =====================================================================
-- Sprint 2: operacional
-- Tags flexiveis, notas internas e documentos anexados.
-- Idempotente: pode ser executada multiplas vezes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TAGS: tags flexiveis com escopo (cliente, caso, lead ou todos).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(60) NOT NULL,
    cor VARCHAR(7) NOT NULL DEFAULT '#7F77DD',
    escopo VARCHAR(20) NOT NULL DEFAULT 'todos',
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tag_escopo CHECK (escopo IN ('cliente','caso','lead','todos')),
    UNIQUE (nome, escopo)
);

CREATE INDEX IF NOT EXISTS idx_tags_escopo ON tags (escopo);

CREATE TABLE IF NOT EXISTS cliente_tags (
    cliente_id INTEGER NOT NULL REFERENCES clientes (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cliente_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_cliente_tags_tag ON cliente_tags (tag_id);

CREATE TABLE IF NOT EXISTS caso_tags (
    caso_id INTEGER NOT NULL REFERENCES casos (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (caso_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_caso_tags_tag ON caso_tags (tag_id);

-- ---------------------------------------------------------------------
-- NOTAS: anotacoes internas atreladas a cliente OU caso.
-- CHECK garante que pelo menos uma das FKs e preenchida.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes (id) ON DELETE CASCADE,
    caso_id INTEGER REFERENCES casos (id) ON DELETE CASCADE,
    autor_id INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    conteudo TEXT NOT NULL,
    fixada BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_nota_vinculo CHECK (cliente_id IS NOT NULL OR caso_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_notas_cliente ON notas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_notas_caso ON notas (caso_id);
CREATE INDEX IF NOT EXISTS idx_notas_autor ON notas (autor_id);
CREATE INDEX IF NOT EXISTS idx_notas_fixada ON notas (fixada);
CREATE INDEX IF NOT EXISTS idx_notas_created ON notas (created_at);

-- ---------------------------------------------------------------------
-- DOCUMENTOS: arquivos anexados a cliente ou caso. O arquivo vive no
-- Supabase Storage (bucket "documentos"); aqui guardamos o caminho.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes (id) ON DELETE CASCADE,
    caso_id INTEGER REFERENCES casos (id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(60),
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    tamanho_bytes BIGINT,
    descricao TEXT,
    uploaded_by INTEGER REFERENCES membros (id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_documento_vinculo CHECK (cliente_id IS NOT NULL OR caso_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON documentos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_caso ON documentos (caso_id);
CREATE INDEX IF NOT EXISTS idx_documentos_categoria ON documentos (categoria);

-- ---------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY['tags','notas','documentos'])
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
-- VIEW: agenda_completa (audiencias + prazos + reunioes Cal.com nos
-- proximos 30 dias). Tabela agenda_proxima ja existe so com audiencias
-- e prazos; aqui combinamos as 3 fontes.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW agenda_completa AS
SELECT 'audiencia'::text AS tipo,
       a.id, a.caso_id, c.titulo AS caso_titulo,
       cli.nome AS contato_nome,
       a.data_hora AS quando,
       a.tipo AS subtipo,
       a.status,
       a.membro_responsavel_id,
       a.local_endereco AS local,
       a.link_video AS link
  FROM audiencias a
  JOIN casos c ON c.id = a.caso_id
  JOIN clientes cli ON cli.id = c.cliente_id
 WHERE a.data_hora BETWEEN NOW() - INTERVAL '7 days'
                       AND NOW() + INTERVAL '60 days'
   AND a.status NOT IN ('realizada','cancelada')
UNION ALL
SELECT 'prazo'::text AS tipo,
       p.id, p.caso_id, c.titulo AS caso_titulo,
       cli.nome AS contato_nome,
       p.data_fatal::timestamptz AS quando,
       p.tipo AS subtipo,
       CASE WHEN p.concluido_em IS NOT NULL THEN 'concluido' ELSE 'pendente' END AS status,
       p.membro_responsavel_id,
       NULL AS local,
       NULL AS link
  FROM prazos p
  JOIN casos c ON c.id = p.caso_id
  JOIN clientes cli ON cli.id = c.cliente_id
 WHERE p.data_fatal BETWEEN CURRENT_DATE - INTERVAL '7 days'
                        AND CURRENT_DATE + INTERVAL '60 days'
   AND p.concluido_em IS NULL
UNION ALL
SELECT 'reuniao'::text AS tipo,
       r.id, NULL::integer AS caso_id, NULL::varchar AS caso_titulo,
       r.nome_cliente AS contato_nome,
       r.data_hora AS quando,
       r.canal AS subtipo,
       r.status,
       NULL::integer AS membro_responsavel_id,
       NULL AS local,
       NULL AS link
  FROM reunioes r
 WHERE r.data_hora BETWEEN NOW() - INTERVAL '7 days'
                       AND NOW() + INTERVAL '60 days'
   AND r.status NOT IN ('cancelada','realizada')
 ORDER BY quando;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE caso_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
    policy_name TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY['tags','cliente_tags','caso_tags','notas','documentos'])
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
-- Seeds: tags iniciais comuns (idempotente via ON CONFLICT).
-- ---------------------------------------------------------------------
INSERT INTO tags (nome, cor, escopo, descricao) VALUES
    ('VIP', '#EF9F27', 'cliente', 'Cliente prioritario'),
    ('Inadimplente', '#D4537E', 'cliente', 'Pagamento em atraso'),
    ('Indicacao', '#1D9E75', 'cliente', 'Cliente indicado por outro'),
    ('Urgente', '#D4537E', 'caso', 'Acompanhar com prioridade'),
    ('Audiencia em 30 dias', '#EF9F27', 'caso', 'Audiencia agendada proxima'),
    ('Aguarda documentos', '#7F77DD', 'caso', 'Cliente precisa enviar documentos')
ON CONFLICT (nome, escopo) DO NOTHING;
