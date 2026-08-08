// Leitura pública de um orçamento pelo token do link enviado ao cliente.
// Sem login: quem recebe o link não tem conta no sistema.
//
// As dependências ficam inline de propósito: as functions daqui são publicadas
// uma a uma (inclusive via MCP do Supabase), e importar de ../_shared deixaria
// o que está em produção diferente do que está no repositório.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token) return json({ error: 'token é obrigatório' }, 400);

    const { data: orcamento, error } = await supabaseAdmin
      .from('orcamento')
      .select('id, empresa_id, cliente_id, numero_orcamento, titulo, descricao, itens, valor_total, desconto, validade_ate, status, data_envio, data_resposta, nome_aprovador, motivo_recusa, observacoes')
      .eq('token_publico', token)
      .maybeSingle();
    if (error) throw error;
    if (!orcamento) return json({ error: 'Orçamento não encontrado' }, 404);

    // Rascunho ainda não foi enviado ao cliente: o link não deve valer.
    if (orcamento.status === 'rascunho' || orcamento.status === 'cancelado') {
      return json({ error: 'Este orçamento não está disponível' }, 404);
    }

    const [{ data: cliente }, { data: empresa }] = await Promise.all([
      supabaseAdmin.from('cliente').select('nome').eq('id', orcamento.cliente_id).maybeSingle(),
      supabaseAdmin.from('empresa').select('nome, logo_url, telefone, email_contato, cnpj, endereco').eq('id', orcamento.empresa_id).maybeSingle(),
    ]);

    const hoje = new Date().toISOString().split('T')[0];
    const vencido = !!orcamento.validade_ate && orcamento.validade_ate < hoje;
    const statusEfetivo = orcamento.status === 'enviado' && vencido ? 'expirado' : orcamento.status;

    return json({
      orcamento: {
        numero_orcamento: orcamento.numero_orcamento,
        titulo: orcamento.titulo,
        descricao: orcamento.descricao,
        itens: orcamento.itens ?? [],
        valor_total: orcamento.valor_total,
        desconto: orcamento.desconto,
        validade_ate: orcamento.validade_ate,
        observacoes: orcamento.observacoes,
        status: statusEfetivo,
        data_envio: orcamento.data_envio,
        data_resposta: orcamento.data_resposta,
        nome_aprovador: orcamento.nome_aprovador,
        motivo_recusa: orcamento.motivo_recusa,
      },
      cliente: { nome: cliente?.nome ?? null },
      empresa: {
        nome: empresa?.nome ?? 'ClimaPro',
        logo_url: empresa?.logo_url ?? null,
        telefone: empresa?.telefone ?? null,
        email_contato: empresa?.email_contato ?? null,
        // Cabeçalho da proposta: a página só mostra estes se vierem
        // preenchidos, então a versão antiga da function continua funcionando.
        cnpj: empresa?.cnpj ?? null,
        endereco: empresa?.endereco ?? null,
      },
      podeResponder: statusEfetivo === 'enviado',
    });
  } catch (error) {
    console.error('[orcamento-publico] erro:', error);
    return json({ error: String(error) }, 500);
  }
});
