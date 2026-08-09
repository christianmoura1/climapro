import { corsHeaders } from '../_shared/cors.ts';
import { getRequestingProfile, supabaseAdmin } from '../_shared/clients.ts';

type Profile = {
  id: string;
  empresa_id: string | null;
  tipo_usuario: string;
  tecnico_id: string | null;
  cliente_id: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  let createdUserId: string | null = null;

  try {
    const { user, profile: requestingProfile } = await getRequestingProfile(req);
    if (!user || !requestingProfile) return json({ error: 'Usuário não autenticado.' }, 401);

    const isAdminGlobal = requestingProfile.tipo_usuario === 'admin_global';
    if (!isAdminGlobal && requestingProfile.tipo_usuario !== 'admin_empresa') {
      return json({ error: 'Apenas administradores podem gerenciar a senha de técnicos.' }, 403);
    }

    const { tecnico_id: tecnicoId, password } = await req.json();
    if (typeof tecnicoId !== 'string' || !tecnicoId) {
      return json({ error: 'Técnico não informado.' }, 400);
    }
    if (typeof password !== 'string' || password.length < 8) {
      return json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, 400);
    }

    const { data: tecnico, error: tecnicoError } = await supabaseAdmin
      .from('tecnico')
      .select('id, empresa_id, nome, email, telefone, status')
      .eq('id', tecnicoId)
      .maybeSingle();
    if (tecnicoError) throw tecnicoError;
    if (!tecnico) return json({ error: 'Técnico não encontrado.' }, 404);
    if (!isAdminGlobal && tecnico.empresa_id !== requestingProfile.empresa_id) {
      return json({ error: 'Este técnico não pertence à sua empresa.' }, 403);
    }

    const email = String(tecnico.email ?? '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return json({ error: 'Cadastre um e-mail válido para o técnico antes de criar a senha.' }, 400);
    }

    const { data: linkedProfile, error: linkedError } = await supabaseAdmin
      .from('profiles')
      .select('id, empresa_id, tipo_usuario, tecnico_id, cliente_id')
      .eq('tecnico_id', tecnico.id)
      .maybeSingle();
    if (linkedError) throw linkedError;

    let accessProfile = linkedProfile as Profile | null;
    if (!accessProfile) {
      const { data: emailProfile, error: emailError } = await supabaseAdmin
        .from('profiles')
        .select('id, empresa_id, tipo_usuario, tecnico_id, cliente_id')
        .eq('email', email)
        .maybeSingle();
      if (emailError) throw emailError;

      if (emailProfile) {
        const isOrphanSignup = emailProfile.tipo_usuario === 'admin_empresa'
          && !emailProfile.empresa_id
          && !emailProfile.tecnico_id
          && !emailProfile.cliente_id;
        const isCompatibleTechnician = emailProfile.tipo_usuario === 'tecnico'
          && (!emailProfile.empresa_id || emailProfile.empresa_id === tecnico.empresa_id)
          && (!emailProfile.tecnico_id || emailProfile.tecnico_id === tecnico.id);

        if (!isOrphanSignup && !isCompatibleTechnician) {
          return json({
            error: 'Este e-mail já pertence a outra conta. Use outro e-mail para o técnico ou contate o suporte.',
          }, 409);
        }
        accessProfile = emailProfile as Profile;
      }
    }

    const appMetadata = {
      tipo_usuario: 'tecnico',
      empresa_id: tecnico.empresa_id,
      tecnico_id: tecnico.id,
    };

    let authUserId = accessProfile?.id ?? null;
    let created = false;

    if (authUserId) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: tecnico.nome },
        app_metadata: appMetadata,
      });
      if (updateAuthError) throw updateAuthError;
    } else {
      const { data: createdAuth, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: tecnico.nome },
        app_metadata: appMetadata,
      });
      if (createAuthError) throw createAuthError;
      authUserId = createdAuth.user.id;
      createdUserId = authUserId;
      created = true;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        empresa_id: tecnico.empresa_id,
        tipo_usuario: 'tecnico',
        tecnico_id: tecnico.id,
        cliente_id: null,
        full_name: tecnico.nome,
        email,
        telefone: tecnico.telefone,
        status: tecnico.status,
      })
      .eq('id', authUserId);
    if (profileError) throw profileError;

    return json({
      success: true,
      created,
      email,
      message: created ? 'Acesso do técnico criado.' : 'Senha do técnico atualizada.',
    });
  } catch (error) {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }
    console.error('Erro ao gerenciar acesso do técnico:', error);
    return json({ error: error instanceof Error ? error.message : 'Erro interno ao gerenciar acesso.' }, 500);
  }
});
