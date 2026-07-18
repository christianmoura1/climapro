// Versão "achatada" para colar direto no editor do painel Supabase (Edge Functions > Deploy a new function).
// Nome da function ao criar: remover-chamados-duplicados
// Fonte modular (se um dia usar o CLI): supabase/functions/remover-chamados-duplicados/
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function getRequestingProfile(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const client = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { user, profile };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, profile } = await getRequestingProfile(req);
    if (!user || !['admin_global', 'admin_empresa'].includes(profile?.tipo_usuario)) {
      return new Response(JSON.stringify({ error: 'Apenas admin pode executar esta operação' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = supabaseAdmin.from('chamado').select('id, numero_chamado, cliente_id, created_at');
    if (profile.tipo_usuario !== 'admin_global') {
      query = query.eq('empresa_id', profile.empresa_id);
    }
    const { data: allChamados, error } = await query;
    if (error) throw error;

    const groups = new Map();
    for (const chamado of allChamados) {
      const key = `${chamado.numero_chamado}__${chamado.cliente_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(chamado);
    }

    const toDelete = [];
    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const [, ...duplicates] = group;
      toDelete.push(...duplicates.map((d) => d.id));
    }

    let deleted = 0;
    const errors = [];
    for (const id of toDelete) {
      const { error: delError } = await supabaseAdmin.from('chamado').delete().eq('id', id);
      if (delError) errors.push({ id, error: delError.message });
      else deleted++;
    }

    return new Response(
      JSON.stringify({
        total_chamados: allChamados.length,
        grupos_unicos: groups.size,
        duplicatas_encontradas: toDelete.length,
        deletados: deleted,
        erros: errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro em remover-chamados-duplicados:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
