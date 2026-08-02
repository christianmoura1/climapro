
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { MapPin, User, Clock } from "lucide-react";

export default function CalendarioDiario({ dataAtual, eventos, tecnicos, clientes, onEventoClick }) {
  const horas = Array.from({ length: 12 }, (_, i) => i + 7); // 7h às 18h

  const eventosNoDia = eventos.filter(evento => isSameDay(new Date(evento.data_inicio), dataAtual));

  const getEventosNoHorario = (hora) => {
    return eventosNoDia.filter(evento => {
      const dataEvento = new Date(evento.data_inicio);
      return dataEvento.getHours() === hora;
    });
  };

  const tipoIcons = {
    chamado: '🔧',
    pmoc: '🧊',
    reuniao: '👥',
    manual: '🗓️',
    outro: '📋'
  };

  const statusConfig = {
    pendente: { color: 'bg-orange-100 text-orange-800', label: 'Pendente' },
    confirmado: { color: 'bg-blue-100 text-blue-800', label: 'Confirmado' },
    em_andamento: { color: 'bg-purple-100 text-purple-800', label: 'Em Andamento' },
    concluido: { color: 'bg-green-100 text-green-800', label: 'Concluído' },
    cancelado: { color: 'bg-red-100 text-red-800', label: 'Cancelado' }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Linha do tempo */}
      <Card className="shadow-lg border-none">
        <div className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Linha do Tempo</h3>
          <div className="space-y-2">
            {horas.map((hora) => {
              const eventos = getEventosNoHorario(hora);
              return (
                <div key={hora} className="flex gap-3">
                  <div className="text-sm font-medium text-muted-foreground w-16 pt-2">
                    {hora}:00
                  </div>
                  <div className="flex-1 space-y-2">
                    {eventos.length === 0 ? (
                      <div className="border-l-2 border-border pl-4 py-2 text-sm text-muted-foreground">
                        Horário livre
                      </div>
                    ) : (
                      eventos.map((evento) => {
                        const tecnico = tecnicos.find(t => t.id === evento.tecnico_id);
                        const cliente = clientes.find(c => c.id === evento.cliente_id);
                        
                        // Definir cor: verde para concluído, vermelho para pendente, cor original para outros
                        let borderColor;
                        if (evento.status === 'concluido') {
                          borderColor = '#10b981'; // verde
                        } else if (evento.status === 'pendente') {
                          borderColor = '#ef4444'; // vermelho
                        } else {
                          borderColor = evento.cor;
                        }
                        
                        return (
                          <button
                            type="button"
                            key={evento.id}
                            onClick={() => onEventoClick(evento)}
                            className="w-full rounded-r border-l-4 bg-white py-2 pl-4 text-left transition-shadow hover:shadow-md"
                            style={{ borderColor }}
                          >
                            <div className="font-semibold text-foreground">
                              {tipoIcons[evento.tipo]} {evento.titulo}
                            </div>
                            {evento.status === 'concluido' && (
                              <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                                ✅ Concluído
                              </Badge>
                            )}
                            {evento.status === 'pendente' && (
                              <Badge className="bg-red-100 text-red-800 text-xs mt-1">
                                ⏰ Pendente
                              </Badge>
                            )}
                            <div className="text-sm text-muted-foreground mt-1">
                              {cliente?.nome}
                            </div>
                            {tecnico && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <User className="w-3 h-3" />
                                {tecnico.nome}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(evento.data_inicio), 'HH:mm')} - {format(new Date(evento.data_fim), 'HH:mm')}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Lista de eventos */}
      <Card className="shadow-lg border-none">
        <div className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            Eventos do Dia ({eventosNoDia.length})
          </h3>
          <div className="space-y-3">
            {eventosNoDia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum evento agendado para hoje
              </div>
            ) : (
              eventosNoDia.map((evento) => {
                const tecnico = tecnicos.find(t => t.id === evento.tecnico_id);
                const cliente = clientes.find(c => c.id === evento.cliente_id);
                const status = statusConfig[evento.status] || { color: 'bg-muted text-muted-foreground', label: 'Status não informado' };

                // Definir cor: verde para concluído, vermelho para pendente, cor original para outros
                let borderColor;
                if (evento.status === 'concluido') {
                  borderColor = '#10b981'; // verde
                } else if (evento.status === 'pendente') {
                  borderColor = '#ef4444'; // vermelho
                } else {
                  borderColor = evento.cor;
                }
                
                return (
                  <button
                    type="button"
                    key={evento.id}
                    onClick={() => onEventoClick(evento)}
                    className="w-full rounded-lg border bg-white p-4 text-left transition-shadow hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-foreground">
                        {tipoIcons[evento.tipo]} {evento.titulo}
                      </div>
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {format(new Date(evento.data_inicio), 'HH:mm')} - {format(new Date(evento.data_fim), 'HH:mm')}
                      </div>
                      
                      {cliente && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {cliente.nome}
                        </div>
                      )}
                      
                      {evento.endereco && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {evento.endereco}
                        </div>
                      )}
                      
                      {tecnico && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Técnico: {tecnico.nome}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
