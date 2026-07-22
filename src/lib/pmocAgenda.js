import { base44 } from "@/api/base44Client";
import { gerarProximasVisitas } from "@/lib/pmocChecklist";

const MESES_JANELA = 12;
const DIA_PLACEHOLDER = 10; // dia arbitrário do mês para a visita ainda não agendada por horário exato

function chaveAnoMes(data) {
  const d = new Date(data);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

// Garante que a Agenda tenha, para este cliente, um evento de PMOC para cada
// um dos próximos 12 meses — é o "plano anual automático" que a norma espera
// (checagem mensal em todo mês + ciclo profundo destacado nos meses em que
// vence para algum equipamento). Idempotente: nunca duplica um mês que já
// tem evento (de qualquer status) nem mexe em eventos já confirmados/
// concluídos pelo técnico — só recria os placeholders futuros ainda
// pendentes, para refletir mudanças recentes de periodicidade.
export async function sincronizarAgendaAnualPMOC({ empresaId, cliente, pmocId, equipamentosAtivos }) {
  if (!equipamentosAtivos || equipamentosAtivos.length === 0) return { criados: 0 };

  const hoje = new Date();
  const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const eventosExistentes = await base44.entities.AgendaEvento.filter({
    cliente_id: cliente.id,
    tipo: 'pmoc',
    origem: 'automatico',
  });

  const mesesCobertos = new Set();
  const paraExcluir = [];
  for (const ev of eventosExistentes) {
    const dataEv = new Date(ev.data_inicio);
    const pendenteFuturo = dataEv >= inicioMesAtual && ev.status !== 'concluido' && ev.status !== 'confirmado';
    if (pendenteFuturo) {
      paraExcluir.push(ev.id);
    } else {
      mesesCobertos.add(chaveAnoMes(dataEv));
    }
  }

  if (paraExcluir.length > 0) {
    await Promise.all(paraExcluir.map((id) => base44.entities.AgendaEvento.delete(id)));
  }

  const novosEventos = [];
  for (let i = 0; i < MESES_JANELA; i++) {
    const dataVisita = new Date(inicioMesAtual.getFullYear(), inicioMesAtual.getMonth() + i, DIA_PLACEHOLDER);
    if (mesesCobertos.has(chaveAnoMes(dataVisita))) continue;

    const equipamentosCicloProfundo = equipamentosAtivos.filter((eq) => {
      const [primeiraVisita] = gerarProximasVisitas(eq, 1, dataVisita);
      return primeiraVisita?.cicloProfundo;
    });

    const titulo = equipamentosCicloProfundo.length > 0
      ? `PMOC — Checagem Mensal + Ciclo Profundo (${equipamentosCicloProfundo.length} equip.) — ${cliente.nome}`
      : `PMOC — Checagem Mensal — ${cliente.nome}`;

    novosEventos.push({
      empresa_id: empresaId,
      pmoc_id: pmocId || null,
      cliente_id: cliente.id,
      titulo,
      descricao: equipamentosCicloProfundo.length > 0
        ? `Ciclo profundo devido em: ${equipamentosCicloProfundo.map((e) => e.numero_equipamento).join(', ')}`
        : 'Checagem mensal básica (filtros, inspeção, drenos) em todos os equipamentos ativos no PMOC.',
      tipo: 'pmoc',
      origem: 'automatico',
      data_inicio: dataVisita.toISOString(),
      data_fim: new Date(dataVisita.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      endereco: cliente.endereco || '',
      latitude: cliente.latitude,
      longitude: cliente.longitude,
      status: 'pendente',
      cor: '#9333ea',
      recorrente: true,
      frequencia_recorrencia: 'mensal',
    });
  }

  if (novosEventos.length > 0) {
    await base44.entities.AgendaEvento.bulkCreate(novosEventos);
  }

  return { criados: novosEventos.length };
}
