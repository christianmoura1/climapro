import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { LABEL_PERIODICIDADE, statusManutencao, STATUS_MANUTENCAO_CONFIG } from "@/lib/pmocChecklist";

// "Livro de Registro de Manutenção" consolidado do cliente — a comprovação
// que a Portaria GM 3.523 / NBR 16401 exigem manter disponível para
// fiscalização: resumo do estado atual de todos os equipamentos + histórico
// cronológico completo de execuções (checklist, fotos, assinatura de cada
// uma), num único documento. Mesma técnica HTML + impressão já usada no
// resto do app — sem introduzir dependência nova de geração de PDF.
export default function CadernoManutencaoPDF({ cliente, equipamentos, onClose }) {
  const [empresa, setEmpresa] = useState(null);
  const [execucoes, setExecucoes] = useState(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        const user = await base44.auth.me();
        const [empresas, historico] = await Promise.all([
          base44.entities.Empresa.list(),
          base44.entities.ManutencaoPMOC.filter({ cliente_id: cliente.id, status: 'concluida' }, '-data_execucao'),
        ]);
        setEmpresa(empresas.find((e) => e.id === user.empresa_id) || null);
        setExecucoes(historico);
      } catch (error) {
        console.error("Erro ao carregar caderno de manutenção:", error);
        toast({ description: "❌ Erro ao carregar histórico de manutenções.", variant: "destructive" });
      }
    };
    carregar();
  }, [cliente.id]);

  const gerarDocumento = () => {
    setGerando(true);
    try {
      const equipamentoPorId = Object.fromEntries(equipamentos.map((eq) => [eq.id, eq]));

      const linhasResumo = equipamentos
        .map((eq) => {
          const status = statusManutencao(eq.proxima_manutencao);
          return `
            <tr>
              <td>${eq.numero_equipamento || '—'}</td>
              <td>${eq.marca} ${eq.modelo}</td>
              <td style="text-transform:capitalize;">${LABEL_PERIODICIDADE[eq.periodicidade_pmoc] || '—'}</td>
              <td>${eq.ultima_manutencao ? format(new Date(eq.ultima_manutencao), "dd/MM/yyyy", { locale: ptBR }) : 'Nunca'}</td>
              <td>${eq.proxima_manutencao ? format(new Date(eq.proxima_manutencao), "dd/MM/yyyy", { locale: ptBR }) : '—'}</td>
              <td>${STATUS_MANUTENCAO_CONFIG[status].label}</td>
            </tr>`;
        })
        .join('');

      const blocosHistorico = (execucoes || [])
        .map((exec, idx) => {
          const equipamentosDaExecucao = (exec.equipamentos_ids || [])
            .map((id) => equipamentoPorId[id])
            .filter(Boolean);
          const blocosEquipamento = equipamentosDaExecucao
            .map((eq) => {
              const checklist = exec.checklists_por_equipamento?.[eq.id] || [];
              const fotos = exec.fotos_por_equipamento?.[eq.id] || [];
              return `
                <div class="equipment-section">
                  <h4>${eq.numero_equipamento || ''} — ${eq.marca} ${eq.modelo}</h4>
                  <ul class="checklist">
                    ${checklist.map((item) => `<li>${item.concluido ? '✅' : '⚠️'} ${item.descricao}${item.observacao ? ` — <em>${item.observacao}</em>` : ''}</li>`).join('')}
                  </ul>
                  ${fotos.length > 0 ? `<div class="fotos-grid">${fotos.map((url) => `<img src="${url}" />`).join('')}</div>` : ''}
                </div>`;
            })
            .join('');

          return `
            <div class="execucao">
              <h3>Execução ${idx + 1} — ${format(new Date(exec.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</h3>
              <p class="meta">Responsável no local: ${exec.nome_cliente_confirmacao || exec.nome_responsavel_local || 'não informado'} • Aprovado em: ${exec.data_aprovacao_empresa ? format(new Date(exec.data_aprovacao_empresa), "dd/MM/yyyy", { locale: ptBR }) : '—'}</p>
              ${blocosEquipamento}
              ${(exec.assinatura_tecnico || exec.assinatura_cliente) ? `
                <div style="display:flex; gap:20px; justify-content:center;">
                  ${exec.assinatura_tecnico ? `<div class="assinatura"><img src="${exec.assinatura_tecnico}" /><p>${exec.nome_responsavel_local || 'Técnico'}</p></div>` : ''}
                  ${exec.assinatura_cliente ? `<div class="assinatura"><img src="${exec.assinatura_cliente}" /><p>${exec.nome_cliente_confirmacao || 'Cliente'}</p></div>` : ''}
                </div>
              ` : ''}
            </div>`;
        })
        .join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Caderno de Manutenção — ${cliente.nome}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 30px; color: #1f2937; }
  .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { color: #6b21a8; margin: 0 0 6px 0; }
  .header p { color: #6b7280; font-size: 13px; margin: 2px 0; }
  h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 36px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
  th { background: #f3f4f6; }
  .execucao { margin-top: 28px; padding: 18px; background: #f9fafb; border-radius: 8px; page-break-inside: avoid; }
  .execucao h3 { color: #6b21a8; margin: 0 0 4px 0; }
  .meta { color: #6b7280; font-size: 12px; margin: 0 0 12px 0; }
  .equipment-section { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin: 10px 0; }
  .equipment-section h4 { margin: 0 0 8px 0; color: #4338ca; }
  .checklist { margin: 0; padding-left: 18px; }
  .checklist li { margin: 4px 0; font-size: 13px; }
  .fotos-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
  .fotos-grid img { width: 100%; height: 90px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; }
  .assinatura { text-align: center; margin-top: 12px; }
  .assinatura img { max-width: 250px; border: 1px solid #e5e7eb; border-radius: 4px; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  @media print { .execucao, .equipment-section { page-break-inside: avoid; } }
</style>
</head>
<body>
  <div class="header">
    <h1>📖 Caderno de Manutenção — Livro de Registro PMOC</h1>
    <p><strong>${empresa?.nome || ''}</strong>${empresa?.cnpj ? ` — CNPJ ${empresa.cnpj}` : ''}</p>
    <p>Cliente: <strong>${cliente.nome}</strong> — ${cliente.endereco || ''}</p>
    <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — disponível para fiscalização a qualquer momento.</p>
  </div>

  <h2>Resumo dos Equipamentos (${equipamentos.length})</h2>
  <table>
    <thead>
      <tr><th>Equipamento</th><th>Marca/Modelo</th><th>Periodicidade</th><th>Última manutenção</th><th>Próxima manutenção</th><th>Status</th></tr>
    </thead>
    <tbody>${linhasResumo}</tbody>
  </table>

  <h2>Histórico de Execuções (${(execucoes || []).length})</h2>
  ${blocosHistorico || '<p style="color:#9ca3af;">Nenhuma manutenção concluída ainda.</p>'}

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
      toast({ description: '✅ Caderno gerado! Use Ctrl+P para salvar como PDF.', variant: "success" });
    } catch (error) {
      console.error("Erro ao gerar caderno:", error);
      toast({ description: "❌ Erro ao gerar o caderno. Tente novamente.", variant: "destructive" });
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
              <BookOpen className="w-5 h-5 text-purple-600" />
              Caderno de Manutenção
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Gera um documento único com o resumo de todos os {equipamentos.length} equipamento(s)
            de <strong>{cliente.nome}</strong> e o histórico completo de manutenções já
            concluídas — a comprovação exigida pela legislação para apresentar em fiscalização.
          </p>
          {execucoes === null ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : (
            <p className="text-sm text-foreground">{execucoes.length} execução(ões) concluída(s) encontrada(s).</p>
          )}
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={gerarDocumento}
            disabled={gerando || execucoes === null}
          >
            <Download className="w-4 h-4 mr-2" />
            {gerando ? 'Gerando...' : 'Gerar e Baixar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
