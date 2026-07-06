import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  X,
  AlertCircle,
  Image as ImageIcon,
  Calendar,
  User,
  FileText,
  Edit,
  Mail,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AprovarChamadoEmpresa({ chamado, cliente, tecnico, onClose }) {
  const [observacoesEmpresa, setObservacoesEmpresa] = useState("");
  const [observacoesTecnico, setObservacoesTecnico] = useState(chamado.observacoes_tecnico || "");
  const [modoEdicao, setModoEdicao] = useState(false);
  const [nomeCliente, setNomeCliente] = useState(cliente?.nome || "");
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [dataLembrete, setDataLembrete] = useState(chamado.data_lembrete_proxima_manutencao || "");
  const [horaLembrete, setHoraLembrete] = useState(chamado.hora_lembrete_proxima_manutencao || "");
  const [emailCliente, setEmailCliente] = useState(cliente?.email || "");
  const queryClient = useQueryClient();

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // 1. Atualizar chamado para finalizado com as observações editadas
      const updateData = {
        status: 'finalizado',
        observacoes_empresa: observacoesEmpresa,
        observacoes_tecnico: observacoesTecnico
      };
      if (dataLembrete) {
        updateData.data_lembrete_proxima_manutencao = dataLembrete;
        updateData.hora_lembrete_proxima_manutencao = horaLembrete || "";
        updateData.lembrete_manutencao_enviado = false;
      }
      await base44.entities.Chamado.update(chamado.id, updateData);

      // 1b. Atualizar email do cliente se foi alterado
      if (cliente?.id && emailCliente && emailCliente !== cliente.email) {
        await base44.entities.Cliente.update(cliente.id, { email: emailCliente });
      }

      // 2. Atualizar evento vinculado para concluído
      const eventos = await base44.entities.AgendaEvento.filter({
        chamado_id: chamado.id
      });
      
      if (eventos.length > 0) {
        await base44.entities.AgendaEvento.update(eventos[0].id, {
          status: 'concluido'
        });
      }

      // 3. Enviar relatório completo ao cliente
      const emailDestino = emailCliente || cliente?.email;
      if (emailDestino) {
        await base44.integrations.Core.SendEmail({
          to: emailDestino,
          subject: `✅ Chamado Concluído - ${chamado.titulo} - ClimaPro`,
          body: `Prezado(a) ${nomeCliente},

O chamado de serviço foi concluído com sucesso:

📋 Chamado: ${chamado.titulo}
🔧 Técnico: ${tecnico?.nome}
📅 Finalizado em: ${format(new Date(chamado.data_finalizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}

📸 Fotos do serviço: ${chamado.fotos_finalizacao?.length || 0}
🎥 Vídeos do serviço: ${chamado.videos_finalizacao?.length || 0}
✍️ Confirmado por: ${chamado.nome_cliente_confirmacao}

${observacoesTecnico ? `📝 Observações do Técnico:\n${observacoesTecnico}\n\n` : ''}
${observacoesEmpresa ? `💼 Observações da Empresa:\n${observacoesEmpresa}\n\n` : ''}

Para visualizar o relatório completo com todas as fotos, vídeos e assinatura, acesse:
👉 https://climapro.base44.app

Obrigado pela preferência!

Atenciosamente,
ClimaPro`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados']);
      queryClient.invalidateQueries(['agenda-eventos']);
      queryClient.invalidateQueries(['meus-chamados-cliente']);
      queryClient.invalidateQueries(['chamados-aguardando-aprovacao']);
      alert("✅ Chamado aprovado! Cliente foi notificado por email.");
      onClose();
    }
  });

  const reabrirMutation = useMutation({
    mutationFn: async (motivo) => {
      await base44.entities.Chamado.update(chamado.id, {
        status: 'em_andamento',
        motivo_reabertura: motivo
      });

      // Notificar técnico
      if (tecnico?.email) {
        await base44.integrations.Core.SendEmail({
          to: tecnico.email,
          subject: `⚠️ Chamado Reaberto - ${chamado.titulo}`,
          body: `Olá ${tecnico.nome},

O chamado foi reaberto pela empresa para correção.

Motivo: ${motivo}

Por favor, revise e execute novamente o serviço.

Atenciosamente,
ClimaPro`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados']);
      queryClient.invalidateQueries(['chamados-aguardando-aprovacao']);
      alert("⚠️ Chamado reaberto! O técnico foi notificado.");
      onClose();
    }
  });

  const handleReabrir = () => {
    const motivo = prompt("Informe o motivo da reabertura:");
    if (motivo && motivo.trim()) {
      reabrirMutation.mutate(motivo.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-yellow-50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">🔍 Revisar e Aprovar Chamado</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{cliente?.nome}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Informações Gerais */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Cliente</p>
                  {editandoCliente ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                        className="h-7 text-sm"
                      />
                      <Button size="sm" className="h-7 px-2" onClick={() => setEditandoCliente(false)}>✓</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <p className="font-semibold">{nomeCliente}</p>
                      <button onClick={() => setEditandoCliente(true)} className="text-gray-400 hover:text-blue-600">
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600">Técnico</p>
                  <p className="font-semibold">{tecnico?.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Data de Finalização</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
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

          {/* Descrição */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">📋 Descrição do Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 whitespace-pre-wrap">{chamado.descricao}</p>
            </CardContent>
          </Card>

          {/* Observações do Técnico - EDITÁVEL */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Observações do Técnico
                </CardTitle>
                <Button
                  size="sm"
                  variant={modoEdicao ? "default" : "outline"}
                  onClick={() => setModoEdicao(!modoEdicao)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {modoEdicao ? "Salvar Edição" : "Editar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {modoEdicao ? (
                <>
                  <Label>Você pode editar as observações do técnico:</Label>
                  <Textarea
                    value={observacoesTecnico}
                    onChange={(e) => setObservacoesTecnico(e.target.value)}
                    rows={6}
                    className="mt-2"
                  />
                  <p className="text-xs text-blue-700 mt-2">
                    💡 As alterações serão salvas quando você aprovar o chamado
                  </p>
                </>
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg">
                  {observacoesTecnico || "Nenhuma observação registrada"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Fotos de Finalização */}
          {chamado.fotos_finalizacao && chamado.fotos_finalizacao.length > 0 && (
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Fotos do Serviço ({chamado.fotos_finalizacao.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {chamado.fotos_finalizacao.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vídeos de Finalização */}
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

          {/* Assinatura do Cliente */}
          {chamado.assinatura_cliente && (
            <Card className="border-2 border-indigo-200 bg-indigo-50">
              <CardHeader>
                <CardTitle className="text-base">✍️ Assinatura do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-lg text-center">
                  <img
                    src={chamado.assinatura_cliente}
                    alt="Assinatura"
                    className="max-w-md mx-auto border-2 border-gray-300 rounded-lg"
                  />
                  <p className="mt-3 font-medium text-gray-900">
                    {chamado.nome_cliente_confirmacao}
                  </p>
                  <p className="text-sm text-gray-500">Confirmação do serviço</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email do Cliente */}
          <Card className="border-2 border-cyan-200 bg-cyan-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="email-cliente">
                Email para envio do relatório e lembretes de manutenção:
              </Label>
              <Input
                id="email-cliente"
                type="email"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="cliente@email.com"
                className="mt-2 max-w-md"
              />
              <p className="text-xs text-cyan-700 mt-2">
                💡 O relatório de conclusão e os lembretes de manutenção serão enviados para este email.
              </p>
            </CardContent>
          </Card>

          {/* Lembrete de Próxima Manutenção */}
          <Card className="border-2 border-teal-200 bg-teal-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Lembrete de Próxima Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label>
                Defina data e hora para o ClimaPro te lembrar (e lembrar o cliente) da próxima manutenção:
              </Label>
              <div className="flex gap-3 mt-2 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Data</Label>
                  <Input
                    type="date"
                    value={dataLembrete}
                    onChange={(e) => setDataLembrete(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Hora
                  </Label>
                  <Input
                    type="time"
                    value={horaLembrete}
                    onChange={(e) => setHoraLembrete(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              </div>
              <p className="text-xs text-teal-700 mt-2">
                💡 Na data escolhida, você verá um alerta no painel e o cliente receberá um email de lembrete.
              </p>
            </CardContent>
          </Card>

          {/* Observações da Empresa */}
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Observações da Empresa (Opcional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="obs-empresa">Adicione comentários antes de aprovar e enviar ao cliente:</Label>
              <Textarea
                id="obs-empresa"
                value={observacoesEmpresa}
                onChange={(e) => setObservacoesEmpresa(e.target.value)}
                placeholder="Ex: Serviço executado conforme esperado. Cliente orientado sobre manutenção preventiva..."
                rows={4}
                className="mt-2"
              />
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReabrir}
              disabled={reabrirMutation.isPending}
              className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              ⚠️ Reabrir para Correção
            </Button>
            <Button
              onClick={() => aprovarMutation.mutate()}
              disabled={aprovarMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {aprovarMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar e Enviar ao Cliente
                </>
              )}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-blue-600 inline mr-2" />
            <div className="inline-block text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 Você pode:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Editar</strong> as observações do técnico antes de enviar ao cliente</li>
                <li><strong>Adicionar</strong> observações da empresa</li>
                <li><strong>Reabrir</strong> o chamado se algo precisa ser corrigido</li>
                <li><strong>Aprovar</strong> para enviar o relatório completo ao cliente por email</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}