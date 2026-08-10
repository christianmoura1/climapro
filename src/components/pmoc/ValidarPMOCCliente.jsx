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
  Image as ImageIcon,
  Calendar,
  User,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { notificarPorEmail } from "@/lib/notificacoes";

export default function ValidarPMOCCliente({ manutencao, pmoc, tecnico, equipamentos, onClose }) {
  const [observacoesCliente, setObservacoesCliente] = useState('');
  const queryClient = useQueryClient();

  const validarMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // 1. Atualizar manutenção
      await base44.entities.ManutencaoPMOC.update(manutencao.id, {
        status: 'concluida',
        observacoes_cliente: observacoesCliente,
        data_validacao_cliente: new Date().toISOString(),
        validado_por_cliente: user.full_name
      });

      // 2. Atualizar PMOC
      const hoje = new Date();
      let proximaManutencao = new Date(hoje);
      
      switch (pmoc.periodicidade) {
        case 'mensal':
          proximaManutencao.setMonth(proximaManutencao.getMonth() + 1);
          break;
        case 'bimestral':
          proximaManutencao.setMonth(proximaManutencao.getMonth() + 2);
          break;
        case 'trimestral':
          proximaManutencao.setMonth(proximaManutencao.getMonth() + 3);
          break;
        case 'semestral':
          proximaManutencao.setMonth(proximaManutencao.getMonth() + 6);
          break;
        case 'anual':
          proximaManutencao.setFullYear(proximaManutencao.getFullYear() + 1);
          break;
      }

      await base44.entities.PMOC.update(pmoc.id, {
        status: 'aguardando_execucao',
        proxima_manutencao: proximaManutencao.toISOString().split('T')[0],
        data_execucao_programada: proximaManutencao.toISOString().split('T')[0],
        data_validacao_cliente: new Date().toISOString(),
        validado_por_cliente: user.full_name
      });

      // 3. Notificar empresa
      const empresas = await base44.entities.Empresa.list();
      const empresa = empresas.find(e => e.id === manutencao.empresa_id);
      
      if (empresa?.email_contato) {
        await notificarPorEmail({
          to: empresa.email_contato,
          subject: `✅ PMOC Validado pelo Cliente - ${user.full_name}`,
          body: `Olá,

O cliente ${user.full_name} validou o PMOC:

📅 Data de Execução: ${format(new Date(manutencao.data_execucao), "dd/MM/yyyy", { locale: ptBR })}
🔧 Técnico: ${tecnico?.nome}
📆 Próxima Manutenção: ${format(proximaManutencao, "dd/MM/yyyy", { locale: ptBR })}

${observacoesCliente ? `💬 Observações do Cliente:\n${observacoesCliente}\n\n` : ''}O PMOC foi concluído com sucesso!

Atenciosamente,
ClimaPro`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['manutencoes-pmoc']);
      queryClient.invalidateQueries(['pmocs']);
      queryClient.invalidateQueries(['pmocs-cliente']);
      toast({ description: "✅ PMOC validado com sucesso! Obrigado pela confirmação.", variant: "success" });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">✅ Validar Conclusão do PMOC</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Revise o serviço executado</p>
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
            <h3 className="text-lg font-semibold mb-4">📋 Serviços Executados</h3>
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

          {/* Observações do Cliente */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Suas Observações (Opcional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="obs-cliente">Adicione comentários sobre o serviço executado:</Label>
              <Textarea
                id="obs-cliente"
                value={observacoesCliente}
                onChange={(e) => setObservacoesCliente(e.target.value)}
                placeholder="Ex: Serviço executado conforme o combinado. Técnico muito atencioso..."
                rows={3}
                className="mt-2"
              />
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              onClick={() => validarMutation.mutate()}
              disabled={validarMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {validarMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Conclusão do PMOC
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}