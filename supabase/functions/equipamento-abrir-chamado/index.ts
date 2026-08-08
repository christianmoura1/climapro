// Abre um chamado de manutenção corretiva a partir da página pública do QR
// code de um equipamento — sem login. service_role só aqui dentro; quem
// escaneia não tem sessão nem conta no sistema.
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/clients.ts';
import { sendEmailViaResend } from '../_shared/resend.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { equipamento_id, nome_solicitante, contato_solicitante, descricao } = await req.json();
    if (!equipamento_id || !nome_solicitante || !descricao) {
      return new Response(JSON.stringify({ error: 'equipamento_id, nome_solicitante e descricao são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: equipamento, error: equipamentoError } = await supabaseAdmin
      .from('equipamento')
      .select('id, empresa_id, cliente_id, numero_equipamento, marca, modelo, localizacao, estabelecimento_nome')
      .eq('id', equipamento_id)
      .maybeSingle();
    if (equipamentoError) throw equipamentoError;
    if (!equipamento) {
      return new Response(JSON.stringify({ error: 'Equipamento não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: chamado, error: chamadoError } = await supabaseAdmin
      .from('chamado')
      .insert({
        empresa_id: equipamento.empresa_id,
        cliente_id: equipamento.cliente_id,
        equipamento_id: equipamento.id,
        equipamentos_ids: [equipamento.id],
        titulo: `Chamado via QR Code — ${equipamento.numero_equipamento || `${equipamento.marca} ${equipamento.modelo}`}`,
        descricao,
        local: equipamento.estabelecimento_nome || equipamento.localizacao || null,
        tipo_problema: 'manutencao_corretiva',
        prioridade: 'media',
        status: 'pendente',
        origem: 'qr_code',
        solicitante_nome: nome_solicitante,
        solicitante_contato: contato_solicitante || null,
      })
      .select('id, numero_chamado')
      .single();
    if (chamadoError) throw chamadoError;

    const { data: empresa } = await supabaseAdmin
      .from('empresa')
      .select('nome, email_contato, usuario_principal_email')
      .eq('id', equipamento.empresa_id)
      .maybeSingle();
    const destino = empresa?.email_contato || empresa?.usuario_principal_email;
    if (destino) {
      try {
        await sendEmailViaResend({
          to: destino,
          subject: `🔧 Novo chamado via QR Code — ${equipamento.numero_equipamento || equipamento.modelo}`,
          body: `Olá, ${empresa?.nome || ''}!

Um chamado novo foi aberto escaneando o QR code de um equipamento, sem precisar de login:

Equipamento: ${equipamento.numero_equipamento || ''} (${equipamento.marca} ${equipamento.modelo})
Local: ${equipamento.estabelecimento_nome || equipamento.localizacao || 'não informado'}
Solicitante: ${nome_solicitante}${contato_solicitante ? ` — ${contato_solicitante}` : ''}

Descrição do problema:
${descricao}

Acesse o painel para triar e agendar o atendimento:
👉 https://geradordepmoc.com.br/Chamados

Atenciosamente,
ClimaPro`,
        });
      } catch (emailError) {
        console.error('[equipamento-abrir-chamado] falha ao enviar e-mail:', emailError);
      }
    }

    return new Response(JSON.stringify({ id: chamado.id, numero_chamado: chamado.numero_chamado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[equipamento-abrir-chamado] erro:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
