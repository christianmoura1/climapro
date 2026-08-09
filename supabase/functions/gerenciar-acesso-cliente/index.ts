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
      return json({ error: 'Apenas administradores podem gerenciar a senha de clientes.' }, 403);
    }

    const { cliente_id: clienteId, password } = await req.json();
    if (typeof clienteId !== 'string' || !clienteId) {
      return json({ error: 'Cliente não informado.' }, 400);
    }
    if (typeof password !== 'string' || password.length < 8) {
      return json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, 400);
    }

    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from('cliente')
      .select('id, empresa_id, nome, email, telefone, tem_acesso_portal')
      .eq('id', clienteId)
      .maybeSingle();
    if (clienteError) throw clienteError;
    if (!cliente) return json({ error: 'Cliente não encontrado.' }, 404);
    if (!isAdminGlobal && cliente.empresa_id !== requestingProfile.empresa_id) {
      return json({ error: 'Este cliente não pertence à sua empresa.' }, 403);
    }

    const email = String(cliente.email ?? '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return json({ error: 'Cadastre um e-mail válido para o cliente antes de criar a senha.' }, 400);
    }

    const { data: linkedProfile, error: linkedError } = await supabaseAdmin
      .from('profiles')
      .select('id, empresa_id, tipo_usuario, tecnico_id, cliente_id')
      .eq('cliente_id', cliente.id)
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
        const isCompatibleClient = emailProfile.tipo_usuario === 'cliente'
          && (!emailProfile.empresa_id || emailProfile.empresa_id === cliente.empresa_id)
          && (!emailProfile.cliente_id || emailProfile.cliente_id === cliente.id);

        if (!isOrphanSignup && !isCompatibleClient) {
          return json({
            error: 'Este e-mail já pertence a outra conta. Use outro e-mail para o cliente ou contate o suporte.',
          }, 409);
        }
        accessProfile = emailProfile as Profile;
      }
    }

    const appMetadata = {
      tipo_usuario: 'cliente',
      empresa_id: cliente.empresa_id,
      cliente_id: cliente.id,
    };

    let authUserId = accessProfile?.id ?? null;
    let created = false;

    if (authUserId) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: cliente.nome },
        app_metadata: appMetadata,
      });
      if (updateAuthError) throw updateAuthError;
    } else {
      const { data: createdAuth, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: cliente.nome },
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
        empresa_id: cliente.empresa_id,
        tipo_usuario: 'cliente',
        tecnico_id: null,
        cliente_id: cliente.id,
        full_name: cliente.nome,
        email,
        telefone: cliente.telefone,
        status: 'ativo',
      })
      .eq('id', authUserId);
    if (profileError) throw profileError;

