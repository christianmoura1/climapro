
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
    <Card className="relative overflow-x-auto border-none shadow-lg">
      <p className="sticky left-0 px-3 pt-3 text-xs font-medium text-blue-700 md:hidden">Deslize para ver os outros dias da semana.</p>
      <div className="min-w-[800px] p-3 sm:p-6" role="region" tabIndex={0} aria-label="Agenda semanal por horário">
        {/* Header com dias */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="sticky left-0 z-10 bg-card font-semibold text-muted-foreground"></div>
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
              <div className="sticky left-0 z-10 bg-card py-2 text-sm font-medium text-muted-foreground">
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
                        <button
                          type="button"
                          key={evento.id}
                          onClick={() => onEventoClick(evento)}
                          className="mb-1 w-full rounded p-2 text-left text-xs transition-opacity hover:opacity-80"
                          style={{ 
                            backgroundColor: backgroundColor + '20', 
                            borderLeft: `3px solid ${backgroundColor}` 
                          }}
                        >
                          <div className="font-semibold">{tipoIcons[evento.tipo]} {evento.titulo}</div>
                          <div className="text-muted-foreground">{format(new Date(evento.data_inicio), 'HH:mm')}</div>
                        </button>
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
