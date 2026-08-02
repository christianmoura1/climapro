
import React from "react";
import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CalendarioMensal({ dataAtual, eventos, tecnicos, clientes, onEventoClick }) {
  const inicioMes = startOfMonth(dataAtual);
  const fimMes = endOfMonth(dataAtual);
  const inicioCal = startOfWeek(inicioMes);
  const fimCal = endOfWeek(fimMes);
  
  const diasCalendario = eachDayOfInterval({ start: inicioCal, end: fimCal });
  const hoje = new Date();
  const [diaSelecionado, setDiaSelecionado] = React.useState(() => isSameMonth(hoje, dataAtual) ? hoje : inicioMes);

  React.useEffect(() => {
    setDiaSelecionado(isSameMonth(new Date(), dataAtual) ? new Date() : startOfMonth(dataAtual));
  }, [dataAtual]);
  const getEventosNoDia = (dia) => {
    return eventos.filter(evento => isSameDay(new Date(evento.data_inicio), dia));
  };


  const eventosNoDiaSelecionado = getEventosNoDia(diaSelecionado);

  const tipoIcons = {
    chamado: '🔧',
    pmoc: '🧊',
    reuniao: '👥',
    manual: '🗓️',
    outro: '📋'
  };

  return (
    <Card className="shadow-lg border-none">
      <div className="p-3 sm:p-6">
        <div className="lg:hidden">
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Dias do mês">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, index) => (
              <div key={`${dia}-${index}`} className="py-1 text-center text-[11px] font-semibold text-muted-foreground" role="columnheader">{dia}</div>
            ))}
            {diasCalendario.map((dia) => {
              const eventosNoDia = getEventosNoDia(dia);
              const selecionado = isSameDay(dia, diaSelecionado);
              const isHoje = isSameDay(dia, hoje);
              const isMesAtual = isSameMonth(dia, dataAtual);
              return (
                <button
                  key={dia.toISOString()}
                  type="button"
                  onClick={() => setDiaSelecionado(dia)}
                  aria-pressed={selecionado}
                  aria-label={`${format(dia, "d 'de' MMMM", { locale: ptBR })}, ${eventosNoDia.length} evento(s)`}
                  className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg text-sm font-semibold ${selecionado ? 'bg-indigo-600 text-white' : isHoje ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300' : isMesAtual ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/50'}`}
                >
                  {format(dia, 'd')}
                  {eventosNoDia.length > 0 ? <span className={`absolute bottom-1 h-1 w-1 rounded-full ${selecionado ? 'bg-white' : 'bg-indigo-600'}`} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border bg-muted/20 p-3">
            <h3 className="font-semibold capitalize">{format(diaSelecionado, "EEEE, d 'de' MMMM", { locale: ptBR })}</h3>
            {eventosNoDiaSelecionado.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum evento neste dia.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {eventosNoDiaSelecionado.map((evento) => (
                  <button key={evento.id} type="button" onClick={() => onEventoClick(evento)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-left shadow-sm">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{tipoIcons[evento.tipo]} {evento.titulo}</span><span className="block truncate text-xs text-muted-foreground">{evento.endereco || 'Local não informado'}</span></span>
                    <span className="shrink-0 text-sm font-semibold text-indigo-700">{format(new Date(evento.data_inicio), 'HH:mm')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
            <div key={dia} className="text-center font-semibold text-muted-foreground text-sm py-2">
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
                  isHoje ? 'bg-indigo-50 border-indigo-500 border-2' : 'bg-white border-border'
                } ${!isMesAtual ? 'opacity-40' : ''} hover:shadow-md transition-shadow`}
              >
                <div className={`text-sm font-semibold mb-2 ${
                  isHoje ? 'text-indigo-600' : isMesAtual ? 'text-foreground' : 'text-muted-foreground'
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
                      <button
                        key={evento.id}
                        type="button"
                        onClick={() => onEventoClick(evento)}
                        className="w-full rounded p-1 text-left text-xs transition-opacity hover:opacity-80"
                        style={{ 
                          backgroundColor: backgroundColor + '20', 
                          borderLeft: `3px solid ${backgroundColor}` 
                        }}
                      >
                        <div className="font-semibold truncate">
                          {tipoIcons[evento.tipo]} {evento.titulo}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {format(new Date(evento.data_inicio), 'HH:mm')}
                        </div>
                      </button>
                    );
                  })}
                  {eventosNoDia.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-1">
                      +{eventosNoDia.length - 3} mais
                    </div>
                  )}
                </div>
        </div>
            );
          })}
        </div>
      </div>
      </div>
    </Card>
  );
}
