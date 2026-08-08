// Página pública do QR code de um equipamento — sem login. Sempre devolve os
// dados básicos (pra montar o menu "Abrir chamado" / "Ver histórico"); só
// devolve o histórico completo (checklist, fotos, assinaturas) quando o
// código de acesso do CLIENTE bate com o hash salvo em cliente.
// service_role só aqui dentro — nenhuma RLS anônima nova nas tabelas.
import bcrypt from 'npm:bcryptjs@2';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { equipamento_id, codigo_acesso } = await req.json();
    if (!equipamento_id) {
      return new Response(JSON.stringify({ error: 'equipamento_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: equipamento, error: equipamentoError } = await supabaseAdmin
      .from('equipamento')
      .select('id, empresa_id, cliente_id, numero_equipamento, tipo, marca, modelo, capacidade, localizacao, estabelecimento_nome, foto_url, periodicidade_pmoc, ultima_manutencao, proxima_manutencao')
      .eq('id', equipamento_id)
      .maybeSingle();
    if (equipamentoError) throw equipamentoError;
    if (!equipamento) {
      return new Response(JSON.stringify({ error: 'Equipamento não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: cliente }, { data: empresa }] = await Promise.all([
      supabaseAdmin.from('cliente').select('id, nome, senha_acesso_publico_hash').eq('id', equipamento.cliente_id).maybeSingle(),
      supabaseAdmin.from('empresa').select('nome, logo_url').eq('id', equipamento.empresa_id).maybeSingle(),
    ]);

    const resposta: Record<string, unknown> = {
      equipamento: {
        id: equipamento.id,
        numero_equipamento: equipamento.numero_equipamento,
        tipo: equipamento.tipo,
        marca: equipamento.marca,
        modelo: equipamento.modelo,
        capacidade: equipamento.capacidade,
        localizacao: equipamento.localizacao,
        estabelecimento_nome: equipamento.estabelecimento_nome,
        foto_url: equipamento.foto_url,
        periodicidade_pmoc: equipamento.periodicidade_pmoc,
        ultima_manutencao: equipamento.ultima_manutencao,
        proxima_manutencao: equipamento.proxima_manutencao,
      },
      cliente: { nome: cliente?.nome ?? null },
      empresa: { nome: empresa?.nome ?? 'ClimaPro', logo_url: empresa?.logo_url ?? null },
      requiresCode: true,
      historico: null,
    };

    if (!codigo_acesso || !cliente?.senha_acesso_publico_hash) {
      return new Response(JSON.stringify(resposta), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // O hash foi gerado no Postgres via pgcrypto (crypt/gen_salt('bf')) — é um
    // hash bcrypt padrão, compatível com a lib bcryptjs aqui no Deno. Evita
    // precisar de uma function nova no banco só pra comparar a senha.
    const senhaConfere = await bcrypt.compare(codigo_acesso, cliente.senha_acesso_publico_hash);
    if (!senhaConfere) {
      return new Response(JSON.stringify(resposta), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [chamadosDireto, chamadosArray, manutencoes] = await Promise.all([
      supabaseAdmin.from('chamado').select('id, numero_chamado, titulo, descricao, tipo_problema, data_abertura, data_finalizacao, tecnico_id, fotos_finalizacao, assinatura_cliente, nome_cliente_confirmacao, observacoes_tecnico').eq('equipamento_id', equipamento_id).eq('status', 'finalizado'),
      supabaseAdmin.from('chamado').select('id, numero_chamado, titulo, descricao, tipo_problema, data_abertura, data_finalizacao, tecnico_id, fotos_finalizacao, assinatura_cliente, nome_cliente_confirmacao, observacoes_tecnico').contains('equipamentos_ids', [equipamento_id]).eq('status', 'finalizado'),
      supabaseAdmin.from('manutencao_pmoc').select('id, data_execucao, tecnico_id, checklists_por_equipamento, fotos_por_equipamento, assinatura_tecnico, assinatura_cliente, nome_cliente_confirmacao').contains('equipamentos_ids', [equipamento_id]).eq('status', 'concluida'),
    ]);
    if (chamadosDireto.error) throw chamadosDireto.error;
    if (chamadosArray.error) throw chamadosArray.error;
    if (manutencoes.error) throw manutencoes.error;

    const chamadosPorId = new Map<string, Record<string, unknown>>();
    for (const c of [...(chamadosDireto.data ?? []), ...(chamadosArray.data ?? [])]) {
      chamadosPorId.set(c.id as string, c);
    }

    const tecnicoIds = new Set<string>();
    for (const c of chamadosPorId.values()) if (c.tecnico_id) tecnicoIds.add(c.tecnico_id as string);
    for (const m of manutencoes.data ?? []) if (m.tecnico_id) tecnicoIds.add(m.tecnico_id as string);

    const tecnicoPorId = new Map<string, string>();
    if (tecnicoIds.size > 0) {
      const { data: tecnicos } = await supabaseAdmin.from('tecnico').select('id, nome').in('id', [...tecnicoIds]);
      for (const t of tecnicos ?? []) tecnicoPorId.set(t.id as string, t.nome as string);
    }

    resposta.requiresCode = false;
    resposta.historico = {
      chamados: [...chamadosPorId.values()].map((c) => ({
        id: c.id,
        numero_chamado: c.numero_chamado,
        titulo: c.titulo,
        descricao: c.descricao,
        tipo_problema: c.tipo_problema,
        data_abertura: c.data_abertura,
        data_finalizacao: c.data_finalizacao,
        tecnico_nome: c.tecnico_id ? tecnicoPorId.get(c.tecnico_id as string) ?? null : null,
        fotos: c.fotos_finalizacao ?? [],
        assinatura_cliente: c.assinatura_cliente ?? null,
        nome_cliente_confirmacao: c.nome_cliente_confirmacao ?? null,
        observacoes_tecnico: c.observacoes_tecnico ?? null,
      })),
      manutencoesPmoc: (manutencoes.data ?? []).map((m) => ({
        id: m.id,
        data_execucao: m.data_execucao,
        tecnico_nome: m.tecnico_id ? tecnicoPorId.get(m.tecnico_id as string) ?? null : null,
        checklist: (m.checklists_por_equipamento as Record<string, unknown>)?.[equipamento_id] ?? [],
        fotos: (m.fotos_por_equipamento as Record<string, unknown>)?.[equipamento_id] ?? [],
        assinatura_tecnico: m.assinatura_tecnico ?? null,
        assinatura_cliente: m.assinatura_cliente ?? null,
        nome_cliente_confirmacao: m.nome_cliente_confirmacao ?? null,
      })),
    };

    return new Response(JSON.stringify(resposta), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[equipamento-publico] erro:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
