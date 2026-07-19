import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Edit, Navigation, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const tiposConfig = {
  entrada: { label: "Entrada", icon: "🟢", cor: "bg-green-100 text-green-800" },
  saida_almoco: { label: "Saída Almoço", icon: "🍽️", cor: "bg-orange-100 text-orange-800" },
  retorno: { label: "Retorno", icon: "🟡", cor: "bg-yellow-100 text-yellow-800" },
  saida_final: { label: "Saída Final", icon: "🔴", cor: "bg-red-100 text-red-800" }
};

// Função para formatar data em Brasília
const formatarDataBrasilia = (dataString, formato) => {
  const data = new Date(dataString);
  return format(data, formato, { locale: ptBR });
};

// Função para obter chave de agrupamento (dia)
const obterChaveData = (dataString) => {
  const data = new Date(dataString);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export default function ListaPontos({ pontos, tecnicos, isLoading, podeEditar = false }) {
  const [editandoPonto, setEditandoPonto] = useState(null);
  const [novaDataHora, setNovaDataHora] = useState("");
  const [adicionandoPonto, setAdicionandoPonto] = useState(null);
  const [novoPonto, setNovoPonto] = useState({
    tipo_registro: 'entrada',
    data_hora: '',
    observacoes: ''
  });
  const queryClient = useQueryClient();

  const editarPontoMutation = useMutation({
    mutationFn: async ({ id, data_hora }) => {
      // Criar data com offset de Brasília
      const dataObj = new Date(data_hora);
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const hora = String(dataObj.getHours()).padStart(2, '0');
      const minuto = String(dataObj.getMinutes()).padStart(2, '0');
      const segundo = String(dataObj.getSeconds()).padStart(2, '0');
      const dataComOffset = `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}-03:00`;

      await base44.entities.PontoEletronico.update(id, {
        data_hora: dataComOffset,
        status: 'aguardando_aprovacao',
        editado_por: await base44.auth.me().then(u => u.email)
      });

      const tecnico = tecnicos.find(t => t.id === editandoPonto.tecnico_id);
      if (tecnico?.email) {
        await base44.integrations.Core.SendEmail({
          to: tecnico.email,
          subject: "⚠️ Solicitação de Aprovação - Edição de Ponto",
          body: `Olá ${tecnico.nome},

A empresa editou um registro de ponto:

📅 Data Original: ${formatarDataBrasilia(editandoPonto.data_hora, "dd/MM/yyyy HH:mm")}
📅 Nova Data: ${formatarDataBrasilia(dataComOffset, "dd/MM/yyyy HH:mm")}
🔹 Tipo: ${tiposConfig[editandoPonto.tipo_registro]?.label}

Por favor, acesse o sistema para aprovar ou rejeitar esta alteração.

Atenciosamente,
Sistema ClimaPro`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pontos']);
      setEditandoPonto(null);
      alert("✅ Ponto editado! Aguardando aprovação do técnico.");
    },
    onError: (error) => {
      console.error("Erro ao editar ponto:", error);
      alert("❌ Erro ao editar ponto");
    }
  });

  const excluirPontoMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.PontoEletronico.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pontos']);
      alert("✅ Ponto excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir ponto:", error);
      alert("❌ Erro ao excluir ponto");
    }
  });

  const adicionarPontoMutation = useMutation({
    mutationFn: async ({ tecnicoId, empresaId, data, tipo, hora, observacoes }) => {
      const dataHoraCompleta = `${data}T${hora}:00-03:00`;
      
      // Buscar último ponto do técnico para obter localização
      const pontosTecnico = pontos.filter(p => p.tecnico_id === tecnicoId);
      const ultimoPonto = pontosTecnico[pontosTecnico.length - 1];
      
      await base44.entities.PontoEletronico.create({
        empresa_id: empresaId,
        tecnico_id: tecnicoId,
        tipo_registro: tipo,
        data_hora: dataHoraCompleta,
        latitude: ultimoPonto?.latitude || 0,
        longitude: ultimoPonto?.longitude || 0,
        endereco: ultimoPonto?.endereco || 'Registro manual',
        observacoes: observacoes || 'Registro manual adicionado pela empresa',
        status: 'aprovado_manual'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pontos']);
      setAdicionandoPonto(null);
      setNovoPonto({ tipo_registro: 'entrada', data_hora: '', observacoes: '' });
      alert("✅ Ponto adicionado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao adicionar ponto:", error);
      alert("❌ Erro ao adicionar ponto");
    }
  });

  const handleEditar = (ponto) => {
    setEditandoPonto(ponto);
    const dataObj = new Date(ponto.data_hora);
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const hora = String(dataObj.getHours()).padStart(2, '0');
    const minuto = String(dataObj.getMinutes()).padStart(2, '0');
    setNovaDataHora(`${ano}-${mes}-${dia}T${hora}:${minuto}`);
  };

  const handleConfirmarEdicao = () => {
    if (!novaDataHora) {
      alert("⚠️ Selecione uma data e hora válida");
      return;
    }

    editarPontoMutation.mutate({
      id: editandoPonto.id,
      data_hora: novaDataHora
    });
  };

  const handleExcluir = (ponto) => {
    if (window.confirm(`Tem certeza que deseja excluir este ponto?\n\n${tiposConfig[ponto.tipo_registro]?.label} - ${formatarDataBrasilia(ponto.data_hora, "dd/MM/yyyy HH:mm")}`)) {
      excluirPontoMutation.mutate(ponto.id);
    }
  };

  const handleAbrirAdicionarPonto = (tecnicoId, empresaId, data) => {
    setAdicionandoPonto({ tecnicoId, empresaId, data });
    setNovoPonto({ tipo_registro: 'entrada', data_hora: '', observacoes: '' });
  };

  const handleConfirmarAdicao = () => {
    if (!novoPonto.data_hora) {
      alert("⚠️ Selecione o horário");
      return;
    }

    const [hora, minuto] = novoPonto.data_hora.split(':');
    adicionarPontoMutation.mutate({
      tecnicoId: adicionandoPonto.tecnicoId,
      empresaId: adicionandoPonto.empresaId,
      data: adicionandoPonto.data,
      tipo: novoPonto.tipo_registro,
      hora: `${hora}:${minuto}`,
      observacoes: novoPonto.observacoes
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando registros...</p>
        </CardContent>
      </Card>
    );
  }

  if (pontos.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum registro de ponto encontrado</p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar pontos por técnico e data
  const pontosPorTecnicoDia = {};
  pontos.forEach(ponto => {
    const chaveData = obterChaveData(ponto.data_hora);
    const chave = `${ponto.tecnico_id}_${chaveData}`;
    if (!pontosPorTecnicoDia[chave]) {
      pontosPorTecnicoDia[chave] = [];
    }
    pontosPorTecnicoDia[chave].push(ponto);
  });

  return (
    <>
      <div className="space-y-4">
        {Object.entries(pontosPorTecnicoDia).map(([chave, pontosDia]) => {
          const [tecnicoId, data] = chave.split('_');
          const tecnico = tecnicos.find(t => t.id === tecnicoId);
          pontosDia.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

          const entrada = pontosDia.find(p => p.tipo_registro === 'entrada');
          const saida = pontosDia.find(p => p.tipo_registro === 'saida_final');
          
          let totalHoras = null;
          if (entrada && saida) {
            const diffMs = new Date(saida.data_hora) - new Date(entrada.data_hora);
            const diffHoras = diffMs / (1000 * 60 * 60);
            // Descontar 1 hora de almoço
            const horasTrabalhadas = diffHoras - 1;
            totalHoras = horasTrabalhadas.toFixed(2);
          }

          const primeiroPonto = pontosDia[0];

          return (
            <Card key={chave} className="shadow-lg border-none">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{tecnico?.nome || 'Técnico Desconhecido'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatarDataBrasilia(pontosDia[0].data_hora, "dd 'de' MMMM 'de' yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {podeEditar && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirAdicionarPonto(
                          primeiroPonto.tecnico_id, 
                          primeiroPonto.empresa_id, 
                          data
                        )}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Batida
                      </Button>
                    )}
                    {totalHoras && (
                      <Badge className="bg-indigo-100 text-indigo-800 text-lg px-4 py-2">
                        {totalHoras}h trabalhadas
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {pontosDia.map((ponto) => {
                    const config = tiposConfig[ponto.tipo_registro] || {
                      label: ponto.tipo_registro || "Desconhecido",
                      icon: "❓",
                      cor: "bg-muted text-foreground"
                    };
                    
                    return (
                      <div key={ponto.id} className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <Badge className={config.cor}>
                            {config.icon} {config.label}
                          </Badge>
                          <div>
                            <p className="font-semibold text-foreground">
                              {formatarDataBrasilia(ponto.data_hora, 'HH:mm:ss')}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-md">{ponto.endereco}</span>
                            </div>
                            {ponto.observacoes && (
                              <p className="text-xs text-muted-foreground mt-1">{ponto.observacoes}</p>
                            )}
                            {ponto.status === 'aguardando_aprovacao' && (
                              <Badge className="bg-yellow-100 text-yellow-800 mt-2">
                                ⏳ Aguardando aprovação do técnico
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(`https://www.google.com/maps?q=${ponto.latitude},${ponto.longitude}`, '_blank')}
                            title="Ver no mapa"
                          >
                            <Navigation className="w-4 h-4" />
                          </Button>
                          {podeEditar && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditar(ponto)}
                                title="Editar horário"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleExcluir(ponto)}
                                className="text-red-600 hover:text-red-700"
                                title="Excluir ponto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editandoPonto && (
        <Dialog open={!!editandoPonto} onOpenChange={() => setEditandoPonto(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Ponto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Tipo de Registro</Label>
                <p className="text-sm font-semibold">
                  {tiposConfig[editandoPonto.tipo_registro]?.icon}{' '}
                  {tiposConfig[editandoPonto.tipo_registro]?.label}
                </p>
              </div>
              <div>
                <Label>Horário Original</Label>
                <p className="text-sm text-muted-foreground">
                  {formatarDataBrasilia(editandoPonto.data_hora, "dd/MM/yyyy HH:mm:ss")}
                </p>
              </div>
              <div>
                <Label htmlFor="nova-data">Nova Data e Hora</Label>
                <Input
                  id="nova-data"
                  type="datetime-local"
                  value={novaDataHora}
                  onChange={(e) => setNovaDataHora(e.target.value)}
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Esta alteração será enviada para aprovação do técnico.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditandoPonto(null)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarEdicao} disabled={editarPontoMutation.isPending}>
                {editarPontoMutation.isPending ? "Salvando..." : "Salvar Alteração"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {adicionandoPonto && (
        <Dialog open={!!adicionandoPonto} onOpenChange={() => setAdicionandoPonto(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Batida Manual</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Data</Label>
                <p className="text-sm font-semibold">
                  {format(new Date(adicionandoPonto.data), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <Label htmlFor="tipo-registro">Tipo de Batida</Label>
                <Select 
                  value={novoPonto.tipo_registro} 
                  onValueChange={(value) => setNovoPonto({...novoPonto, tipo_registro: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">🟢 Entrada</SelectItem>
                    <SelectItem value="saida_almoco">🍽️ Saída Almoço</SelectItem>
                    <SelectItem value="retorno">🟡 Retorno</SelectItem>
                    <SelectItem value="saida_final">🔴 Saída Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="horario">Horário</Label>
                <Input
                  id="horario"
                  type="time"
                  value={novoPonto.data_hora}
                  onChange={(e) => setNovoPonto({...novoPonto, data_hora: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Input
                  id="observacoes"
                  placeholder="Motivo da inclusão manual..."
                  value={novoPonto.observacoes}
                  onChange={(e) => setNovoPonto({...novoPonto, observacoes: e.target.value})}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ℹ️ Este ponto será marcado como "Aprovado Manual" pela empresa.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdicionandoPonto(null)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarAdicao} disabled={adicionarPontoMutation.isPending}>
                {adicionarPontoMutation.isPending ? "Adicionando..." : "Adicionar Batida"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}