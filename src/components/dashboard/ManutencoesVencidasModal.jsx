import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Bell, Clock, Plus, Wrench, Calendar, MapPin, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ManutencoesVencidasModal({ chamados, onClose }) {
  const [expandedId, setExpandedId] = useState(null);
  const [clientesMap, setClientesMap] = useState({});
  const [tecnicosMap, setTecnicosMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadRelacionados = async () => {
      const clienteIds = [...new Set(chamados.map(c => c.cliente_id).filter(Boolean))];
      const tecnicoIds = [...new Set(chamados.map(c => c.tecnico_id).filter(Boolean))];

      const cMap = {};
      for (const cid of clienteIds) {
        try {
          const results = await base44.entities.Cliente.filter({ id: cid });
          if (results.length > 0) cMap[cid] = results[0];
        } catch (e) { /* ignore */ }
      }
      setClientesMap(cMap);

      const tMap = {};
      if (tecnicoIds.length > 0) {
        try {
          const tecnicos = await base44.entities.Tecnico.list('-created_date', 100);
          for (const t of tecnicos) {
            if (tecnicoIds.includes(t.id)) tMap[t.id] = t;
          }
        } catch (e) { /* ignore */ }
      }
      setTecnicosMap(tMap);
    };

    if (chamados.length > 0) loadRelacionados();
  }, [chamados]);

  const handleCriarChamado = (chamado) => {
    const cliente = clientesMap[chamado.cliente_id];
    const prefill = {
      cliente_id: chamado.cliente_id || "",
      titulo: `Manutenção Preventiva - ${cliente?.nome || 'Cliente'}`,
      local: chamado.local || cliente?.endereco || "",
      descricao: `Manutenção preventiva programada. Último atendimento: ${chamado.titulo || 'N/A'}\n\nObservações anteriores:\n${chamado.observacoes_tecnico || 'Sem observações'}`,
      tipo_problema: "manutencao_preventiva",
      prioridade: "media"
    };
    sessionStorage.setItem('prefill_chamado', JSON.stringify(prefill));
    onClose();
    navigate(createPageUrl("Chamados"));
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Manutenções Vencidas</h2>
              <p className="text-sm text-red-100">
                {chamados.length} cliente{chamados.length > 1 ? 's' : ''} com manutenção preventiva vencida
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chamados.map((chamado) => {
            const cliente = clientesMap[chamado.cliente_id];
            const tecnico = tecnicosMap[chamado.tecnico_id];
            const isExpanded = expandedId === chamado.id;
            const dataVenc = chamado.data_lembrete_proxima_manutencao
              ? new Date(chamado.data_lembrete_proxima_manutencao + 'T00:00:00').toLocaleDateString('pt-BR')
              : 'N/A';

            return (
              <div key={chamado.id} className="border-2 border-red-200 rounded-xl overflow-hidden">
                {/* Resumo (clicável) */}
                <button
                  onClick={() => toggleExpand(chamado.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {cliente?.nome || chamado.titulo || 'Cliente'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Vencida: {dataVenc}
                        {chamado.hora_lembrete_proxima_manutencao && ` às ${chamado.hora_lembrete_proxima_manutencao}`}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                </button>

                {/* Detalhes do último atendimento */}
                {isExpanded && (
                  <div className="border-t border-red-100 bg-gray-50 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Título</p>
                        <p className="text-gray-900">{chamado.titulo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Técnico</p>
                        <p className="text-gray-900">{tecnico?.nome || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Finalizado em</p>
                        <p className="text-gray-900">
                          {chamado.data_finalizacao
                            ? format(new Date(chamado.data_finalizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Local</p>
                        <p className="text-gray-900 flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{chamado.local || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    {chamado.observacoes_tecnico && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observações do Técnico</p>
                        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200 whitespace-pre-wrap">
                          {chamado.observacoes_tecnico}
                        </p>
                      </div>
                    )}

                    {chamado.fotos_finalizacao?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          Fotos do Serviço ({chamado.fotos_finalizacao.length})
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {chamado.fotos_finalizacao.slice(0, 8).map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button
                        onClick={() => handleCriarChamado(chamado)}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Novo Chamado
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}