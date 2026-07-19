
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  X,
  Image as ImageIcon,
  MapPin,
  Calendar,
  User,
  FileText,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VisualizarPMOCCliente({ manutencao, pmoc, tecnico, equipamentos, onClose }) {
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    const loadEmpresa = async () => {
      try {
        const empresas = await base44.entities.Empresa.list();
        const minhaEmpresa = empresas.find(e => e.id === manutencao.empresa_id);
        setEmpresa(minhaEmpresa);
      } catch (error) {
        console.error("Erro ao carregar empresa:", error);
      }
    };
    loadEmpresa();
  }, [manutencao.empresa_id]);

  const handleBaixarPDF = async () => {
    setGerandoPDF(true);
    try {
      // Buscar todas as fotos dos equipamentos
      let todasFotos = [];
      equipamentos?.forEach(equipamento => {
        const fotos = manutencao.fotos_por_equipamento?.[equipamento.id] || [];
        todasFotos = [...todasFotos, ...fotos];
      });

      // Montar conteúdo do PDF similar ao relatório de chamado
      const conteudoHTML = `
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 33px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            ${empresa?.logo_url ? `
            .logo {
              max-width: 200px;
              max-height: 80px;
              margin-bottom: 15px;
            }
            ` : ''}
            .company-info {
              font-size: 12px;
              color: #64748b;
              margin-top: 10px;
            }
            h1 {
              color: #1e40af;
              margin: 10px 0;
              font-size: 24px;
            }
            .subtitle {
              color: #64748b;
              margin: 0;
              font-size: 14px;
            }
            .info-section {
              background: #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
            }
            .info-table td {
              padding: 8px 0;
            }
            .info-table td:first-child {
              font-weight: bold;
              width: 180px;
            }
            h2 {
              color: #334155;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
              margin-top: 30px;
            }
            .equipment-section {
              margin-bottom: 30px;
              padding: 20px;
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .equipment-title {
              color: #1e40af;
              margin-top: 0;
              font-size: 18px;
            }
            .equipment-details {
              color: #64748b;
              margin: 5px 0 15px 0;
              font-size: 14px;
            }
            .checklist-item {
              padding: 8px 0;
              border-bottom: 1px solid #f1f5f9;
              display: flex;
              align-items: flex-start;
            }
            .checklist-item:last-child {
              border-bottom: none;
            }
            .check-icon {
              margin-right: 10px;
              font-size: 18px;
            }
            .observation-box {
              background: #eff6ff;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
              margin: 15px 0;
            }
            .observation-title {
              color: #1e40af;
              margin: 0 0 10px 0;
              font-size: 16px;
            }
            .observation-text {
              color: #1e3a8a;
              margin: 0;
              white-space: pre-wrap;
            }
            .signature-box {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #cbd5e1;
              margin-top: 30px;
              text-align: center;
              page-break-inside: avoid;
            }
            .signature-img {
              max-width: 400px;
              border: 2px solid #94a3b8;
              border-radius: 4px;
              margin: 10px 0;
            }
            .signature-name {
              margin: 10px 0 0 0;
              font-weight: bold;
            }
            .signature-role {
              color: #64748b;
              margin: 5px 0 0 0;
              font-size: 14px;
            }
            .photos-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            .photo-item {
              page-break-inside: avoid;
            }
            .photo-item img {
              width: 100%;
              height: 200px;
              object-fit: cover;
              border-radius: 8px;
              border: 2px solid #e2e8f0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 12px;
            }
            @media print {
              body {
                padding: 10px;
              }
              .equipment-section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${empresa?.logo_url ? `<img src="${empresa.logo_url}" class="logo" alt="Logo da Empresa"/>` : ''}
            <h1>RELATÓRIO PMOC</h1>
            <p class="subtitle">Plano de Manutenção, Operação e Controle</p>
            ${empresa ? `
            <div class="company-info">
              <strong>${empresa.nome}</strong><br/>
              ${empresa.endereco ? `${empresa.endereco}<br/>` : ''}
              ${empresa.telefone ? `Tel: ${empresa.telefone}` : ''} ${empresa.email_contato ? `• Email: ${empresa.email_contato}` : ''}
            </div>
            ` : ''}
          </div>

          <div class="info-section">
            <h2 style="margin-top: 0; border: none;">Informações Gerais</h2>
            <table class="info-table">
              <tr>
                <td>Técnico Responsável:</td>
                <td>${tecnico?.nome || 'Não identificado'}</td>
              </tr>
              <tr>
                <td>Data de Execução:</td>
                <td>${format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</td>
              </tr>
              <tr>
                <td>Periodicidade:</td>
                <td style="text-transform: capitalize;">${pmoc.periodicidade}</td>
              </tr>
              <tr>
                <td>Equipamentos:</td>
                <td>${equipamentos?.length || 0}</td>
              </tr>
            </table>
          </div>

          <h2>Serviços Executados</h2>
          
          ${equipamentos?.map((equipamento, index) => {
            const checklist = manutencao.checklists_por_equipamento?.[equipamento.id] || [];
            const fotos = manutencao.fotos_por_equipamento?.[equipamento.id] || [];
            
            return `
              <div class="equipment-section">
                <h3 class="equipment-title">Equipamento ${index + 1}: ${equipamento.tipo.replace('_', ' ')} ${equipamento.marca} ${equipamento.modelo}</h3>
                <p class="equipment-details">📍 ${equipamento.localizacao} • ${equipamento.capacidade}</p>
                
                <h4 style="color: #475569; margin-top: 15px;">Checklist:</h4>
                ${checklist.map(item => `
                  <div class="checklist-item">
                    <span class="check-icon">${item.concluido ? '✅' : '⚠️'}</span>
                    <div style="flex: 1;">
                      <span>${item.descricao}</span>
                      ${item.observacao ? `<div style="color: #64748b; font-size: 14px; margin-top: 5px;">💬 ${item.observacao}</div>` : ''}
                    </div>
                  </div>
                `).join('')}

                ${fotos.length > 0 ? `
                  <div style="margin-top: 20px;">
                    <h4 style="color: #475569;">📸 Fotos do Serviço (${fotos.length}):</h4>
                    <div class="photos-grid">
                      ${fotos.map((url, i) => `
                        <div class="photo-item">
                          <img src="${url}" alt="Foto ${i + 1}"/>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('') || ''}

          ${manutencao.observacoes_tecnico ? `
            <div class="observation-box">
              <h3 class="observation-title">Observações do Técnico</h3>
              <p class="observation-text">${manutencao.observacoes_tecnico}</p>
            </div>
          ` : ''}

          ${manutencao.observacoes_empresa ? `
            <div class="observation-box" style="background: #fef3c7; border-left-color: #f59e0b;">
              <h3 class="observation-title" style="color: #92400e;">Observações da Empresa</h3>
              <p class="observation-text" style="color: #78350f;">${manutencao.observacoes_empresa}</p>
            </div>
          ` : ''}

          ${manutencao.assinatura_tecnico ? `
            <div class="signature-box">
              <h3 style="color: #334155; margin-top: 0;">✍️ Assinatura do Responsável no Local</h3>
              <img src="${manutencao.assinatura_tecnico}" class="signature-img" alt="Assinatura"/>
              <p class="signature-name">${manutencao.nome_responsavel_local}</p>
              <p class="signature-role">Responsável pelo local</p>
              <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">
                Assinado em: ${format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          ` : ''}

          ${manutencao.latitude && manutencao.longitude ? `
            <div class="observation-box" style="background: #faf5ff; border-left-color: #a855f7;">
              <h3 class="observation-title" style="color: #6b21a8;">📍 Localização da Execução</h3>
              <p class="observation-text" style="color: #581c87;">${manutencao.endereco || 'Localização GPS registrada'}</p>
              <p style="color: #7c3aed; margin: 5px 0 0 0; font-size: 12px;">
                Coordenadas: ${manutencao.latitude.toFixed(6)}, ${manutencao.longitude.toFixed(6)}
              </p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Relatório gerado automaticamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            <p><strong>ClimaPro</strong> - Sistema de Gestão de Manutenção</p>
          </div>
        </body>
        </html>
      `;

      // Criar um blob com o HTML
      const blob = new Blob([conteudoHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Abrir em nova janela para impressão/download
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
      
      alert("✅ Relatório gerado!\n\nUse Ctrl+P (ou Cmd+P no Mac) para salvar como PDF.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("❌ Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">📋 Relatório do PMOC Executado</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Manutenção concluída com sucesso</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBaixarPDF}
                disabled={gerandoPDF}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {gerandoPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Informações Gerais */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Técnico Responsável</p>
                  <p className="font-semibold">{tecnico?.nome}</p>
                  <p className="text-xs text-muted-foreground">{tecnico?.especialidade}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Execução</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Periodicidade</p>
                  <Badge className="bg-purple-600 text-white capitalize">{pmoc.periodicidade}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipamentos e Checklists */}
          <div>
            <h3 className="text-lg font-semibold mb-4">🔧 Serviços Executados</h3>
            <div className="space-y-4">
              {equipamentos?.map((equipamento, index) => {
                const checklist = manutencao.checklists_por_equipamento?.[equipamento.id] || [];
                const fotos = manutencao.fotos_por_equipamento?.[equipamento.id] || [];

                return (
                  <Card key={equipamento.id} className="border-2 border-green-200 bg-green-50">
                    <CardHeader>
                      <h4 className="font-semibold">
                        {equipamento.tipo} {equipamento.marca} {equipamento.modelo}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        📍 {equipamento.localizacao}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Checklist */}
                      <div className="space-y-2">
                        {checklist.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-start gap-3 bg-white p-3 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p>{item.descricao}</p>
                              {item.observacao && (
                                <p className="text-sm text-muted-foreground mt-1 bg-muted p-2 rounded">
                                  💬 {item.observacao}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Fotos */}
                      {fotos.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            <p className="text-sm font-medium text-foreground">
                              Fotos do Serviço ({fotos.length})
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {fotos.map((url, fotoIndex) => (
                              <a
                                key={fotoIndex}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={url}
                                  alt={`Foto ${fotoIndex + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border-2 border-border hover:border-blue-400 transition-colors"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Observações do Técnico */}
          {manutencao.observacoes_tecnico && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Observações do Técnico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap bg-white p-4 rounded-lg">
                  {manutencao.observacoes_tecnico}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Observações da Empresa */}
          {manutencao.observacoes_empresa && (
            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Observações da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap bg-white p-4 rounded-lg">
                  {manutencao.observacoes_empresa}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Assinatura do Responsável */}
          {manutencao.assinatura_tecnico && (
            <Card className="border-2 border-indigo-200 bg-indigo-50">
              <CardHeader>
                <CardTitle className="text-base">✍️ Assinatura do Responsável no Local</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-lg text-center">
                  <img
                    src={manutencao.assinatura_tecnico}
                    alt="Assinatura"
                    className="max-w-md mx-auto border-2 border-border rounded-lg"
                  />
                  <p className="mt-3 font-medium text-foreground">
                    {manutencao.nome_responsavel_local}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Responsável pelo local
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Assinado em: {format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Localização */}
          {manutencao.latitude && manutencao.longitude && (
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Localização da Execução
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  📍 {manutencao.endereco || 'Localização GPS registrada'}
                </p>
                <div className="border-2 border-purple-300 rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="200"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${manutencao.latitude},${manutencao.longitude}&output=embed`}
                    allowFullScreen
                  ></iframe>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
