import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { LABEL_PERIODICIDADE, gerarCronogramaAnual } from "@/lib/pmocChecklist";
import { sincronizarAgendaAnualPMOC } from "@/lib/pmocAgenda";

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// O Plano Anual de Manutenção exigido pela Portaria GM 3.523 / NBR 16401 —
// cronograma dos 12 meses do ano-calendário para todos os equipamentos ativos
// no PMOC do cliente, marcando quando cada um tem só a checagem mensal e
// quando soma o ciclo profundo próprio dele. Ao abrir, também sincroniza a
// Agenda com as próximas 12 visitas (é o "gerar automaticamente" pedido —
// documento e agenda nascem juntos, sem precisar recriar nada manualmente).
export default function PlanoAnualPMOC({ cliente, equipamentos, empresaId, pmocId, onClose }) {
  const [gerando, setGerando] = useState(false);
  const [statusAgenda, setStatusAgenda] = useState('sincronizando');
  const ano = new Date().getFullYear();

  useEffect(() => {
    const sincronizar = async () => {
      try {
        const resultado = await sincronizarAgendaAnualPMOC({
          empresaId,
          cliente,
          pmocId,
          equipamentosAtivos: equipamentos,
        });
        setStatusAgenda(`ok:${resultado.criados}`);
      } catch (error) {
        console.error("Erro ao sincronizar agenda anual do PMOC:", error);
        setStatusAgenda('erro');
        toast({ description: "⚠️ Plano gerado, mas não foi possível sincronizar a Agenda.", variant: "destructive" });
      }
    };
    sincronizar();
  }, [cliente, empresaId, pmocId, equipamentos]);

  const gerarDocumento = () => {
    setGerando(true);
    try {
      const linhas = equipamentos
        .map((eq) => {
          const cronograma = gerarCronogramaAnual(eq, ano);
          const celulas = cronograma
            .map((m) => `<td class="${m.cicloProfundo ? 'ciclo-profundo' : 'mensal'}">${m.cicloProfundo ? '●' : '○'}</td>`)
            .join('');
          return `
            <tr>
              <td class="equip-nome">${eq.numero_equipamento || '—'}<br/><span class="muted">${eq.marca} ${eq.modelo}</span></td>
              <td style="text-transform:capitalize;">${LABEL_PERIODICIDADE[eq.periodicidade_pmoc] || '—'}</td>
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
  td.ciclo-profundo { color: #7c3aed; font-weight: bold; font-size: 16px; }
  td.mensal { color: #9ca3af; font-size: 14px; }
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
        <th>Periodicidade</th>
        ${MESES_ABREV.map((m) => `<th>${m}</th>`).join('')}
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>

  <div class="legenda">
    <span>● Ciclo profundo (troca de gás, teste elétrico, etc.)</span>
    <span>○ Checagem mensal básica (filtros, inspeção, drenos)</span>
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
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-purple-600" />
              Plano Anual de Manutenção {ano}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Cronograma do ano inteiro para os {equipamentos.length} equipamento(s) de{' '}
            <strong>{cliente.nome}</strong> — checagem mensal em todos os meses + ciclo profundo
            destacado nos meses em que vence para cada equipamento, conforme exigido para
            fiscalização.
          </p>
          <p className="text-sm text-foreground">
            {statusAgenda === 'sincronizando' && 'Sincronizando a Agenda com as próximas 12 visitas...'}
            {statusAgenda.startsWith('ok:') && (
              `✅ Agenda sincronizada (${statusAgenda.split(':')[1]} evento(s) novo(s) criado(s)).`
            )}
            {statusAgenda === 'erro' && '⚠️ Não foi possível sincronizar a Agenda automaticamente.'}
          </p>
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={gerarDocumento}
            disabled={gerando}
          >
            <Download className="w-4 h-4 mr-2" />
            {gerando ? 'Gerando...' : 'Gerar e Baixar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
