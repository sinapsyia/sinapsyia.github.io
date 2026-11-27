/* Configuração das ferramentas da SinapsyIA (onboarding, diagnóstico, criação de app).
   Preencha com os dados do seu projeto no Supabase:
   Supabase > Project Settings > API (ou "Data API").
   A "anon public key" pode ficar aqui: ela é pública por natureza. Quem protege
   os dados são as regras do arquivo supabase/schema.sql.
   NUNCA coloque aqui a "service_role key" nem a chave da API da Anthropic. */
window.SINAPSY_CONFIG = {
  SUPABASE_URL: 'https://ckrfbyxbkxbhvbhfwftv.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_0LXOxOw-XLqSRggAv54okw_rS8KAQCX',
  MODELO_IA: 'claude-opus-5-5'
};
