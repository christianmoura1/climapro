import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Wrench, ClipboardCheck } from "lucide-react";
import { resultadoChecklistItem } from "@/lib/pmocChecklist";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatarData(valor, comHora) {
  if (!valor) return "—";
  try {
    return format(new Date(valor), comHora ? "dd/MM/yyyy 'às' HH:mm" : "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

// Exibição somente-leitura do histórico completo de um equipamento na página
// pública do QR code — mesma informação que a empresa vê internamente
// (checklist, fotos, assinaturas), sem os controles de edição/exclusão dos
// componentes internos equivalentes.
export default function HistoricoManutencaoPublico({ historico }) {
  const chamados = historico?.chamados ?? [];
  const manutencoesPmoc = historico?.manutencoesPmoc ?? [];

  if (chamados.length === 0 && manutencoesPmoc.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma manutenção finalizada registrada para este equipamento ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {manutencoesPmoc.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <ClipboardCheck className="w-4 h-4 text-purple-600" />
            Manutenções Preventivas (PMOC) — {manutencoesPmoc.length}
          </h2>
          <div className="space-y-3">
            {manutencoesPmoc.map((exec) => (
              <Card key={exec.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">{formatarData(exec.data_execucao, true)}</p>
                    {exec.tecnico_nome && <Badge variant="outline" className="text-xs">{exec.tecnico_nome}</Badge>}
                  </div>
                  {exec.checklist?.length > 0 && (
                    <ul className="space-y-1 mb-3">
                      {exec.checklist.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          {resultadoChecklistItem(item) === 'ok' ? (
                            <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                          ) : resultadoChecklistItem(item) === 'nok' ? (
                            <X className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <span className={resultadoChecklistItem(item) === 'nok' ? "font-semibold text-red-700" : "text-foreground"}>
                            {item.descricao}
                            {resultadoChecklistItem(item) === 'nok' && ' (não conforme)'}
                            {item.observacao && <span className="block text-muted-foreground">Obs: {item.observacao}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {exec.fotos?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {exec.fotos.map((url, idx) => (
                        <img key={idx} src={url} alt={`Foto da manutenção ${idx + 1}`} className="w-full h-20 object-cover rounded border" />
                      ))}
                    </div>
                  )}
                  {(exec.assinatura_tecnico || exec.assinatura_cliente) && (
                    <div className="flex gap-4 justify-center border-t pt-3">
                      {exec.assinatura_tecnico && (
                        <div className="text-center">
                          <img src={exec.assinatura_tecnico} alt="Assinatura do técnico" className="max-w-[140px] max-h-16 border rounded bg-white" />
                          <p className="text-[10px] text-muted-foreground mt-1">{exec.tecnico_nome || "Técnico"}</p>
                        </div>
                      )}
                      {exec.assinatura_cliente && (
                        <div className="text-center">
                          <img src={exec.assinatura_cliente} alt="Assinatura do cliente" className="max-w-[140px] max-h-16 border rounded bg-white" />
                          <p className="text-[10px] text-muted-foreground mt-1">{exec.nome_cliente_confirmacao || "Cliente"}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {chamados.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Wrench className="w-4 h-4 text-indigo-600" />
            Chamados Corretivos Finalizados — {chamados.length}
          </h2>
          <div className="space-y-3">
            {chamados.map((chamado) => (
              <Card key={chamado.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{chamado.numero_chamado} — {chamado.titulo}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Aberto em {formatarData(chamado.data_abertura)} · Finalizado em {formatarData(chamado.data_finalizacao)}
                    {chamado.tecnico_nome && ` · ${chamado.tecnico_nome}`}
                  </p>
                  {chamado.descricao && <p className="text-xs text-foreground mb-2">{chamado.descricao}</p>}
                  {chamado.observacoes_tecnico && (
                    <p className="text-xs text-muted-foreground mb-2">Observações do técnico: {chamado.observacoes_tecnico}</p>
                  )}
                  {chamado.fotos?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {chamado.fotos.map((url, idx) => (
                        <img key={idx} src={url} alt={`Foto do chamado ${idx + 1}`} className="w-full h-20 object-cover rounded border" />
                      ))}
                    </div>
                  )}
                  {chamado.assinatura_cliente && (
                    <div className="text-center border-t pt-2 mt-2">
                      <img src={chamado.assinatura_cliente} alt="Assinatura do cliente" className="max-w-[140px] max-h-16 border rounded bg-white mx-auto" />
                      <p className="text-[10px] text-muted-foreground mt-1">{chamado.nome_cliente_confirmacao || "Cliente"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
