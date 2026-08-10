
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle,
  X,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  MapPin,
  Calendar,
  User,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { calcularProximaManutencao, resultadoChecklistItem } from "@/lib/pmocChecklist";
import { notificarPorEmail } from "@/lib/notificacoes";

export default function AprovarPMOCEmpresa({ manutencao, pmoc, cliente, tecnico, equipamentos, onClose }) {
  const [observacoesEmpresa, setObservacoesEmpresa] = useState(manutencao.observacoes_empresa || '');
  const [observacoesTecnico, setObservacoesTecnico] = useState(manutencao.observacoes_tecnico || ''); // New state for editable technical observations
  const queryClient = useQueryClient();

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const hoje = new Date();

      // 1. Atualizar cada equipamento: toda visita do PMOC é mensal no mínimo
      // (checagem básica), então a próxima manutenção é sempre daqui a 1 mês,
      // para TODOS — o que muda mês a mês é o nível do checklist, e isso é
      // regido pela âncora do Plano Anual, não por esta data. Sem isso, quem
      // passasse só pela checagem mensal ficava com proxima_manutencao nula e
      // aparecia como "Nunca executado" mesmo depois de executar.
      const datasAtualizadas = [];
      for (const equipamento of equipamentos || []) {
        const proxima = calcularProximaManutencao(hoje, 'mensal');
        datasAtualizadas.push(proxima);
        await base44.entities.Equipamento.update(equipamento.id, {
          ultima_manutencao: hoje.toISOString().split('T')[0],
          proxima_manutencao: proxima.toISOString().split('T')[0],
        });
      }
      // Próxima manutenção do "cabeçalho" do PMOC = a mais próxima entre os
      // equipamentos (mantém os widgets antigos — dashboard/lista — úteis).
      const proximaManutencao = datasAtualizadas.length > 0
        ? new Date(Math.min(...datasAtualizadas.map((d) => d.getTime())))
        : calcularProximaManutencao(hoje, pmoc.periodicidade);

      // 2. Atualizar manutenção - status direto para "concluida"
      await base44.entities.ManutencaoPMOC.update(manutencao.id, {
        status: 'concluida',
        observacoes_empresa: observacoesEmpresa,
        observacoes_tecnico: observacoesTecnico, // Include updated technical observations
        data_aprovacao_empresa: new Date().toISOString(),
        aprovado_por_empresa: user.email
      });

      // 3. Atualizar PMOC - status direto para "aguardando_execucao" para próximo ciclo
      await base44.entities.PMOC.update(pmoc.id, {
        status: 'aguardando_execucao',
        observacoes_empresa: observacoesEmpresa,
        proxima_manutencao: proximaManutencao.toISOString().split('T')[0],
        data_execucao_programada: proximaManutencao.toISOString().split('T')[0],
        data_aprovacao_empresa: new Date().toISOString(),
        aprovado_por: user.email
      });

      // 4. Enviar notificação ao cliente com link para visualizar
      if (cliente?.email) {
        await notificarPorEmail({
          to: cliente.email,
          subject: `✅ PMOC Concluído - ${cliente.nome} - ClimaPro`,
          body: `Prezado(a) ${cliente.nome},

A manutenção preventiva (PMOC) foi concluída com sucesso em seu estabelecimento:

📅 Data de Execução: ${format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
🔧 Técnico: ${tecnico?.nome}
🏢 Equipamentos: ${equipamentos?.length || 0}
📝 Periodicidade: ${pmoc.periodicidade}

✅ O serviço foi revisado e aprovado pela nossa equipe.
📆 Próxima Manutenção: ${format(proximaManutencao, "dd/MM/yyyy", { locale: ptBR })}

📋 Para visualizar o relatório completo do serviço executado, acesse:
👉 https://geradordepmoc.com.br

No portal, você poderá:
• Ver todos os itens executados
• Visualizar fotos do serviço
• Ver assinatura do responsável
• Baixar o PDF do relatório

Atenciosamente,
Equipe ClimaPro`
        });
      }
      
      // 5. Enviar notificação ao técnico
      if (tecnico?.email) {
        await notificarPorEmail({
          to: tecnico.email,
          subject: `✅ PMOC Aprovado - ${cliente.nome}`,
          body: `Olá ${tecnico.nome},

O PMOC do cliente ${cliente.nome} foi aprovado pela empresa!

📅 Executado em: ${format(new Date(manutencao.data_execucao), "dd/MM/yyyy", { locale: ptBR })}
📆 Próxima Execução: ${format(proximaManutencao, "dd/MM/yyyy", { locale: ptBR })}

Parabéns pelo trabalho realizado!

Atenciosamente,
Equipe ClimaPro`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['manutencoes-pmoc']);
      queryClient.invalidateQueries(['pmocs']);
      queryClient.invalidateQueries(['manutencoes-aguardando-aprovacao']);
      alert("✅ PMOC aprovado e concluído com sucesso!\n\nO cliente foi notificado e já pode visualizar o relatório.");
      onClose();
    }
  });

  const reabrirMutation = useMutation({
    mutationFn: async (motivo) => {
      const user = await base44.auth.me();
      
      await base44.entities.ManutencaoPMOC.update(manutencao.id, {
        status: 'reaberta',
        motivo_reabertura: motivo
      });

      await base44.entities.PMOC.update(pmoc.id, {
        status: 'reaberto',
        motivo_reabertura: motivo
      });

      // Notificar técnico
      if (tecnico?.email) {
        await notificarPorEmail({
          to: tecnico.email,
          subject: `⚠️ PMOC Reaberto para Correção - ${cliente.nome}`,
          body: `Olá ${tecnico.nome},

O PMOC do cliente ${cliente.nome} foi reaberto para correção.

Motivo: ${motivo}

Por favor, revise e execute novamente o PMOC.

Atenciosamente,
Equipe ClimaPro`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['manutencoes-pmoc']);
      queryClient.invalidateQueries(['pmocs']);
      toast({ description: "⚠️ PMOC reaberto! O técnico foi notificado.", variant: "warning" });
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
              <CardTitle className="text-2xl">🔍 Revisar e Aprovar PMOC</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{cliente.nome}</p>
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
                  <p className="font-semibold">{cliente.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Técnico</p>
                  <p className="font-semibold">{tecnico?.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de Execução</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(manutencao.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Equipamentos</p>
                  <p className="font-semibold">{equipamentos?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipamentos e Checklists */}
          <div>
            <h3 className="text-lg font-semibold mb-4">📋 Checklist Executado por Equipamento</h3>
            <div className="space-y-4">
              {equipamentos?.map((equipamento, index) => {
                const checklist = manutencao.checklists_por_equipamento?.[equipamento.id] || [];
                const fotos = manutencao.fotos_por_equipamento?.[equipamento.id] || [];
                const itensConcluidos = checklist.filter(i => i.concluido).length;

                return (
                  <Card key={equipamento.id} className="border-2 border-green-200 bg-green-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">
                            Equipamento {index + 1}: {equipamento.tipo} {equipamento.marca} {equipamento.modelo}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            📍 {equipamento.localizacao} • {equipamento.capacidade}
                          </p>
                        </div>
                        <Badge className="bg-green-600 text-white">
                          {itensConcluidos}/{checklist.length} itens
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Checklist */}
                      <div className="space-y-2">
                        {checklist.map((item, itemIndex) => (
                          <div key={itemIndex} className={`flex items-start gap-3 rounded-lg p-3 ${
                            resultadoChecklistItem(item) === 'nok' ? 'border border-red-200 bg-red-50' : 'bg-card'
                          }`}>
                            {resultadoChecklistItem(item) === 'ok' ? (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : resultadoChecklistItem(item) === 'nok' ? (
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className={resultadoChecklistItem(item) === 'pendente' ? 'text-muted-foreground' : ''}>
                                {item.descricao}
                                {resultadoChecklistItem(item) === 'nok' && (
                                  <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                    Não conforme
                                  </span>
                                )}
                              </p>
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
                              Fotos ({fotos.length})
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

          {/* Observações do Técnico - EDITÁVEL */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Observações do Técnico
                </CardTitle>
                <Badge variant="outline" className="bg-white">
                  Editável pela Empresa
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Label htmlFor="obs-tecnico">Você pode editar as observações do técnico antes de aprovar:</Label>
              <Textarea
                id="obs-tecnico"
                value={observacoesTecnico}
                onChange={(e) => setObservacoesTecnico(e.target.value)}
                placeholder="Observações do técnico..."
                rows={4}
                className="mt-2"
              />
            </CardContent>
          </Card>

          {/* Assinaturas do Técnico e do Cliente */}
          {(manutencao.assinatura_tecnico || manutencao.assinatura_cliente) && (
            <Card className="border-2 border-indigo-200 bg-indigo-50">
              <CardHeader>
                <CardTitle className="text-base">✍️ Assinaturas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {manutencao.assinatura_tecnico && (
                    <div className="bg-white p-4 rounded-lg text-center">
                      <img
                        src={manutencao.assinatura_tecnico}
                        alt="Assinatura do Técnico"
                        className="max-w-full mx-auto border-2 border-border rounded-lg"
                      />
                      <p className="mt-3 font-medium text-foreground">
                        {manutencao.nome_responsavel_local}
                      </p>
                      <p className="text-sm text-muted-foreground">Técnico responsável</p>
                    </div>
                  )}
                  {manutencao.assinatura_cliente && (
                    <div className="bg-white p-4 rounded-lg text-center">
                      <img
                        src={manutencao.assinatura_cliente}
                        alt="Assinatura do Cliente"
                        className="max-w-full mx-auto border-2 border-border rounded-lg"
                      />
                      <p className="mt-3 font-medium text-foreground">
                        {manutencao.nome_cliente_confirmacao}
                      </p>
                      <p className="text-sm text-muted-foreground">Responsável pelo local</p>
                    </div>
                  )}
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
                  📍 {manutencao.endereco || cliente.endereco}
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

          {/* Observações da Empresa */}
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Observações da Empresa (Opcional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="obs-empresa">Adicione comentários ou orientações antes de aprovar:</Label>
              <Textarea
                id="obs-empresa"
                value={observacoesEmpresa}
                onChange={(e) => setObservacoesEmpresa(e.target.value)}
                placeholder="Ex: Serviço executado conforme o esperado. Cliente orientado sobre próxima manutenção..."
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
                  Aprovar e Concluir PMOC
                </>
              )}
            </Button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <AlertCircle className="w-5 h-5 text-green-600 inline mr-2" />
            <span className="text-sm text-green-800">
              Após a aprovação, o PMOC será concluído e o cliente receberá notificação com acesso ao relatório
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
