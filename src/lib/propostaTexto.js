import { classificarItem } from "@/lib/itensOrcamento";

// Monta o texto de abertura da proposta comercial a partir do que foi
// preenchido no orçamento. Nada aqui é salvo no banco: o texto é derivado na
// hora de exibir, então editar o orçamento reescreve a proposta junto.

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function dataPorExtenso(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).split('T')[0]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function plural(n, singular, pluralForma) {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

// "dois serviços e uma peça" — junta a lista com vírgulas e um "e" no fim,
// que é como se escreve, em vez de "serviços, peças".
function juntar(partes) {
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}

export function resumirEscopo(itens = []) {
  const contagem = { servico: 0, peca: 0, material: 0, outro: 0 };
  itens.forEach((item) => {
    contagem[classificarItem(item.descricao)] += 1;
  });

  const partes = [];
  if (contagem.servico) partes.push(plural(contagem.servico, 'serviço', 'serviços'));
  if (contagem.peca) partes.push(plural(contagem.peca, 'peça', 'peças'));
  if (contagem.material) partes.push(plural(contagem.material, 'item de material', 'itens de material'));
  if (contagem.outro) partes.push(plural(contagem.outro, 'item', 'itens'));

  return juntar(partes);
}

// Retorna os parágrafos da carta de apresentação, na ordem. O componente
// decide como renderizar (na tela e na impressão).
export function gerarTextoProposta({ empresa, cliente, orcamento }) {
  if (!orcamento) return [];

  const itens = orcamento.itens || [];
  const escopo = resumirEscopo(itens);
  const nomeEmpresa = empresa?.nome || 'nossa empresa';
  const total = moeda(orcamento.valor_total);

  const paragrafos = [];

  paragrafos.push(
    `Venho por meio desta apresentar a proposta comercial referente a ${orcamento.titulo}, ` +
    `elaborada por ${nomeEmpresa} a partir do levantamento técnico realizado` +
    `${cliente?.nome ? ` nas dependências de ${cliente.nome}` : ''}.`
  );

  if (escopo) {
    paragrafos.push(
      `O escopo contempla ${escopo}, discriminados no quadro abaixo, ` +
      `totalizando ${total}` +
      `${Number(orcamento.desconto) > 0 ? `, já considerado o desconto de ${moeda(orcamento.desconto)}` : ''}.`
    );
  } else {
    paragrafos.push(`O valor total da proposta é de ${total}.`);
  }

  if (orcamento.descricao?.trim()) {
    paragrafos.push(orcamento.descricao.trim());
  }

  const validade = dataPorExtenso(orcamento.validade_ate);
  paragrafos.push(
    validade
      ? `Esta proposta é válida até ${validade}. A execução será agendada em comum acordo após a aprovação.`
      : `A execução será agendada em comum acordo após a aprovação desta proposta.`
  );

  paragrafos.push(
    'Para aprovar, basta preencher seu nome e assinar no campo ao final desta página. ' +
    'Permanecemos à disposição para qualquer esclarecimento.'
  );

  return paragrafos;
}
