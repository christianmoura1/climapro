import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Client com service role — ignora RLS, uso restrito a lógica de servidor já validada.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

// Client "como o usuário que chamou a function", respeita RLS normalmente.
export function supabaseForRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
}

export async function getRequestingProfile(req: Request) {
  const client = supabaseForRequest(req);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { user, profile };
}
