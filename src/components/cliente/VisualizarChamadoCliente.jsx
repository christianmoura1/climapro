import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X,
  Download,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VisualizarChamadoCliente({ chamado, tecnico, empresa, onClose }) {
  const handleBaixarPDF = () => {
    // Preparar HTML do relatório
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
    ${empresa?.logo_url ? `.logo { max-width: 200px; max-height: 80px; margin-bottom: 15px; }` : ''}
    .title { font-size: 24px; font-weight: bold; color: #2563eb; }
    .section { margin: 20px 0; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: bold; color: #2563eb; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .info-row { display: flex; margin: 8px 0; }
    .info-label { font-weight: bold; width: 200px; color: #4b5563; }
    .info-value { flex: 1; color: #1f2937; }
    .observacao { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .fotos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
    .foto-item img { width: 100%; height: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
    .assinatura { text-align: center; margin: 20px 0; }
    .assinatura img { max-width: 300px; border: 2px solid #e5e7eb; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    ${empresa?.logo_url ? `<img src="${empresa.logo_url}" class="logo" alt="Logo"/>` : ''}
    <div class="title">RELATÓRIO DE SERVIÇO</div>
    <p>ClimaPro - Chamado #${chamado.numero_chamado}</p>
  </div>

  <div class="section">
    <div class="section-title">📋 Informações do Chamado</div>
    <div class="info-row">
      <div class="info-label">Número:</div>
      <div class="info-value">#${chamado.numero_chamado}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Título:</div>
      <div class="info-value">${chamado.titulo}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Descrição:</div>
      <div class="info-value">${chamado.descricao}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Data de Finalização:</div>
      <div class="info-value">${format(new Date(chamado.data_finalizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔧 Técnico Responsável</div>
    <div class="info-row">
      <div class="info-label">Nome:</div>
      <div class="info-value">${tecnico?.nome || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Especialidade:</div>
      <div class="info-value">${tecnico?.especialidade || 'N/A'}</div>
    </div>
  </div>

  ${chamado.observacoes_tecnico ? `
  <div class="section">
    <div class="section-title">📝 Observações do Técnico</div>
    <div class="observacao">${chamado.observacoes_tecnico}</div>
  </div>
  ` : ''}

  ${chamado.fotos_finalizacao?.length > 0 ? `
  <div class="section">
    <div class="section-title">📸 Fotos do Serviço (${chamado.fotos_finalizacao.length})</div>
    <div class="fotos">
      ${chamado.fotos_finalizacao.map((url, i) => `
        <div class="foto-item">
          <img src="${url}" alt="Foto ${i + 1}"/>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${chamado.videos_finalizacao?.length > 0 ? `
  <div class="section">
    <div class="section-title">🎥 Vídeos do Serviço (${chamado.videos_finalizacao.length})</div>
    ${chamado.videos_finalizacao.map((url, i) => `
      <p><a href="${url}" target="_blank">Vídeo ${i + 1}</a></p>
    `).join('')}
  </div>
  ` : ''}

  ${chamado.assinatura_cliente ? `
  <div class="section">
    <div class="section-title">✍️ Assinatura</div>
    <div class="assinatura">
      <img src="${chamado.assinatura_cliente}" alt="Assinatura"/>
      <p>${chamado.nome_cliente_confirmacao}</p>
    </div>
  </div>
  ` : ''}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">📋 Relatório do Chamado</CardTitle>
              <Badge className="bg-green-100 text-green-800 mt-2">
                <CheckCircle className="w-3 h-3 mr-1" />
                Concluído
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBaixarPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Chamado</p>
                  <p className="font-semibold">#{chamado.numero_chamado}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Técnico</p>
                  <p className="font-semibold">{tecnico?.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Data de Finalização</p>
                  <p className="text-sm">
                    {format(new Date(chamado.data_finalizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Confirmado por</p>
                  <p className="font-semibold">{chamado.nome_cliente_confirmacao}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">📋 Serviço Realizado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900">{chamado.descricao}</p>
            </CardContent>
          </Card>

          {chamado.observacoes_tecnico && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base">📝 Observações do Técnico</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 whitespace-pre-wrap">{chamado.observacoes_tecnico}</p>
              </CardContent>
            </Card>
          )}

          {chamado.fotos_finalizacao && chamado.fotos_finalizacao.length > 0 && (
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base">📸 Fotos do Serviço ({chamado.fotos_finalizacao.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {chamado.fotos_finalizacao.map((url, index) => (
                    <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {chamado.videos_finalizacao && chamado.videos_finalizacao.length > 0 && (
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-base">🎥 Vídeos do Serviço ({chamado.videos_finalizacao.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chamado.videos_finalizacao.map((url, index) => (
                    <div key={index}>
                      <p className="text-sm font-semibold mb-2">Vídeo {index + 1}:</p>
                      <video src={url} controls className="w-full rounded-lg" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {chamado.assinatura_cliente && (
            <Card className="border-2 border-indigo-200 bg-indigo-50">
              <CardHeader>
                <CardTitle className="text-base">✍️ Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <img
                  src={chamado.assinatura_cliente}
                  alt="Assinatura"
                  className="max-w-md mx-auto border-2 border-gray-300 rounded-lg"
                />
                <p className="mt-3 font-medium">{chamado.nome_cliente_confirmacao}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}