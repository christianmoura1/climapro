import { createClient } from '@supabase/supabase-js';

// Remove espaços e caracteres invisíveis (comuns em copy/paste de chaves) que
// tornariam os headers HTTP inválidos ("is not a valid ByteString").
const limpar = (valor) => (valor || '').replace(/[^\x20-\x7e]/g, '').trim();

const supabaseUrl = limpar(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = limpar(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[ClimaPro] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. Crie um .env.local a partir de .env.local.example.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
