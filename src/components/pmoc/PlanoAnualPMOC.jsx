import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, CalendarRange, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { LABEL_PERIODICIDADE, PERIODICIDADES_PMOC, gerarCronogramaAnual, ancoraParaEscolha } from "@/lib/pmocChecklist";
import { sincronizarAgendaAnualPMOC } from "@/lib/pmocAgenda";

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// O Plano Anual de Manutenção exigido pela Portaria GM 3.523 / NBR 16401 —
// cronograma dos 12 meses do ano-calendário para todos os equipamentos ativos
// no PMOC do cliente. É gerado 100% automaticamente a partir da periodicidade
// de cada equipamento, mas nada aqui fica travado: dá pra trocar a
// periodicidade ou forçar/desmarcar o ciclo profundo de um mês específico
// direto nesta tela, sem sair dela. Ao abrir, também sincroniza a Agenda com
// as próximas 12 visitas — documento e agenda nascem juntos.
export default function PlanoAnualPMOC({ cliente, equipamentos, empresaId, pmocId, onClose, onExecutar }) {
  const [gerando, setGerando] = useState(false);
  const [statusAgenda, setStatusAgenda] = useState('sincronizando');
  const [equipamentosState, setEquipamentosState] = useState(equipamentos);
  const ano = new Date().getFullYear();
  const queryClient = useQueryClient();

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
            .map((m) => `<td class="${m.cicloProfundo ? 'ciclo-profundo' : 'mensal'}">${LABEL_PERIODICIDADE[m.periodicidade]}</td>`)
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
  body { font-family: Arial, sans-serif; padding: 30px; color: #1f2937; }
  .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { color: #6b21a8; margin: 0 0 6px 0; }
  .header p { color: #6b7280; font-size: 13px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 6px; text-align: center; }
  th { background: #f3f4f6; }
  td.equip-nome { text-align: left; font-weight: 600; }
  td.equip-nome .muted { font-weight: 400; color: #6b7280; font-size: 11px; }
  td.ciclo-profundo { color: #6b21a8; font-weight: bold; background: #f3e8ff; }
  td.mensal { color: #9ca3af; }
  .legenda { margin-top: 16px; font-size: 12px; color: #4b5563; display: flex; gap: 24px; }
  .legenda span { display: inline-flex; align-items: center; gap: 6px; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
</style>
</head>
<body>
  <div class="header">
    <h1>📅 Plano Anual de Manutenção ${ano}</h1>
    <p>Cliente: <strong>${cliente.nome}</strong> — ${cliente.endereco || ''}</p>
    <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} conforme Portaria GM nº 3.523/98 e NBR 16401.</p>
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
    <span>Destacado = ciclo profundo daquele mês (troca de gás, teste elétrico, etc.)</span>
    <span>Mensal = checagem básica (filtros, inspeção, drenos)</span>
  </div>

  <div class="footer">
    Documento gerado automaticamente pelo ClimaPro — Sistema de Gestão de Manutenção
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
      }
      toast({ description: '✅ Plano Anual gerado! Use Ctrl+P para salvar como PDF.', variant: "success" });
    } catch (error) {
      console.error("Erro ao gerar plano anual:", error);
      toast({ description: "❌ Erro ao gerar o plano. Tente novamente.", variant: "destructive" });
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50 shrink-0">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-purple-600" />
              Plano Anual de Manutenção {ano} — {cliente.nome}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Plano completo gerado automaticamente: todos os níveis rodam juntos — mensal todo mês,
            bimestral a cada 2, trimestral a cada 3, semestral a cada 6 e anual 1x/ano — e cada mês
            já vem pré-preenchido com o ciclo mais profundo que vence nele. Escolher uma
            periodicidade num mês reposiciona o calendário inteiro (ex: Trimestral em Março →
            Fevereiro/Abril bimestrais, Junho semestral, Dezembro anual, tudo sozinho). Clique no
            rótulo do mês para executar a manutenção.
          </p>

          <div className="flex items-center gap-3 text-sm">
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

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-2 font-medium">Equipamento</th>
                  {MESES_ABREV.map((m) => (
                    <th key={m} className="p-2 font-medium text-center">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipamentosState.map((eq) => {
                  const cronograma = gerarCronogramaAnual(eq, ano);
                  return (
                    <tr key={eq.id} className="border-t">
                      <td className="p-2">
                        <p className="font-medium text-foreground">{eq.numero_equipamento || '—'}</p>
                        <p className="text-xs text-muted-foreground">{eq.marca} {eq.modelo}</p>
                      </td>
                      {cronograma.map((m, idx) => (
                        <td key={m.mes} className="p-1 text-center align-top">
                          <button
                            type="button"
                            title="Clique para executar a manutenção deste mês"
                            onClick={() => onExecutar()}
                            className={`w-full min-w-[76px] rounded px-1.5 py-1.5 text-[10px] font-semibold leading-tight capitalize transition-colors ${
                              m.cicloProfundo
                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                            }`}
                          >
                            {LABEL_PERIODICIDADE[m.periodicidade]}
                          </button>
                          <select
                            value={m.periodicidade}
                            onChange={(e) => ancorarPeriodicidadeNoMes(eq, idx, e.target.value)}
                            disabled={updateEquipamentoMutation.isPending}
                            title="Definir a periodicidade a partir deste mês (redefine o ano inteiro)"
                            className="mt-1 w-full min-w-[76px] h-6 rounded border border-input bg-white text-[9px] px-1 capitalize"
                          >
                            {PERIODICIDADES_PMOC.map((p) => (
                              <option key={p} value={p}>{LABEL_PERIODICIDADE[p]}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 inline-block border border-purple-300" /> Ciclo profundo (clique no rótulo para executar)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted inline-block border" /> Checagem mensal</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-input bg-white inline-block" /> Seletor = redefine a periodicidade a partir daquele mês</span>
          </div>

          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={gerarDocumento}
            disabled={gerando}
          >
            <Download className="w-4 h-4 mr-2" />
            {gerando ? 'Gerando...' : 'Gerar e Baixar PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
