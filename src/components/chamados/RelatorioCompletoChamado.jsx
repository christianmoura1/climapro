
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X,
  Download,
  Mail,
  MapPin,
  User,
  Calendar,
  Clock,
  Phone,
  Building2,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  DollarSign,
  Save
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

// Função CORRIGIDA para converter UTC para horário de Brasília
const formatarDataBrasil = (dataISO) => {
  if (!dataISO) return 'N/A';
  
  // Criar objeto Date a partir da string ISO (sempre em UTC)
  const dataUTC = new Date(dataISO);
  
  // Usar Intl.DateTimeFormat para converter para timezone de São Paulo
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const partes = formatter.formatToParts(dataUTC);
  const valores = {};
  partes.forEach(parte => {
    valores[parte.type] = parte.value;
  });
  
  return `${valores.day}/${valores.month}/${valores.year} às ${valores.hour}:${valores.minute}`;
};

export default function RelatorioCompletoChamado({ chamado, cliente, tecnico, empresa, onClose }) {
  const [mostrarOrcamento, setMostrarOrcamento] = useState(false);
  const [orcamento, setOrcamento] = useState({
    valor: chamado.valor_servico || "",
    descricao: ""
  });
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const queryClient = useQueryClient();

  const salvarOrcamentoMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Chamado.update(chamado.id, {
        valor_servico: parseFloat(data.valor)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados']);
      setMostrarOrcamento(false);
      toast({ description: "✅ Orçamento salvo com sucesso!", variant: "success" });
    },
    onError: (error) => {
      console.error("Erro ao salvar orçamento:", error);
      toast({ description: "❌ Erro ao salvar orçamento. Tente novamente.", variant: "destructive" });
    }
  });

  const handleSalvarOrcamento = (e) => {
    e.preventDefault();
    if (!orcamento.valor || parseFloat(orcamento.valor) <= 0) {
      toast({ description: "⚠️ Por favor, informe um valor válido.", variant: "warning" });
      return;
    }
    salvarOrcamentoMutation.mutate(orcamento);
  };

  const gerarPDF = async () => {
    setGerandoPDF(true);
    try {
      // Preparar URLs das fotos ANEXAS em formato inline para o PDF
      let fotosAnexosHTML = '';
      if (chamado.fotos_anexos && chamado.fotos_anexos.length > 0) {
        fotosAnexosHTML = `
  <div class="section">
    <div class="section-title">📸 Fotos do Problema/Local</div>
    <div class="fotos">
      ${chamado.fotos_anexos.map((url, idx) => `
        <div class="foto-item">
          <img src="${url}" alt="Foto ${idx + 1}" />
          <p style="text-align: center; font-size: 10px; color: #6b7280; margin-top: 5px;">Foto ${idx + 1}</p>
        </div>
      `).join('')}
    </div>
  </div>`;
      }

      // Preparar URLs das fotos DE FINALIZAÇÃO
      let fotosFinalizacaoHTML = '';
      if (chamado.fotos_finalizacao && chamado.fotos_finalizacao.length > 0) {
        fotosFinalizacaoHTML = `
  <div class="section">
    <div class="section-title">✅ Fotos do Serviço Finalizado (${chamado.fotos_finalizacao.length})</div>
    <div class="fotos">
      ${chamado.fotos_finalizacao.map((url, idx) => `
        <div class="foto-item">
          <img src="${url}" alt="Finalização ${idx + 1}" />
          <p style="text-align: center; font-size: 10px; color: #16a34a; margin-top: 5px; font-weight: bold;">✅ Finalização ${idx + 1}</p>
        </div>
      `).join('')}
    </div>
  </div>`;
      }

      // Preparar URLs dos VÍDEOS DE FINALIZAÇÃO
      let videosFinalizacaoHTML = '';
      if (chamado.videos_finalizacao && chamado.videos_finalizacao.length > 0) {
        videosFinalizacaoHTML = `
  <div class="section">
    <div class="section-title">🎥 Vídeos do Serviço Finalizado (${chamado.videos_finalizacao.length})</div>
    <div style="margin: 15px 0;">
      ${chamado.videos_finalizacao.map((url, idx) => `
        <div style="margin-bottom: 15px;">
          <p style="font-size: 12px; color: #4b5563; margin-bottom: 5px; font-weight: bold;">Vídeo ${idx + 1}:</p>
          <a href="${url}" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 11px; word-break: break-all;">
            ${url}
          </a>
          <div style="margin-top: 5px; padding: 10px; background: #f3f4f6; border-radius: 4px;">
            <p style="font-size: 10px; color: #6b7280; margin: 0;">
              📱 Clique no link acima para visualizar o vídeo
            </p>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
      }

      // HTML do relatório com logo dinâmica
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    .logo-container { margin-bottom: 15px; }
    .logo-container img { max-width: 200px; max-height: 80px; }
    .empresa-nome { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
    .empresa-info { font-size: 12px; color: #666; margin-top: 10px; line-height: 1.6; }
    .title { font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0; color: #1f2937; }
    .section { margin: 20px 0; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: bold; color: #2563eb; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .info-row { display: flex; margin: 8px 0; }
    .info-label { font-weight: bold; width: 200px; color: #4b5563; }
    .info-value { flex: 1; color: #1f2937; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .status-finalizado { background: #dcfce7; color: #166534; }
    .observacao { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .assinatura { margin: 20px 0; text-align: center; page-break-inside: avoid; }
    .assinatura img { max-width: 300px; max-height: 150px; border: 2px solid #e5e7eb; border-radius: 8px; }
    .fotos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
    .foto-item { text-align: center; }
    .foto-item img { width: 100%; max-width: 200px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
    .orcamento-box { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; page-break-inside: avoid; }
    .orcamento-valor { font-size: 32px; font-weight: bold; color: #1e40af; }
    .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${empresa?.logo_url ? `
    <div class="logo-container">
      <img src="${empresa.logo_url}" alt="Logo ${empresa.nome}" onerror="this.style.display='none'" crossorigin="anonymous" />
    </div>
    ` : `
    <div class="empresa-nome">${empresa?.nome || 'ClimaPro'}</div>
    `}
    <div class="empresa-info">
      CNPJ: ${empresa?.cnpj || 'N/A'} | Telefone: ${empresa?.telefone || 'N/A'}<br>
      ${empresa?.endereco || ''}<br>
      ${empresa?.email_contato || ''}
    </div>
  </div>

  <div class="title">ORDEM DE SERVIÇO / RELATÓRIO DE ATENDIMENTO</div>

  <div class="section">
    <div class="section-title">📋 Informações do Chamado</div>
    <div class="info-row">
      <div class="info-label">Número do Chamado:</div>
      <div class="info-value">#${chamado.numero_chamado}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Status:</div>
      <div class="info-value"><span class="status-badge status-finalizado">✅ Finalizado</span></div>
    </div>
    <div class="info-row">
      <div class="info-label">Data de Abertura:</div>
      <div class="info-value">${formatarDataBrasil(chamado.created_date)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Data de Finalização:</div>
      <div class="info-value">${formatarDataBrasil(chamado.data_finalizacao)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">👤 Dados do Cliente</div>
    <div class="info-row">
      <div class="info-label">Nome/Razão Social:</div>
      <div class="info-value">${cliente?.nome || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Telefone:</div>
      <div class="info-value">${cliente?.telefone || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Endereço:</div>
      <div class="info-value">${chamado.local || cliente?.endereco || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔧 Dados do Técnico</div>
    <div class="info-row">
      <div class="info-label">Nome:</div>
      <div class="info-value">${tecnico?.nome || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Especialidade:</div>
      <div class="info-value">${tecnico?.especialidade || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🛠️ Detalhes do Serviço</div>
    <div class="info-row">
      <div class="info-label">Descrição do Problema:</div>
      <div class="info-value">${chamado.descricao || 'N/A'}</div>
    </div>
    ${chamado.observacoes_tecnico ? `
    <div class="info-row">
      <div class="info-label">Observações do Técnico:</div>
      <div class="info-value">
        <div class="observacao">${chamado.observacoes_tecnico}</div>
      </div>
    </div>
    ` : ''}
    ${chamado.nome_cliente_confirmacao ? `
    <div class="info-row">
      <div class="info-label">Atendimento acompanhado por:</div>
      <div class="info-value">${chamado.nome_cliente_confirmacao}</div>
    </div>
    ` : ''}
  </div>

  ${fotosAnexosHTML}

  ${fotosFinalizacaoHTML}

  ${videosFinalizacaoHTML}

  ${chamado.valor_servico ? `
  <div class="orcamento-box">
    <div style="font-size: 14px; color: #1e40af; margin-bottom: 10px;">💰 VALOR DO SERVIÇO</div>
    <div class="orcamento-valor">R$ ${parseFloat(chamado.valor_servico).toFixed(2).replace('.', ',')}</div>
  </div>
  ` : ''}

  ${chamado.assinatura_cliente ? `
  <div class="section">
    <div class="section-title">✍️ Assinatura do Cliente</div>
    <div class="assinatura">
      <img src="${chamado.assinatura_cliente}" alt="Assinatura do Cliente" />
      <div style="margin-top: 10px; font-size: 12px; color: #6b7280;">
        Confirmo a realização do serviço conforme descrito acima.
      </div>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    Documento gerado automaticamente pelo sistema ClimaPro<br>
    Data de geração: ${formatarDataBrasil(new Date().toISOString())}<br>
    https://geradordepmoc.com.br
  </div>
</body>
</html>
      `;

      toast({ description: "📄 Gerando PDF... Aguarde um momento.", variant: "default" });

      // Criar blob e fazer download do HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OrdemServico_${cliente?.nome?.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'ddMMyyyy')}.html`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert("✅ Relatório gerado com sucesso!\n\nVocê pode abrir o arquivo HTML no navegador e usar 'Imprimir' ou 'Salvar como PDF' para gerar o PDF final.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ description: "❌ Erro ao gerar relatório. Tente novamente.", variant: "destructive" });
    } finally {
      setGerandoPDF(false);
    }
  };

  const enviarPorEmail = async () => {
    if (!cliente?.email) {
      toast({ description: "⚠️ Cliente não possui email cadastrado.", variant: "warning" });
      return;
    }

    try {
      await base44.integrations.Core.SendEmail({
        to: cliente.email,
        subject: `Ordem de Serviço #${chamado.numero_chamado} - ${empresa?.nome || 'ClimaPro'}`,
        body: `Prezado(a) ${cliente.nome},

Segue em anexo o relatório do serviço realizado:

Chamado: #${chamado.numero_chamado}
Técnico: ${tecnico?.nome}
Data de Finalização: ${chamado.data_finalizacao ? formatarDataBrasil(chamado.data_finalizacao) : 'N/A'}
${chamado.valor_servico ? `Valor: R$ ${parseFloat(chamado.valor_servico).toFixed(2)}` : ''}

Obrigado pela preferência!

Atenciosamente,
${empresa?.nome || 'ClimaPro'}
${empresa?.telefone || ''}
${empresa?.email_contato || ''}`
      });

      toast({ description: "✅ Email enviado com sucesso!", variant: "success" });
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      toast({ description: "❌ Erro ao enviar email. Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">📄 Relatório Completo do Atendimento</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={gerarPDF}
                disabled={gerandoPDF}
              >
                {gerandoPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
              {cliente?.email && (
                <Button
                  variant="outline"
                  onClick={enviarPorEmail}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Email
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Informações do Chamado */}
          <div className="bg-white border-2 border-blue-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informações do Chamado
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número do Chamado</p>
                <p className="font-semibold text-foreground">#{chamado.numero_chamado}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Finalizado
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Abertura</p>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {formatarDataBrasil(chamado.created_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data de Finalização</p>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {formatarDataBrasil(chamado.data_finalizacao)}
                </p>
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-white border-2 border-green-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Dados do Cliente
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome/Razão Social</p>
                <p className="font-semibold text-foreground">{cliente?.nome || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {cliente?.telefone || 'N/A'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {chamado.local || cliente?.endereco || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Dados do Técnico */}
          <div className="bg-white border-2 border-purple-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados do Técnico
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-semibold text-foreground">{tecnico?.nome || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Especialidade</p>
                <p className="font-semibold text-foreground capitalize">{tecnico?.especialidade || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Detalhes do Serviço */}
          <div className="bg-white border-2 border-orange-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-orange-900 mb-4">🛠️ Detalhes do Serviço</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Descrição do Problema</p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-foreground">{chamado.descricao || 'N/A'}</p>
                </div>
              </div>

              {chamado.observacoes_tecnico && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Observações do Técnico</p>
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-foreground">{chamado.observacoes_tecnico}</p>
                  </div>
                </div>
              )}

              {chamado.nome_cliente_confirmacao && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Atendimento acompanhado por</p>
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {chamado.nome_cliente_confirmacao}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fotos Anexas DO PROBLEMA/LOCAL */}
          {chamado.fotos_anexos && chamado.fotos_anexos.length > 0 && (
            <div className="bg-white border-2 border-slate-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                📸 Fotos do Problema/Local ({chamado.fotos_anexos.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {chamado.fotos_anexos.map((url, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-auto rounded-lg border-2 border-border shadow-md cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => window.open(url, '_blank')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Foto {index + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOVA SEÇÃO: Fotos de Finalização */}
          {chamado.fotos_finalizacao && chamado.fotos_finalizacao.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                ✅ Fotos do Serviço Finalizado ({chamado.fotos_finalizacao.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {chamado.fotos_finalizacao.map((url, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <img
                      src={url}
                      alt={`Finalização ${index + 1}`}
                      className="w-full h-auto rounded-lg border-2 border-green-300 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => window.open(url, '_blank')}
                    />
                    <p className="text-xs text-green-700 font-semibold mt-1">✅ Finalização {index + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOVA SEÇÃO: Vídeos de Finalização */}
          {chamado.videos_finalizacao && chamado.videos_finalizacao.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                🎥 Vídeos do Serviço Finalizado ({chamado.videos_finalizacao.length})
              </h3>
              <div className="space-y-4">
                {chamado.videos_finalizacao.map((url, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Vídeo {index + 1}:</p>
                    <video
                      src={url}
                      controls
                      className="w-full max-w-2xl mx-auto rounded-lg border-2 border-blue-300 shadow-lg"
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                    >
                      Abrir vídeo em nova aba
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orçamento */}
          {chamado.valor_servico ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Valor do Serviço
              </h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-900">
                  R$ {parseFloat(chamado.valor_servico).toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">💵 Orçamento não definido</h3>
                  <p className="text-sm text-yellow-700">Adicione o valor do serviço para incluir no relatório</p>
                </div>
                <Button
                  onClick={() => setMostrarOrcamento(!mostrarOrcamento)}
                  variant="outline"
                  className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Adicionar Orçamento
                </Button>
              </div>

              {mostrarOrcamento && (
                <form onSubmit={handleSalvarOrcamento} className="mt-4 pt-4 border-t border-yellow-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orcamento-valor">Valor do Serviço *</Label>
                      <Input
                        id="orcamento-valor"
                        type="number"
                        step="0.01"
                        min="0"
                        value={orcamento.valor}
                        onChange={(e) => setOrcamento({...orcamento, valor: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        type="submit"
                        className="bg-yellow-600 hover:bg-yellow-700"
                        disabled={salvarOrcamentoMutation.isPending}
                      >
                        {salvarOrcamentoMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMostrarOrcamento(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Assinatura */}
          {chamado.assinatura_cliente && (
            <div className="bg-white border-2 border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">✍️ Assinatura do Cliente</h3>
              <div className="text-center">
                <img
                  src={chamado.assinatura_cliente}
                  alt="Assinatura do Cliente"
                  className="max-w-sm mx-auto border-2 border-border rounded-lg p-4 bg-white"
                />
                <p className="text-sm text-muted-foreground mt-4">
                  Confirmo a realização do serviço conforme descrito acima.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
