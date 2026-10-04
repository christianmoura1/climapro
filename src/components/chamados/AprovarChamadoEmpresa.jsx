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
  MessageCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/api/supabaseClient";
import { previewNumero } from "@/lib/whatsapp";

export default function AprovarChamadoEmpresa({ chamado, cliente, tecnico, onClose }) {
  const [observacoesEmpresa, setObservacoesEmpresa] = useState("");
  const [observacoesTecnico, setObservacoesTecnico] = useState(chamado.observacoes_tecnico || "");
  const [modoEdicao, setModoEdicao] = useState(false);
  const [nomeCliente, setNomeCliente] = useState(cliente?.nome || "");
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [dataLembrete, setDataLembrete] = useState(chamado.data_lembrete_proxima_manutencao || "");
  const [horaLembrete, setHoraLembrete] = useState(chamado.hora_lembrete_proxima_manutencao || "");
  const [emailCliente, setEmailCliente] = useState(cliente?.email || "");
  const [whatsappCliente, setWhatsappCliente] = useState(cliente?.whatsapp || cliente?.telefone || "");
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(!!(cliente?.whatsapp || cliente?.telefone));
  const queryClient = useQueryClient();

  const numeroFinal = previewNumero(whatsappCliente);

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

      // 3. Relatório para o cliente, pelo WhatsApp.
      //
      // Aqui ficava um notificarPorEmail(), que é no-op desde que o envio de
      // e-mail foi desligado. A tela dizia que o cliente tinha sido notificado
      // e não saía nada.
      //
      // A falha do envio não desfaz a aprovação: o chamado já está finalizado
      // no banco e reverter por causa de uma mensagem seria pior. O aviso sobe
      // no toast para o operador decidir o que fazer.
      let avisoEnvio = null;
      if (enviarWhatsapp) {
        if (!numeroFinal) {
          avisoEnvio = 'Relatório não enviado: número de WhatsApp em branco ou incompleto.';
        } else {
          const { error } = await supabase.rpc('whatsapp_enviar_relatorio', {
            p_chamado_id: chamado.id,
            p_destino: whatsappCliente,
          });
          if (error) avisoEnvio = `Chamado aprovado, mas o relatório não saiu: ${error.message}`;
        }
      }

      if (cliente?.id && whatsappCliente && whatsappCliente !== cliente.whatsapp) {
        await base44.entities.Cliente.update(cliente.id, { whatsapp: whatsappCliente });
      }

      return { avisoEnvio };
    },
    onSuccess: ({ avisoEnvio }) => {
      queryClient.invalidateQueries(['chamados']);
      queryClient.invalidateQueries(['agenda-eventos']);
      queryClient.invalidateQueries(['meus-chamados-cliente']);
      queryClient.invalidateQueries(['chamados-aguardando-aprovacao']);
      if (avisoEnvio) {
        toast({ description: `⚠️ ${avisoEnvio}`, variant: "destructive" });
      } else {
        toast({
          description: enviarWhatsapp
            ? "✅ Chamado aprovado e relatório enviado ao cliente no WhatsApp."
            : "✅ Chamado aprovado.",
          variant: "success",
        });
      }
      onClose();
    }
  });

  const reabrirMutation = useMutation({
    mutationFn: async (motivo) => {
      await base44.entities.Chamado.update(chamado.id, {
        status: 'em_andamento',
        motivo_reabertura: motivo
      });

      // Aqui havia um e-mail para o técnico, que não sai desde que o envio
      // foi desligado. O chamado volta para ele no painel e no app; avisar
      // também no WhatsApp é um passo à parte, ainda não feito.
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chamados']);
      queryClient.invalidateQueries(['chamados-aguardando-aprovacao']);
      toast({ description: "⚠️ Chamado reaberto. Ele volta para o painel do técnico.", variant: "warning" });
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
              <p className="text-sm text-muted-foreground mt-1">{cliente?.nome}</p>
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
                  <p className="text-xs text-muted-foreground">Cliente</p>
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
                      <button onClick={() => setEditandoCliente(true)} className="text-muted-foreground hover:text-blue-600">
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Técnico</p>
                  <p className="font-semibold">{tecnico?.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Finalização</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(chamado.data_finalizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confirmado por</p>
                  <p className="font-semibold">{chamado.nome_cliente_confirmacao}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Descrição */}
          <Card className="border-2 border-border">
            <CardHeader>
              <CardTitle className="text-base">📋 Descrição do Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{chamado.descricao}</p>
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
                <p className="text-foreground whitespace-pre-wrap bg-white p-4 rounded-lg">
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
                        className="w-full h-32 object-cover rounded-lg border-2 border-border hover:border-blue-400 transition-colors"
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
                    className="max-w-md mx-auto border-2 border-border rounded-lg"
                  />
                  <p className="mt-3 font-medium text-foreground">
                    {chamado.nome_cliente_confirmacao}
                  </p>
                  <p className="text-sm text-muted-foreground">Confirmação do serviço</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Envio do relatório ao cliente */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Enviar relatório ao cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4 rounded-lg border bg-white p-3">
                <div>
                  <p className="font-medium text-sm">Mandar por WhatsApp ao aprovar</p>
                  <p className="text-xs text-muted-foreground">
                    Sai do número do ClimaPro com o resumo do que foi feito.
                  </p>
                </div>
                <Switch
                  checked={enviarWhatsapp}
                  onCheckedChange={setEnviarWhatsapp}
                  aria-label="Enviar relatório por WhatsApp"
                />
              </div>

              {enviarWhatsapp && (
                <div>
                  <Label htmlFor="whatsapp-cliente">WhatsApp do cliente</Label>
                  <Input
                    id="whatsapp-cliente"
                    value={whatsappCliente}
                    onChange={(e) => setWhatsappCliente(e.target.value)}
                    placeholder="(27) 99999-9999"
                    inputMode="tel"
                    className="mt-2 max-w-md"
                  />
                  {numeroFinal ? (
                    <p className="text-xs text-green-700 mt-2">
                      Vai para <span className="font-mono">{numeroFinal}</span>.
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 mt-2">
                      Preencha com DDD, senão nada é enviado.
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="email-cliente">E-mail do cliente</Label>
                <Input
                  id="email-cliente"
                  type="email"
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                  placeholder="cliente@email.com"
                  className="mt-2 max-w-md"
                />
                {/* O envio por e-mail está desligado no sistema desde o erro do
                    Resend. O campo continua porque guarda o contato na ficha do
                    cliente, mas prometer envio aqui era mentira: a tela dizia
                    "Cliente foi notificado por email" e não saía nada. */}
                <p className="text-xs text-muted-foreground mt-2">
                  Fica salvo na ficha do cliente. O envio automático por e-mail está desligado
                  hoje; o relatório vai pelo WhatsApp.
                </p>
              </div>
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
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <Input
                    type="date"
                    value={dataLembrete}
                    onChange={(e) => setDataLembrete(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
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
                💡 Na data escolhida, você verá um alerta no painel.
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
                <li><strong>Aprovar</strong> para finalizar e mandar o relatório ao cliente no WhatsApp</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}