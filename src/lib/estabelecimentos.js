// Estabelecimentos do cliente, para filtrar equipamento por local.
//
// Um cliente como o Bento tem 15 endereços e 16 aparelhos. Sem filtro por
// local, achar "o split da Glória" é vasculhar a grade inteira.
//
// A lista não sai só de `cliente.estabelecimentos`: o equipamento guarda o
// nome do local em `estabelecimento_nome`, e esse texto nem sempre bate com um
// estabelecimento cadastrado (importação, cadastro antigo, nome digitado na
// mão). Então a lista é a união dos dois, senão some equipamento do filtro.

export const SEM_ESTABELECIMENTO = '__sem_estabelecimento__';

export function iconeEstabelecimento(nome) {
  const limpo = String(nome || '').trim().toLowerCase();
  if (limpo === 'casa') return '🏠';
  if (limpo === 'loja') return '🏪';
  if (limpo === 'escritório' || limpo === 'escritorio') return '🏢';
  if (limpo === 'trabalho') return '💼';
  if (limpo === 'empresa') return '🏭';
  return '📍';
}

const nomeDoLocal = (equipamento) => String(equipamento?.estabelecimento_nome || '').trim();

// Lista para os botões de filtro, com a contagem de equipamentos de cada um.
// Ordena pelos que têm mais aparelhos: é onde a pessoa procura primeiro.
export function listarEstabelecimentos(cliente, equipamentos = []) {
  const porNome = new Map();

  for (const est of cliente?.estabelecimentos || []) {
    const nome = String(est?.nome || '').trim();
    if (!nome) continue;
    porNome.set(nome, { nome, endereco: est.endereco || '', quantidade: 0 });
  }

  let semLocal = 0;
  for (const equipamento of equipamentos) {
    const nome = nomeDoLocal(equipamento);
    if (!nome) {
      semLocal += 1;
      continue;
    }
    const atual = porNome.get(nome);
    if (atual) atual.quantidade += 1;
    // Local que existe no equipamento mas não na ficha do cliente entra assim
    // mesmo; esconder deixaria o aparelho fora de qualquer filtro.
    else porNome.set(nome, { nome, endereco: '', quantidade: 1 });
  }

  const lista = [...porNome.values()].sort(
    (a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR')
  );

  if (semLocal > 0) {
    lista.push({ nome: SEM_ESTABELECIMENTO, rotulo: 'Sem local informado', endereco: '', quantidade: semLocal });
  }

  return lista;
}

export function filtrarPorEstabelecimento(equipamentos = [], nome) {
  if (!nome) return equipamentos;
  if (nome === SEM_ESTABELECIMENTO) return equipamentos.filter((e) => !nomeDoLocal(e));
  return equipamentos.filter((e) => nomeDoLocal(e) === nome);
}

export function rotuloDoEstabelecimento(item) {
  if (!item) return '';
  return item.rotulo || item.nome;
}
