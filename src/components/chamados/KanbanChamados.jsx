import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  MapPin,
  User,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Wrench,
  Download,
  AlertTriangle,
  Bell
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

import AgendarChamadoModal from "./AgendarChamadoModal";
import { toast } from "@/components/ui/use-toast";

const colunas = [
  {
    id: 'pendente',
    titulo: 'Pendente',
    corBorda: 'border-orange-500',
    corIconeChip: 'bg-orange-100 text-orange-600',
    corBadge: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
    icon: AlertCircle
  },
  {
    id: 'em_andamento',
    titulo: 'Em Andamento',
    corBorda: 'border-blue-500',
    corIconeChip: 'bg-blue-100 text-blue-600',
    corBadge: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    icon: Clock
  },
  {
    id: 'aguardando_aprovacao_empresa',
    titulo: 'Aguardando Aprovação',
    corBorda: 'border-yellow-500',
    corIconeChip: 'bg-yellow-100 text-yellow-700',
    corBadge: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    icon: AlertTriangle
  },
  {
    id: 'finalizado',
    titulo: 'Concluído',
    corBorda: 'border-emerald-500',
    corIconeChip: 'bg-emerald-100 text-emerald-600',
    corBadge: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    icon: CheckCircle
  }
];

const corPrioridade = {
  urgente: 'border-l-red-500',
  alta: 'border-l-orange-500',
  media: 'border-l-blue-400',
  baixa: 'border-l-slate-300'
};

export default function KanbanChamados({
  chamados,
  clientes,
  tecnicos,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onFecharChamado,
  onAprovar,
  onVisualizarChamado,
  mostrarTecnico = true,
  mostrarCliente = true,
  mostrarBotoes = true,
  mostrarBotaoFechar = false
}) {
  const [agendandoChamado, setAgendandoChamado] = React.useState(null);
  const [baixandoPDF, setBaixandoPDF] = React.useState(null);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    const novoStatus = destination.droppableId;
    const chamadoId = draggableId;

    if (onStatusChange) {
      onStatusChange(chamadoId, novoStatus);
    }
  };

  const getChamadosPorStatus = (status) => {
    return chamados.filter(c => c.status === status);
  };

  const handleBaixarPDF = async (chamado) => {
    setBaixandoPDF(chamado.id);
    try {
      const cliente = clientes?.find(c => c.id === chamado.cliente_id);
      const tecnico = tecnicos?.find(t => t.id === chamado.tecnico_id);

      // Buscar empresa
      const empresas = await base44.entities.Empresa.list();
      const empresa = empresas.find(e => e.id === chamado.empresa_id);

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
    .signature-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin-top: 30px; text-align: center; page-break-inside: avoid; }
    .signature-img { max-width: 400px; border: 2px solid #94a3b8; border-radius: 4px; margin: 10px 0; }
    .signature-name { margin: 10px 0 0 0; font-weight: bold; }
    .signature-role { color: #64748b; margin: 5px 0 0 0; font-size: 14px; }
    .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; }
    .photo-item { page-break-inside: avoid; }
    .photo-item img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    ${empresa?.logo_url ? `<img src="${empresa.logo_url}" class="logo" alt="Logo da Empresa"/>` : ''}
    <h1>RELATÓRIO DE SERVIÇO</h1>
    <p class="subtitle">ClimaPro - Chamado #${chamado.numero_chamado}</p>
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
        <td>Cliente:</td>
        <td>${cliente?.nome || 'Não identificado'}</td>
      </tr>
      <tr>
        <td>Endereço:</td>
        <td>${cliente?.endereco || 'Não informado'}</td>
      </tr>
      <tr>
        <td>Telefone:</td>
        <td>${cliente?.telefone || 'Não informado'}</td>
      </tr>
      <tr>
        <td>Técnico Responsável:</td>
        <td>${tecnico?.nome || 'Não identificado'}</td>
      </tr>
      <tr>
        <td>Data de Finalização:</td>
        <td>${chamado.data_finalizacao ? format(new Date(chamado.data_finalizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}</td>
      </tr>
      <tr>
        <td>Confirmado por:</td>
        <td>${chamado.nome_cliente_confirmacao || 'N/A'}</td>
      </tr>
    </table>
  </div>

  <h2>Descrição do Serviço</h2>
  <div class="info-section">
    <table class="info-table">
      <tr>
        <td>Título:</td>
        <td>${chamado.titulo}</td>
      </tr>
      <tr>
        <td>Descrição:</td>
        <td>${chamado.descricao}</td>
      </tr>
      <tr>
        <td>Local:</td>
        <td>${chamado.local || cliente?.endereco || 'Não informado'}</td>
      </tr>
      <tr>
        <td>Tipo de Problema:</td>
        <td style="text-transform: capitalize;">${chamado.tipo_problema?.replace('_', ' ') || 'N/A'}</td>
      </tr>
      <tr>
        <td>Prioridade:</td>
        <td style="text-transform: capitalize;">${chamado.prioridade || 'Média'}</td>
      </tr>
    </table>
  </div>

  ${chamado.observacoes_tecnico ? `
  <div class="observation-box">
    <h3 class="observation-title">📝 Observações do Técnico</h3>
    <p class="observation-text">${chamado.observacoes_tecnico}</p>
  </div>
  ` : ''}

  ${chamado.observacoes_empresa ? `
  <div class="observation-box" style="background: #fef3c7; border-left-color: #f59e0b;">
    <h3 class="observation-title" style="color: #92400e;">💼 Observações da Empresa</h3>
    <p class="observation-text" style="color: #78350f;">${chamado.observacoes_empresa}</p>
  </div>
  ` : ''}

  ${chamado.fotos_finalizacao?.length > 0 ? `
  <div style="margin-top: 30px;">
    <h2>📸 Fotos do Serviço Executado (${chamado.fotos_finalizacao.length})</h2>
    <div class="photos-grid">
      ${chamado.fotos_finalizacao.map((url, i) => `
        <div class="photo-item">
          <img src="${url}" alt="Foto ${i + 1}"/>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${chamado.videos_finalizacao?.length > 0 ? `
  <div style="margin-top: 30px;">
    <h2>🎥 Vídeos do Serviço (${chamado.videos_finalizacao.length})</h2>
    ${chamado.videos_finalizacao.map((url, i) => `
      <p style="margin: 10px 0;">
        <strong>Vídeo ${i + 1}:</strong> <a href="${url}" target="_blank" style="color: #2563eb;">${url}</a>
      </p>
    `).join('')}
  </div>
  ` : ''}

  ${chamado.assinatura_cliente ? `
  <div class="signature-box">
    <h3 style="color: #334155; margin-top: 0;">✍️ Assinatura do Cliente</h3>
    <img src="${chamado.assinatura_cliente}" class="signature-img" alt="Assinatura"/>
    <p class="signature-name">${chamado.nome_cliente_confirmacao}</p>
    <p class="signature-role">Confirmação do Serviço</p>
    <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">
      Assinado em: ${chamado.data_finalizacao ? format(new Date(chamado.data_finalizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
    </p>
  </div>
  ` : ''}

  ${cliente?.latitude && cliente?.longitude ? `
  <div class="observation-box" style="background: #faf5ff; border-left-color: #a855f7;">
    <h3 class="observation-title" style="color: #6b21a8;">📍 Localização do Atendimento</h3>
    <p class="observation-text" style="color: #581c87;">${cliente.endereco || 'Localização GPS registrada'}</p>
    <p style="color: #7c3aed; margin: 5px 0 0 0; font-size: 12px;">
      Coordenadas: ${cliente.latitude.toFixed(6)}, ${cliente.longitude.toFixed(6)}
    </p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Relatório gerado automaticamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
    <p><strong>ClimaPro</strong> - Sistema de Gestão de Manutenção</p>
    ${empresa ? `<p>${empresa.nome} - ${empresa.telefone || ''}</p>` : ''}
  </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
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
      toast({ description: "❌ Erro ao gerar PDF. Tente novamente.", variant: "destructive" });
    } finally {
      setBaixandoPDF(null);
    }
  };

  return (
    <>
      <p className="mb-2 text-xs font-medium text-blue-700 md:hidden">Deslize para o lado para ver todas as etapas.</p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="scrollbar-thin -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
          {colunas.map((coluna) => {
            const chamadosColuna = getChamadosPorStatus(coluna.id);
            
            return (
              <Droppable key={coluna.id} droppableId={coluna.id}>
                {(provided, snapshot) => (
                  <Card
                    className={`w-[84vw] max-w-[22rem] shrink-0 snap-start rounded-xl border-t-4 bg-muted/40 shadow-sm transition-colors md:w-auto md:max-w-none ${coluna.corBorda} ${
                      snapshot.isDraggingOver ? 'bg-primary/5' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${coluna.corIconeChip}`}>
                            <coluna.icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-semibold">{coluna.titulo}</span>
                        </div>
                        <Badge className={coluna.corBadge}>
                          {chamadosColuna.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3 min-h-[200px]"
                    >
                      {chamadosColuna.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 text-center text-muted-foreground py-10 text-sm border-2 border-dashed border-border rounded-lg">
                          <coluna.icon className="w-6 h-6 opacity-30" />
                          Nenhum chamado
                        </div>
                      ) : (
                        chamadosColuna.map((chamado, index) => {
                          const cliente = clientes?.find(c => c.id === chamado.cliente_id);
                          const tecnico = tecnicos?.find(t => t.id === chamado.tecnico_id);
                          const podeFechar = mostrarBotaoFechar && chamado.status !== 'finalizado' && chamado.status !== 'aguardando_aprovacao_empresa';
                          
                          return (
                            <Draggable 
                              key={chamado.id} 
                              draggableId={chamado.id} 
                              index={index}
                              isDragDisabled={!mostrarBotoes || chamado.status === 'aguardando_aprovacao_empresa'}
                            >
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`rounded-lg border-l-4 ${corPrioridade[chamado.prioridade] || corPrioridade.media} hover:shadow-md transition-shadow bg-card ${
                                    snapshot.isDragging ? 'shadow-2xl rotate-2' : ''
                                  }`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-semibold text-foreground text-sm flex-1">
                                        {chamado.titulo}
                                      </h4>
                                      {chamado.prioridade === 'urgente' && (
                                        <Badge className="bg-red-600 text-white text-xs">
                                          🚨 Urgente
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                      {chamado.descricao}
                                    </p>

                                    {mostrarCliente && cliente && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                        <User className="w-3 h-3" />
                                        <span className="truncate">{cliente.nome}</span>
                                      </div>
                                    )}

                                    {mostrarTecnico && tecnico && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                        <Wrench className="w-3 h-3" />
                                        <span className="truncate">{tecnico.nome}</span>
                                      </div>
                                    )}

                                    {chamado.local && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate">{chamado.local}</span>
                                      </div>
                                    )}

                                    {chamado.data_agendamento && (
                                      <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                          {format(new Date(chamado.data_agendamento), "dd/MM HH:mm")}
                                        </span>
                                      </div>
                                    )}

                                    {chamado.data_lembrete_proxima_manutencao && (
                                      <div className="flex items-center gap-1 text-xs text-amber-700 mb-2 bg-amber-50 rounded px-1.5 py-0.5">
                                        <Bell className="w-3 h-3" />
                                        <span>
                                          Manutenção: {format(new Date(chamado.data_lembrete_proxima_manutencao + 'T00:00:00'), "dd/MM/yyyy")}
                                        </span>
                                      </div>
                                    )}

                                    {chamado.status === 'aguardando_aprovacao_empresa' && (
                                      <Badge className="bg-yellow-100 text-yellow-800 text-xs w-full justify-center">
                                        ⏳ Aguardando Aprovação
                                      </Badge>
                                    )}

                                    {/* Botões para visualização do cliente (mostrarBotoes = false) */}
                                    {!mostrarBotoes && chamado.status === 'finalizado' && onVisualizarChamado && (
                                      <div className="mt-3">
                                        <Button
                                          size="sm"
                                          onClick={() => onVisualizarChamado(chamado)}
                                          className="w-full bg-blue-600 hover:bg-blue-700"
                                        >
                                          <Eye className="w-3 h-3 mr-2" />
                                          Ver Relatório
                                        </Button>
                                      </div>
                                    )}

                                    {mostrarBotoes && onStatusChange && chamado.status !== 'aguardando_aprovacao_empresa' && (
                                      <div className="mt-3 md:hidden">
                                        <label className="sr-only" htmlFor={`status-kanban-${chamado.id}`}>Etapa de {chamado.titulo}</label>
                                        <select
                                          id={`status-kanban-${chamado.id}`}
                                          value={chamado.status}
                                          onChange={(event) => onStatusChange(chamado.id, event.target.value)}
                                          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                          <option value="pendente">Pendente</option>
                                          <option value="em_andamento">Em andamento</option>
                                          <option value="finalizado">Concluído</option>
                                        </select>
                                      </div>
                                    )}

                                    {mostrarBotoes && (
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        {onView && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onView(chamado)}
                                            className="min-h-11 text-xs"
                                          >
                                            <Eye className="w-3 h-3 mr-1" />
                                            Ver
                                          </Button>
                                        )}
                                        
                                        {!chamado.data_agendamento && chamado.status !== 'finalizado' && chamado.status !== 'cancelado' && chamado.status !== 'aguardando_aprovacao_empresa' && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setAgendandoChamado(chamado)}
                                            className="min-h-11 text-xs text-blue-600 hover:text-blue-700"
                                          >
                                            <Calendar className="w-3 h-3 mr-1" />
                                            Agendar
                                          </Button>
                                        )}

                                        {chamado.status === 'aguardando_aprovacao_empresa' && onAprovar && (
                                          <Button
                                            size="sm"
                                            onClick={() => onAprovar(chamado)}
                                            className="col-span-2 min-h-11 text-xs bg-orange-600 hover:bg-orange-700"
                                          >
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Revisar
                                          </Button>
                                        )}

                                        {chamado.status === 'finalizado' && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleBaixarPDF(chamado)}
                                            disabled={baixandoPDF === chamado.id}
                                            className="min-h-11 text-xs text-green-600 hover:text-green-700"
                                          >
                                            <Download className="w-3 h-3 mr-1" />
                                            PDF
                                          </Button>
                                        )}
                                        
                                        {onEdit && chamado.status !== 'aguardando_aprovacao_empresa' && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onEdit(chamado)}
                                            className="min-h-11 text-xs"
                                          >
                                            <Edit className="w-3 h-3 mr-1" />
                                            Editar
                                          </Button>
                                        )}
                                        
                                        {podeFechar && onFecharChamado && (
                                          <Button
                                            size="sm"
                                            onClick={() => onFecharChamado(chamado)}
                                            className="min-h-11 text-xs bg-green-600 hover:bg-green-700"
                                          >
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Fechar
                                          </Button>
                                        )}
                                        
                                        {onDelete && chamado.status !== 'aguardando_aprovacao_empresa' && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onDelete(chamado.id)}
                                            className="min-h-11 text-xs text-red-600 hover:text-red-700"
                                            aria-label={`Excluir chamado ${chamado.titulo}`}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </CardContent>
                  </Card>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {agendandoChamado && (
        <AgendarChamadoModal
          chamado={agendandoChamado}
          tecnicos={tecnicos}
          cliente={clientes?.find(c => c.id === agendandoChamado.cliente_id)}
          onClose={() => setAgendandoChamado(null)}
        />
      )}
    </>
  );
}