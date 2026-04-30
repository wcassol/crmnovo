export type PublicConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const PUBLIC_CONFIG_GLOBAL = '__PUBLIC_CONFIG__';

export function getServerPublicConfig(): PublicConfig {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
}

export function getBrowserPublicConfig(): PublicConfig {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserPublicConfig deve ser chamado no navegador.');
  }
  const cfg = (window as unknown as Record<string, PublicConfig | undefined>)[
    PUBLIC_CONFIG_GLOBAL
  ];
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    throw new Error(
      'Configuracao publica ausente. Defina NEXT_PUBLIC_SUPABASE_URL e ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY nas variaveis de ambiente do servico ' +
        'e reinicie o container.',
    );
  }
  return cfg;
}
