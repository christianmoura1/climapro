
import React from "react";
import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns";

export default function CalendarioMensal({ dataAtual, eventos, tecnicos, clientes, onEventoClick }) {
  const inicioMes = startOfMonth(dataAtual);
  const fimMes = endOfMonth(dataAtual);
  const inicioCal = startOfWeek(inicioMes);
  const fimCal = endOfWeek(fimMes);
  
  const diasCalendario = eachDayOfInterval({ start: inicioCal, end: fimCal });
  const hoje = new Date();

  const getEventosNoDia = (dia) => {
    return eventos.filter(evento => isSameDay(new Date(evento.data_inicio), dia));
  };

  const tipoIcons = {
    chamado: '🔧',
    pmoc: '🧊',
    reuniao: '👥',
    manual: '🗓️',
    outro: '📋'
  };

  return (
    <Card className="shadow-lg border-none">
      <div className="p-6">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
            <div key={dia} className="text-center font-semibold text-gray-600 text-sm py-2">
              {dia}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7 gap-2">
          {diasCalendario.map((dia, idx) => {
            const eventosNoDia = getEventosNoDia(dia);
            const isHoje = isSameDay(dia, hoje);
            const isMesAtual = isSameMonth(dia, dataAtual);

            return (
              <div
                key={idx}
                className={`min-h-[120px] p-2 border rounded-lg ${
                  isHoje ? 'bg-indigo-50 border-indigo-500 border-2' : 'bg-white border-gray-200'
                } ${!isMesAtual ? 'opacity-40' : ''} hover:shadow-md transition-shadow`}
              >
                <div className={`text-sm font-semibold mb-2 ${
                  isHoje ? 'text-indigo-600' : isMesAtual ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {format(dia, 'd')}
                </div>
                
                <div className="space-y-1">
                  {eventosNoDia.slice(0, 3).map((evento) => {
                    const tecnico = tecnicos.find(t => t.id === evento.tecnico_id);
                    // Definir cor: verde para concluído, vermelho para pendente, cor original para outros
                    let backgroundColor;
                    if (evento.status === 'concluido') {
                      backgroundColor = '#10b981'; // verde
                    } else if (evento.status === 'pendente') {
                      backgroundColor = '#ef4444'; // vermelho
                    } else {
                      backgroundColor = evento.cor;
                    }
                    
                    return (
                      <div
                        key={evento.id}
                        onClick={() => onEventoClick(evento)}
                        className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ 
                          backgroundColor: backgroundColor + '20', 
                          borderLeft: `3px solid ${backgroundColor}` 
                        }}
                      >
                        <div className="font-semibold truncate">
                          {tipoIcons[evento.tipo]} {evento.titulo}
                        </div>
                        <div className="text-gray-600 truncate">
                          {format(new Date(evento.data_inicio), 'HH:mm')}
                        </div>
                      </div>
                    );
                  })}
                  {eventosNoDia.length > 3 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{eventosNoDia.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
