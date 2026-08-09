import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { LABEL_PERIODICIDADE, statusManutencao, STATUS_MANUTENCAO_CONFIG, ROTULO_RESULTADO, resultadoChecklistItem } from "@/lib/pmocChecklist";

// "Livro de Registro de Manutenção" consolidado do cliente: resumo do estado
// atual dos equipamentos e histórico cronológico das execuções (checklist,
// fotos e assinaturas de cada
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
          const status = statusManutencao(eq.proxima_manutencao, eq.ultima_manutencao);
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
                    ${checklist.map((item) => `<li${resultadoChecklistItem(item) === 'nok' ? ' style="color:#991b1b;font-weight:bold"' : ''}>${ROTULO_RESULTADO[resultadoChecklistItem(item)]} ${item.descricao}${resultadoChecklistItem(item) === 'nok' ? ' (não conforme)' : ''}${item.observacao ? ` — <em>${item.observacao}</em>` : ''}</li>`).join('')}
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
  @page { size: A4 portrait; margin: 16mm 15mm 18mm; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #172033; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header { display: grid; grid-template-columns: 72px 1fr auto; gap: 16px; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 14px; margin-bottom: 24px; }
  .logo-wrap { width: 72px; height: 54px; display: flex; align-items: center; justify-content: center; }
  .logo { max-width: 72px; max-height: 54px; object-fit: contain; }
  .logo-fallback { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 12px; background: #2563eb; color: #fff; font-weight: 800; }
  .header-copy { text-align: left; }
  .header h1 { color: #172033; margin: 2px 0 5px; font-size: 21px; }
  .header p { color: #596579; font-size: 9.5px; margin: 2px 0; }
  .kicker { color: #2563eb !important; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; }
  .doc-code { align-self: start; border: 1px solid #bfdbfe; border-radius: 8px; padding: 7px 9px; color: #1d4ed8; font-size: 8px; font-weight: 700; }
  h2 { color: #24324a; border-bottom: 2px solid #dbeafe; padding-bottom: 7px; margin-top: 28px; break-after: avoid; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #d7deea; padding: 7px; text-align: left; }
  th { background: #eaf2ff; }
  .execucao { margin-top: 22px; padding: 14px; background: #f8fafc; border: 1px solid #d7deea; border-radius: 8px; }
  .execucao h3 { color: #1d4ed8; margin: 0 0 4px 0; break-after: avoid; page-break-after: avoid; }
  .meta { color: #6b7280; font-size: 10px; margin: 0 0 12px 0; }
  .equipment-section { background: white; border: 1px solid #d7deea; border-radius: 6px; padding: 11px; margin: 10px 0; break-inside: avoid; page-break-inside: avoid; }
  .equipment-section h4 { margin: 0 0 8px 0; color: #243b80; }
  .checklist { margin: 0; padding-left: 18px; }
  .checklist li { margin: 4px 0; font-size: 10px; }
  .fotos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
  .fotos-grid img { width: 100%; height: 105px; object-fit: cover; border-radius: 4px; border: 1px solid #d7deea; }
  .assinatura { text-align: center; margin-top: 12px; }
  .assinatura img { max-width: 230px; max-height: 90px; border: 1px solid #d7deea; border-radius: 4px; }
  .footer { position: fixed; left: 0; right: 0; bottom: -12mm; display: flex; justify-content: space-between; border-top: 1px solid #d7deea; padding-top: 4px; color: #6b7280; font-size: 8px; }
  .page-number::after { content: "Página " counter(page); }
  @media screen { body { padding: 24px; } .footer { position: static; margin-top: 24px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-wrap">${empresa?.logo_url ? `<img src="${empresa.logo_url}" class="logo" alt="Logo da empresa" />` : '<div class="logo-fallback">CP</div>'}</div>
    <div class="header-copy">
      <p class="kicker">Registro de manutenção PMOC</p>
      <h1>Caderno de Manutenção</h1>
      <p><strong>${empresa?.nome || ''}</strong>${empresa?.cnpj ? ` · CNPJ ${empresa.cnpj}` : ''}</p>
      <p>Cliente: <strong>${cliente.nome}</strong>${cliente.endereco ? ` · ${cliente.endereco}` : ''}</p>
      ${empresa?.responsavel_tecnico_nome ? `<p>Responsável técnico informado: <strong>${empresa.responsavel_tecnico_nome}</strong>${empresa.responsavel_tecnico_registro ? ` · ${empresa.responsavel_tecnico_registro}` : ''}</p>` : ''}
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}. O conteúdo reflete os registros armazenados no ClimaPro.</p>
    </div>
    <div class="doc-code">REGISTRO PMOC</div>
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
    <span>ClimaPro · Caderno de Manutenção · ${cliente.nome}</span><span class="page-number"></span>
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
      console.error("Erro ao gerar caderno:", error);
      toast({ description: "❌ Erro ao gerar o caderno. Tente novamente.", variant: "destructive" });
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="caderno-title">
      <Card className="w-full max-w-lg rounded-b-none rounded-t-2xl sm:rounded-xl">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-start justify-between gap-3">
            <CardTitle id="caderno-title" className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Caderno de Manutenção
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar caderno de manutenção">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Gera um documento único com o resumo de todos os {equipamentos.length} equipamento(s)
            de <strong>{cliente.nome}</strong> e o histórico completo de manutenções já
            concluídas. Revise os dados antes de imprimir ou compartilhar.
          </p>
          {execucoes === null ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : (
            <p className="text-sm text-foreground">{execucoes.length} execução(ões) concluída(s) encontrada(s).</p>
          )}
          <Button
            className="min-h-12 w-full bg-purple-600 hover:bg-purple-700"
            onClick={gerarDocumento}
            disabled={gerando || execucoes === null}
          >
            <Download className="w-4 h-4 mr-2" />
            {gerando ? 'Preparando documento...' : 'Abrir versão para impressão'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
