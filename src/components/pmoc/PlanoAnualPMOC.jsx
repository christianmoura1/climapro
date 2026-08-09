import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, CalendarRange, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { LABEL_PERIODICIDADE, gerarCronogramaAnual, ancoraParaEscolha } from "@/lib/pmocChecklist";
import { sincronizarAgendaAnualPMOC } from "@/lib/pmocAgenda";
import { chaveMes, indexarAgendamentos, visitasDoAno } from "@/lib/pmocDataVisita";
import CronogramaAnualGrid, { MESES_ABREV } from "./CronogramaAnualGrid";
import AgendarVisitaPMOC from "./AgendarVisitaPMOC";

// Plano anual de manutenção: cronograma dos 12 meses do ano-calendário
// para todos os equipamentos ativos
// no PMOC do cliente. É gerado 100% automaticamente a partir da periodicidade
// de cada equipamento, mas nada aqui fica travado: dá pra trocar a
// periodicidade ou forçar/desmarcar o ciclo profundo de um mês específico
// direto nesta tela, sem sair dela. Ao abrir, também sincroniza a Agenda com
// as próximas 12 visitas — documento e agenda nascem juntos.
export default function PlanoAnualPMOC({ cliente, equipamentos, empresaId, pmocId, onClose }) {
  const [gerando, setGerando] = useState(false);
  const [statusAgenda, setStatusAgenda] = useState('sincronizando');
  const [equipamentosState, setEquipamentosState] = useState(equipamentos);
  const [empresa, setEmpresa] = useState(null);
  const [remarcandoMes, setRemarcandoMes] = useState(null);
  const ano = new Date().getFullYear();
  const queryClient = useQueryClient();

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['pmoc-agendamentos', cliente?.id],
    queryFn: () => base44.entities.PmocAgendamento.filter({ cliente_id: cliente.id }),
    enabled: !!cliente?.id,
  });
  const indiceAgendamentos = indexarAgendamentos(agendamentos);
  const visitas = visitasDoAno(cliente, ano, indiceAgendamentos);

  useEffect(() => {
    if (!empresaId) return;
    base44.entities.Empresa.get(empresaId).then(setEmpresa).catch(() => setEmpresa(null));
  }, [empresaId]);

  useEffect(() => {
    setEquipamentosState(equipamentos);
  }, [equipamentos]);

  const updateEquipamentoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipamento.update(id, data),
    onSuccess: (atualizado) => {
      setEquipamentosState((prev) => prev.map((eq) => (eq.id === atualizado.id ? atualizado : eq)));
      queryClient.invalidateQueries(['equipamentos']);
    },
    onError: (error) => {
      console.error("Erro ao atualizar equipamento:", error);
      toast({ description: `❌ Erro ao salvar: ${error.message || 'tente novamente.'}`, variant: "destructive" });
    }
  });

  const sincronizarAgenda = async () => {
    setStatusAgenda('sincronizando');
    try {
      const resultado = await sincronizarAgendaAnualPMOC({
        empresaId,
        cliente,
        pmocId,
        equipamentosAtivos: equipamentosState,
      });
      setStatusAgenda(`ok:${resultado.criados}`);
      queryClient.invalidateQueries(['agenda-eventos']);
    } catch (error) {
      console.error("Erro ao sincronizar agenda anual do PMOC:", error);
      setStatusAgenda('erro');
      toast({ description: "⚠️ Não foi possível sincronizar a Agenda.", variant: "destructive" });
    }
  };

  useEffect(() => {
    sincronizarAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, empresaId, pmocId]);

  // Escolher uma periodicidade num mês redefine a periodicidade-base do
  // equipamento com aquele mês como âncora — os outros 11 meses recalculam
  // sozinhos a partir daí (Março = trimestral também acerta Junho, Setembro
  // e Dezembro automaticamente, sem precisar tocar em cada um).
  const ancorarPeriodicidadeNoMes = (equipamento, mesIndex0, novaPeriodicidade) => {
    updateEquipamentoMutation.mutate({
      id: equipamento.id,
      data: {
        periodicidade_pmoc: novaPeriodicidade,
        ciclo_ancora_pmoc: ancoraParaEscolha(ano, mesIndex0, novaPeriodicidade),
      },
    });
  };

  const gerarDocumento = () => {
    setGerando(true);
    try {
      const linhas = equipamentosState
        .map((eq) => {
          const cronograma = gerarCronogramaAnual(eq, ano);
          const celulas = cronograma
            .map((m, idx) => {
              const visita = visitas[idx];
              const dia = visita ? `<span class="dia">${String(visita.data.getDate()).padStart(2, '0')}/${String(visita.data.getMonth() + 1).padStart(2, '0')}</span>` : '';
              return `<td class="${m.cicloProfundo ? 'ciclo-profundo' : 'mensal'}">${LABEL_PERIODICIDADE[m.periodicidade]}${dia}</td>`;
            })
            .join('');
          return `
            <tr>
              <td class="equip-nome">${eq.numero_equipamento || '—'}<br/><span class="muted">${eq.marca} ${eq.modelo}</span></td>
              ${celulas}
            </tr>`;
        })
        .join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Plano Anual de Manutenção ${ano} — ${cliente.nome}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4 landscape; margin: 14mm 12mm 16mm; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #172033; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header { display: grid; grid-template-columns: 72px 1fr auto; gap: 16px; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 14px; margin-bottom: 18px; }
  .logo-wrap { width: 72px; height: 54px; display: flex; align-items: center; justify-content: center; }
  .logo { max-width: 72px; max-height: 54px; object-fit: contain; }
  .logo-fallback { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 12px; background: #2563eb; color: white; font-weight: 800; }
  .header-copy { text-align: left; }
  .header h1 { color: #172033; margin: 2px 0 5px; font-size: 22px; }
  .header p { color: #596579; font-size: 10px; margin: 2px 0; }
  .kicker { color: #2563eb !important; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; }
  .doc-code { align-self: start; border: 1px solid #bfdbfe; border-radius: 8px; padding: 7px 9px; color: #1d4ed8; font-size: 9px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #d7deea; padding: 6px 4px; text-align: center; }
  th { background: #eaf2ff; color: #24324a; }
  td.equip-nome { text-align: left; font-weight: 600; }
  td.equip-nome .muted { font-weight: 400; color: #6b7280; font-size: 8.5px; }
  td.ciclo-profundo { color: #6b21a8; font-weight: bold; background: #f3e8ff; }
  td.mensal { color: #64748b; }
  td .dia { display: block; margin-top: 2px; font-weight: 700; font-size: 8.5px; color: #1d4ed8; }
  .legenda { margin-top: 12px; font-size: 9px; color: #4b5563; display: flex; gap: 20px; }
  .legenda span { display: inline-flex; align-items: center; gap: 6px; }
  .footer { position: fixed; left: 0; right: 0; bottom: -11mm; display: flex; justify-content: space-between; border-top: 1px solid #d7deea; padding-top: 4px; color: #6b7280; font-size: 8px; }
  .page-number::after { content: "Página " counter(page); }
  @media screen { body { padding: 24px; } .footer { position: static; margin-top: 24px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-wrap">${empresa?.logo_url ? `<img src="${empresa.logo_url}" class="logo" alt="Logo da empresa" />` : '<div class="logo-fallback">CP</div>'}</div>
    <div class="header-copy">
      <p class="kicker">Plano operacional de manutenção</p>
      <h1>Plano Anual de Manutenção ${ano}</h1>
      ${empresa ? `<p><strong>${empresa.nome}</strong>${empresa.cnpj ? ` · CNPJ ${empresa.cnpj}` : ''}</p>` : ''}
      <p>Cliente: <strong>${cliente.nome}</strong>${cliente.endereco ? ` · ${cliente.endereco}` : ''}</p>
      ${empresa?.responsavel_tecnico_nome ? `<p>Responsável técnico informado: <strong>${empresa.responsavel_tecnico_nome}</strong>${empresa.responsavel_tecnico_registro ? ` · ${empresa.responsavel_tecnico_registro}` : ''}</p>` : ''}
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}. O conteúdo reflete os dados cadastrados no ClimaPro.</p>
    </div>
    <div class="doc-code">PLANO ${ano}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Equipamento</th>
        ${MESES_ABREV.map((m) => `<th>${m}</th>`).join('')}
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>

  <div class="legenda">
    <span>Destacado = ciclo com atividades adicionais naquele mês</span>
    <span>Mensal = checagem básica (filtros, inspeção, drenos)</span>
    <span>A data sob cada mês é o dia previsto da visita.</span>
  </div>

  <div class="footer">
    <span>ClimaPro · Plano Anual de Manutenção · ${cliente.nome}</span><span class="page-number"></span>
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 500);
        };
        printWindow.onafterprint = () => URL.revokeObjectURL(url);
        toast({ description: 'Documento aberto. Na caixa de impressão, escolha “Salvar como PDF”.', variant: "success" });
      } else {
        URL.revokeObjectURL(url);
        toast({ description: 'O navegador bloqueou a janela de impressão. Libere pop-ups e tente novamente.', variant: "destructive" });
        return;
      }
    } catch (error) {
      console.error("Erro ao gerar plano anual:", error);
      toast({ description: "❌ Erro ao gerar o plano. Tente novamente.", variant: "destructive" });
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="plano-anual-title">
      <Card className="flex max-h-[100dvh] w-full max-w-6xl flex-col rounded-b-none rounded-t-2xl sm:max-h-[90vh] sm:rounded-xl">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle id="plano-anual-title" className="flex items-start gap-2 text-lg sm:text-xl">
              <CalendarRange className="w-5 h-5 text-purple-600" />
              Plano Anual de Manutenção {ano} — {cliente.nome}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar plano anual">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto p-4 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Plano completo gerado automaticamente: mensal todo mês, trimestral a cada 3, semestral
            a cada 6 e anual 1x/ano — cada mês já vem pré-preenchido com o ciclo mais profundo que
            vence nele. Clique num mês para alterar o plano; o calendário inteiro se reposiciona
            sozinho a partir dali.
          </p>

          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-foreground">
              {statusAgenda === 'sincronizando' && 'Sincronizando a Agenda com as próximas 12 visitas...'}
              {statusAgenda.startsWith('ok:') && `✅ Agenda sincronizada (${statusAgenda.split(':')[1]} evento(s) novo(s)).`}
              {statusAgenda === 'erro' && '⚠️ Não foi possível sincronizar a Agenda automaticamente.'}
            </span>
            <Button variant="outline" size="sm" onClick={sincronizarAgenda} disabled={statusAgenda === 'sincronizando'}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Ressincronizar
            </Button>
          </div>

          <CronogramaAnualGrid
            equipamentos={equipamentosState}
            ano={ano}
            onAncorar={ancorarPeriodicidadeNoMes}
            salvando={updateEquipamentoMutation.isPending}
            visitas={visitas}
            onAlterarData={(mes0) => setRemarcandoMes({ ano, mes0 })}
          />

          <Button
            className="min-h-12 w-full bg-purple-600 hover:bg-purple-700"
            onClick={gerarDocumento}
            disabled={gerando}
          >
            <Download className="w-4 h-4 mr-2" />
            {gerando ? 'Preparando documento...' : 'Abrir versão para impressão'}
          </Button>
        </CardContent>
      </Card>

      {remarcandoMes && (
        <AgendarVisitaPMOC
          cliente={cliente}
          ano={remarcandoMes.ano}
          mes0={remarcandoMes.mes0}
          agendamento={indiceAgendamentos[chaveMes(remarcandoMes.ano, remarcandoMes.mes0)] || null}
          empresaId={empresaId}
          onClose={() => {
            setRemarcandoMes(null);
            // A Agenda guarda os eventos com a data antiga; sem ressincronizar,
            // o técnico continuaria vendo a visita no dia que foi remarcado.
            sincronizarAgenda();
          }}
        />
      )}
    </div>
  );
}
