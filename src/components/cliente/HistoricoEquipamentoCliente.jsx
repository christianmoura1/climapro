import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Download, Calendar, User, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import VisualizarChamadoCliente from "./VisualizarChamadoCliente";

const statusConfig = {
  pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
  em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
  aguardando_aprovacao_empresa: { color: "bg-yellow-100 text-yellow-800", label: "Aguardando Aprovação" },
  finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
  cancelado: { color: "bg-muted text-foreground", label: "Cancelado" }
};

export default function HistoricoEquipamentoCliente({ 
  equipamento, 
  chamados, 
  tecnicos,
  empresa,
  onVoltar
}) {
  const [visualizandoChamado, setVisualizandoChamado] = useState(null);
  const [baixandoPDF, setBaixandoPDF] = useState(null);

  const handleBaixarPDF = async (chamado) => {
    setBaixandoPDF(chamado.id);
    try {
      const tecnico = tecnicos?.find(t => t.id === chamado.tecnico_id);

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    ${empresa?.logo_url ? `.logo { max-width: 200px; max-height: 80px; margin-bottom: 15px; }` : ''}
    .company-info { font-size: 12px; color: #64748b; margin-top: 10px; }
    h1 { color: #1e40af; margin: 10px 0; font-size: 24px; }
    .subtitle { color: #64748b; margin: 0; font-size: 14px; }
    .info-section { background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 8px 0; }
    .info-table td:first-child { font-weight: bold; width: 180px; }
    h2 { color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 30px; }
    .observation-box { background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 15px 0; }
    .observation-title { color: #1e40af; margin: 0 0 10px 0; font-size: 16px; }
    .observation-text { color: #1e3a8a; margin: 0; white-space: pre-wrap; }
    .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; }
    .photo-item img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0; }
    .signature-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin-top: 30px; text-align: center; }
    .signature-img { max-width: 400px; border: 2px solid #94a3b8; border-radius: 4px; margin: 10px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    ${empresa?.logo_url ? `<img src="${empresa.logo_url}" class="logo" alt="Logo"/>` : ''}
    <h1>RELATÓRIO DE SERVIÇO - EQUIPAMENTO</h1>
    <p class="subtitle">Chamado #${chamado.numero_chamado}</p>
    ${empresa ? `<div class="company-info"><strong>${empresa.nome}</strong><br/>${empresa.endereco || ''}<br/>${empresa.telefone || ''}</div>` : ''}
  </div>

  <div class="info-section">
    <h2 style="margin-top: 0; border: none;">Informações do Equipamento</h2>
    <table class="info-table">
      <tr><td>Tipo:</td><td>${equipamento.tipo.replace('_', ' ')}</td></tr>
      <tr><td>Marca:</td><td>${equipamento.marca}</td></tr>
      <tr><td>Modelo:</td><td>${equipamento.modelo}</td></tr>
      <tr><td>Capacidade:</td><td>${equipamento.capacidade}</td></tr>
      <tr><td>Localização:</td><td>${equipamento.localizacao}</td></tr>
      ${equipamento.numero_serie ? `<tr><td>Número de Série:</td><td>${equipamento.numero_serie}</td></tr>` : ''}
    </table>
  </div>

  <div class="info-section">
    <h2 style="margin-top: 0; border: none;">Informações do Serviço</h2>
    <table class="info-table">
      <tr><td>Técnico:</td><td>${tecnico?.nome || 'N/A'}</td></tr>
      <tr><td>Data:</td><td>${chamado.data_finalizacao ? format(new Date(chamado.data_finalizacao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}</td></tr>
      <tr><td>Título:</td><td>${chamado.titulo}</td></tr>
      <tr><td>Descrição:</td><td>${chamado.descricao}</td></tr>
      <tr><td>Confirmado por:</td><td>${chamado.nome_cliente_confirmacao || 'N/A'}</td></tr>
    </table>
  </div>

  ${chamado.observacoes_tecnico ? `
  <div class="observation-box">
    <h3 class="observation-title">📝 Observações do Técnico</h3>
    <p class="observation-text">${chamado.observacoes_tecnico}</p>
  </div>` : ''}

  ${chamado.observacoes_empresa ? `
  <div class="observation-box" style="background: #fef3c7; border-left-color: #f59e0b;">
    <h3 class="observation-title" style="color: #92400e;">💼 Observações da Empresa</h3>
    <p class="observation-text" style="color: #78350f;">${chamado.observacoes_empresa}</p>
  </div>` : ''}
  
  ${chamado.fotos_finalizacao?.length > 0 ? `
  <h2>📸 Fotos do Serviço (${chamado.fotos_finalizacao.length})</h2>
  <div class="photos-grid">
    ${chamado.fotos_finalizacao.map((url, i) => `<div class="photo-item"><img src="${url}"/></div>`).join('')}
  </div>` : ''}

  ${chamado.videos_finalizacao?.length > 0 ? `
  <div style="margin-top: 30px;">
    <h2>🎥 Vídeos do Serviço (${chamado.videos_finalizacao.length})</h2>
    ${chamado.videos_finalizacao.map((url, i) => `
      <p style="margin: 10px 0;">
        <strong>Vídeo ${i + 1}:</strong> <a href="${url}" target="_blank" style="color: #2563eb;">${url}</a>
      </p>
    `).join('')}
  </div>` : ''}

  ${chamado.assinatura_cliente ? `
  <div class="signature-box">
    <h3 style="color: #334155; margin-top: 0;">✍️ Assinatura</h3>
    <img src="${chamado.assinatura_cliente}" class="signature-img" alt="Assinatura"/>
    <p style="margin: 10px 0 0 0; font-weight: bold;">${chamado.nome_cliente_confirmacao}</p>
    <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Confirmação do Serviço</p>
  </div>` : ''}

  <div class="footer">
    <p>Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
    <p><strong>ClimaPro</strong> - ${empresa?.nome || ''}</p>
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 500);
        };
      }
      
      alert("✅ Relatório gerado!\n\nUse Ctrl+P (ou Cmd+P no Mac) para salvar como PDF.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("❌ Erro ao gerar PDF");
    } finally {
      setBaixandoPDF(null);
    }
  };

  const handleVisualizarChamado = (chamado) => {
    const tecnico = tecnicos?.find(t => t.id === chamado.tecnico_id);
    setVisualizandoChamado({ chamado, tecnico });
  };

  if (visualizandoChamado) {
    return (
      <VisualizarChamadoCliente
        chamado={visualizandoChamado.chamado}
        tecnico={visualizandoChamado.tecnico}
        empresa={empresa}
        onClose={() => setVisualizandoChamado(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onVoltar}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Histórico do Equipamento
              </h2>
              <p className="text-sm text-muted-foreground">
                {equipamento.marca} {equipamento.modelo} - {equipamento.localizacao}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informações do Equipamento */}
        <Card className="shadow-lg border-2 border-blue-200 bg-blue-50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📦 Detalhes do Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-semibold text-foreground capitalize">
                  {equipamento.tipo.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marca / Modelo</p>
                <p className="font-semibold text-foreground">
                  {equipamento.marca} {equipamento.modelo}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacidade</p>
                <p className="font-semibold text-foreground">{equipamento.capacidade}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Localização</p>
                <p className="font-semibold text-foreground">{equipamento.localizacao}</p>
              </div>
              {equipamento.numero_serie && (
                <div>
                  <p className="text-sm text-muted-foreground">Número de Série</p>
                  <p className="font-semibold text-foreground">{equipamento.numero_serie}</p>
                </div>
              )}
              {equipamento.data_instalacao && (
                <div>
                  <p className="text-sm text-muted-foreground">Data de Instalação</p>
                  <p className="font-semibold text-foreground">
                    {format(new Date(equipamento.data_instalacao), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Chamados */}
        <Card className="shadow-lg border-none">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              📋 Histórico de Serviços ({chamados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {chamados.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>Nenhum serviço registrado para este equipamento ainda</p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {chamados.map((chamado) => {
                  const tecnico = tecnicos?.find(t => t.id === chamado.tecnico_id);
                  const status = statusConfig[chamado.status];
                  
                  return (
                    <div key={chamado.id} className="p-4 hover:bg-muted transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">{chamado.titulo}</h3>
                            <Badge className={status?.color}>
                              {status?.label}
                            </Badge>
                            {chamado.prioridade === 'urgente' && (
                              <Badge className="bg-red-600 text-white">🚨 Urgente</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{chamado.descricao}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {tecnico && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>Técnico: {tecnico.nome}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {chamado.data_finalizacao 
                                  ? format(new Date(chamado.data_finalizacao), "dd/MM/yyyy", { locale: ptBR })
                                  : chamado.created_date 
                                  ? format(new Date(chamado.created_date), "dd/MM/yyyy", { locale: ptBR })
                                  : 'N/A'}
                              </span>
                            </div>
                            {chamado.status === 'finalizado' && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                <span>Concluído</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {chamado.status === 'finalizado' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVisualizarChamado(chamado)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-3 h-3 mr-2" />
                            Ver Detalhes Completos
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBaixarPDF(chamado)}
                            disabled={baixandoPDF === chamado.id}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Download className="w-3 h-3 mr-2" />
                            {baixandoPDF === chamado.id ? 'Gerando...' : 'Baixar PDF'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}