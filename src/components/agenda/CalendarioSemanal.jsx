
import React from "react";
import { Card } from "@/components/ui/card";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CalendarioSemanal({ dataAtual, eventos, tecnicos, clientes, onEventoClick }) {
  const inicioSemana = startOfWeek(dataAtual);
  const fimSemana = endOfWeek(dataAtual);
  const diasSemana = eachDayOfInterval({ start: inicioSemana, end: fimSemana });
  const hoje = new Date();

  const horas = Array.from({ length: 12 }, (_, i) => i + 7); // 7h às 18h

  const getEventosNoHorario = (dia, hora) => {
    return eventos.filter(evento => {
      const dataEvento = new Date(evento.data_inicio);
      return isSameDay(dataEvento, dia) && dataEvento.getHours() === hora;
    });
  };

  const tipoIcons = {
    chamado: '🔧',
    pmoc: '🧊',
    reuniao: '👥',
    manual: '🗓️',
    outro: '📋'
  };

  return (
    <Card className="shadow-lg border-none overflow-x-auto">
      <div className="p-6 min-w-[800px]">
        {/* Header com dias */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="font-semibold text-muted-foreground"></div>
          {diasSemana.map((dia) => {
            const isHoje = isSameDay(dia, hoje);
            return (
              <div key={dia.toString()} className={`text-center ${isHoje ? 'text-indigo-600' : 'text-foreground'}`}>
                <div className="font-semibold">{format(dia, 'EEE', { locale: ptBR })}</div>
                <div className={`text-2xl ${isHoje ? 'font-bold' : ''}`}>{format(dia, 'd')}</div>
              </div>
            );
          })}
        </div>

        {/* Grid de horários */}
        <div className="space-y-1">
          {horas.map((hora) => (
            <div key={hora} className="grid grid-cols-8 gap-2">
              <div className="text-sm font-medium text-muted-foreground py-2">
                {hora}:00
              </div>
              {diasSemana.map((dia) => {
                const eventosNoHorario = getEventosNoHorario(dia, hora);
                return (
                  <div
                    key={`${dia}-${hora}`}
                    className="border border-border rounded p-1 min-h-[60px] bg-white hover:bg-muted transition-colors"
                  >
                    {eventosNoHorario.map((evento) => {
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
                          className="text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-opacity mb-1"
                          style={{ 
                            backgroundColor: backgroundColor + '20', 
                            borderLeft: `3px solid ${backgroundColor}` 
                          }}
                        >
                          <div className="font-semibold">{tipoIcons[evento.tipo]} {evento.titulo}</div>
                          <div className="text-muted-foreground">{format(new Date(evento.data_inicio), 'HH:mm')}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
