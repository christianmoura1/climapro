
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
          <h3 className="text-lg font-bold text-gray-900 mb-4">Linha do Tempo</h3>
          <div className="space-y-2">
            {horas.map((hora) => {
              const eventos = getEventosNoHorario(hora);
              return (
                <div key={hora} className="flex gap-3">
                  <div className="text-sm font-medium text-gray-600 w-16 pt-2">
                    {hora}:00
                  </div>
                  <div className="flex-1 space-y-2">
                    {eventos.length === 0 ? (
                      <div className="border-l-2 border-gray-200 pl-4 py-2 text-sm text-gray-400">
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
                          <div
                            key={evento.id}
                            onClick={() => onEventoClick(evento)}
                            className="border-l-4 pl-4 py-2 rounded-r cursor-pointer hover:shadow-md transition-shadow bg-white"
                            style={{ borderColor }}
                          >
                            <div className="font-semibold text-gray-900">
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
                            <div className="text-sm text-gray-600 mt-1">
                              {cliente?.nome}
                            </div>
                            {tecnico && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <User className="w-3 h-3" />
                                {tecnico.nome}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(evento.data_inicio), 'HH:mm')} - {format(new Date(evento.data_fim), 'HH:mm')}
                            </div>
                          </div>
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
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Eventos do Dia ({eventosNoDia.length})
          </h3>
          <div className="space-y-3">
            {eventosNoDia.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum evento agendado para hoje
              </div>
            ) : (
              eventosNoDia.map((evento) => {
                const tecnico = tecnicos.find(t => t.id === evento.tecnico_id);
                const cliente = clientes.find(c => c.id === evento.cliente_id);
                const status = statusConfig[evento.status];

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
                  <div
                    key={evento.id}
                    onClick={() => onEventoClick(evento)}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900">
                        {tipoIcons[evento.tipo]} {evento.titulo}
                      </div>
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
