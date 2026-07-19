import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

export default function NovoEventoModal({ eventoInicial, onClose, clientes, tecnicos, user }) {
  const [evento, setEvento] = useState(eventoInicial ? {
    ...eventoInicial,
    data_inicio: eventoInicial.data_inicio ? format(new Date(eventoInicial.data_inicio), 'yyyy-MM-dd') : '',
    hora_inicio: eventoInicial.data_inicio ? format(new Date(eventoInicial.data_inicio), 'HH:mm') : '',
    data_fim: eventoInicial.data_fim ? format(new Date(eventoInicial.data_fim), 'yyyy-MM-dd') : '',
    hora_fim: eventoInicial.data_fim ? format(new Date(eventoInicial.data_fim), 'HH:mm') : ''
  } : {
    titulo: "",
    descricao: "",
    cliente_id: "",
    tecnico_id: "",
    tipo: "manual",
    data_inicio: "",
    hora_inicio: "",
    data_fim: "",
    hora_fim: "",
    endereco: "",
    cor: "#3b82f6"
  });
  
  const [eventoRecemCriado, setEventoRecemCriado] = useState(null);
  const [mostrarPromptChamado, setMostrarPromptChamado] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log("[NovoEventoModal] Criando evento:", data);
      
      const dataInicio = new Date(`${data.data_inicio}T${data.hora_inicio}`);
      const dataFim = (data.data_fim && data.hora_fim) ? new Date(`${data.data_fim}T${data.hora_fim}`) : new Date(dataInicio.getTime() + 2 * 60 * 60 * 1000);
      
      const cliente = clientes.find(c => c.id === data.cliente_id);
      
      const novoEvento = await base44.entities.AgendaEvento.create({
        empresa_id: user.empresa_id,
        cliente_id: data.cliente_id,
        tecnico_id: data.tecnico_id,
        titulo: data.titulo,
        descricao: data.descricao,
        tipo: data.tipo,
        origem: 'manual',
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
        endereco: data.endereco || cliente?.endereco,
        latitude: cliente?.latitude,
        longitude: cliente?.longitude,
        status: 'pendente',
        cor: data.cor
      });
      
      console.log("[NovoEventoModal] Evento criado:", novoEvento);
      return novoEvento;
    },
    onSuccess: (novoEvento) => {
      console.log("[NovoEventoModal] onSuccess - tipo:", novoEvento.tipo);
      queryClient.invalidateQueries(['agenda-eventos']);
      setEventoRecemCriado(novoEvento);
      
      // Se for evento manual, SEMPRE perguntar se quer criar chamado
      if (novoEvento.tipo === 'manual') {
        console.log("[NovoEventoModal] Mostrando prompt de criação de chamado");
        setMostrarPromptChamado(true);
      } else {
        console.log("[NovoEventoModal] Evento não é manual, fechando modal");
        onClose();
        toast({ description: "✅ Evento criado com sucesso!", variant: "success" });
      }
    },
    onError: (error) => {
      console.error("[NovoEventoModal] Erro ao criar evento:", error);
      toast({ description: `❌ Erro ao criar evento: ${error.message}`, variant: "destructive" });
    }
  });

  const criarChamadoVinculado = async () => {
    console.log("[NovoEventoModal] Iniciando criação de chamado vinculado");
    try {
      const cliente = clientes.find(c => c.id === eventoRecemCriado.cliente_id);
      const tecnico = tecnicos.find(t => t.id === eventoRecemCriado.tecnico_id);
      
      console.log("[NovoEventoModal] Cliente encontrado:", cliente);
      console.log("[NovoEventoModal] Técnico encontrado:", tecnico);
      
      // Criar chamado com dados do evento
      const chamado = await base44.entities.Chamado.create({
        empresa_id: user.empresa_id,
        cliente_id: eventoRecemCriado.cliente_id,
        tecnico_id: eventoRecemCriado.tecnico_id,
        titulo: eventoRecemCriado.titulo,
        descricao: eventoRecemCriado.descricao,
        local: eventoRecemCriado.endereco || cliente?.endereco,
        tipo_problema: "outro",
        prioridade: "media",
        status: "pendente",
        data_abertura: new Date().toISOString(),
        data_agendamento: eventoRecemCriado.data_inicio,
        numero_chamado: `CH${Date.now()}`
      });
      
      console.log("[NovoEventoModal] Chamado criado:", chamado);
      
      // Atualizar evento com chamado_id
      await base44.entities.AgendaEvento.update(eventoRecemCriado.id, {
        chamado_id: chamado.id,
        tipo: 'chamado',
        cor: '#ef4444'
      });
      
      console.log("[NovoEventoModal] Evento atualizado com chamado_id");
      
      // Notificar técnico
      if (tecnico?.email) {
        await base44.integrations.Core.SendEmail({
          to: tecnico.email,
          subject: "🔧 Novo Chamado Criado - ClimaPro",
          body: `Olá ${tecnico.nome},

Um chamado foi criado a partir de um evento da agenda:

📋 ${chamado.titulo}
📅 Data: ${format(new Date(eventoRecemCriado.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
📍 Local: ${eventoRecemCriado.endereco || cliente?.endereco}
👤 Cliente: ${cliente?.nome}

Atenciosamente,
ClimaPro`
        });
        console.log("[NovoEventoModal] Email enviado para técnico");
      }
      
      // Invalidar queries
      await queryClient.invalidateQueries(['chamados']);
      await queryClient.invalidateQueries(['agenda-eventos']);
      
      console.log("[NovoEventoModal] Queries invalidadas, fechando modal");
      
      onClose();
      toast({ description: "✅ Evento e chamado criados com sucesso!", variant: "success" });
    } catch (error) {
      console.error("[NovoEventoModal] Erro ao criar chamado vinculado:", error);
      toast({ description: `❌ Erro ao criar chamado: ${error.message}`, variant: "destructive" });
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("[NovoEventoModal] Submit - dados do evento:", evento);
    createMutation.mutate(evento);
  };

  // PROMPT DE CRIAÇÃO DE CHAMADO
  if (mostrarPromptChamado) {
    console.log("[NovoEventoModal] Renderizando prompt de chamado");
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 Criar Chamado?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground">
              Evento criado com sucesso! Gostaria de abrir um chamado para esse compromisso?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log("[NovoEventoModal] Usuário clicou em 'Não'");
                  setMostrarPromptChamado(false);
                  onClose();
                }}
              >
                Não, obrigado
              </Button>
              <Button
                type="button"
                onClick={() => {
                  console.log("[NovoEventoModal] Usuário clicou em 'Sim'");
                  criarChamadoVinculado();
                }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending}
              >
                ✅ Sim, criar chamado
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // FORMULÁRIO DE CRIAÇÃO DE EVENTO
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>📅 Novo Evento</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={evento.titulo}
                  onChange={(e) => setEvento({...evento, titulo: e.target.value})}
                  placeholder="Ex: Manutenção preventiva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <select
                  value={evento.tipo}
                  onChange={(e) => setEvento({...evento, tipo: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="manual">🗓️ Manual</option>
                  <option value="chamado">🔧 Chamado</option>
                  <option value="pmoc">🧊 PMOC</option>
                  <option value="reuniao">👥 Reunião</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={evento.descricao}
                onChange={(e) => setEvento({...evento, descricao: e.target.value})}
                placeholder="Detalhes do atendimento..."
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <select
                  value={evento.cliente_id}
                  onChange={(e) => setEvento({...evento, cliente_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Técnico Responsável</Label>
                <select
                  value={evento.tecnico_id}
                  onChange={(e) => setEvento({...evento, tecnico_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione o técnico</option>
                  {tecnicos.filter(t => t.status === 'ativo').map((tecnico) => (
                    <option key={tecnico.id} value={tecnico.id}>
                      {tecnico.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={evento.data_inicio}
                  onChange={(e) => setEvento({...evento, data_inicio: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Hora de Início *</Label>
                <Input
                  type="time"
                  value={evento.hora_inicio}
                  onChange={(e) => setEvento({...evento, hora_inicio: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={evento.data_fim}
                  onChange={(e) => setEvento({...evento, data_fim: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Hora de Término</Label>
                <Input
                  type="time"
                  value={evento.hora_fim}
                  onChange={(e) => setEvento({...evento, hora_fim: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={evento.endereco}
                onChange={(e) => setEvento({...evento, endereco: e.target.value})}
                placeholder="Será preenchido automaticamente com o endereço do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor do Evento</Label>
              <div className="flex gap-2">
                {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map(cor => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setEvento({...evento, cor})}
                    className={`w-8 h-8 rounded-full ${evento.cor === cor ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Criando...' : 'Criar Evento'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}