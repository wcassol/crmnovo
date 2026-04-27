-- =====================================================================
-- Row Level Security: leitura para usuarios autenticados via Supabase Auth.
-- A escrita continua via service_role (n8n).
-- =====================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE funil_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
    policy_name TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'leads','campanhas_meta','reunioes','contratos',
            'signatarios','funil_diario','sync_log'
        ])
    LOOP
        policy_name := tbl || '_select_authenticated';
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I;',
            policy_name, tbl
        );
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true);',
            policy_name, tbl
        );
    END LOOP;
END $$;
