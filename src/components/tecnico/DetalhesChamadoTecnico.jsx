import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, User, Navigation, Image as ImageIcon, CheckCircle, Download, Cpu, Clock, History } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS = {
  pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
  em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
  aguardando_pecas: { color: "bg-yellow-100 text-yellow-800", label: "Aguard. Peças" },
  aguardando_aprovacao_empresa: { color: "bg-purple-100 text-purple-800", label: "Aguard. Aprovação" },
  finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
  cancelado: { color: "bg-gray-100 text-gray-800", label: "Cancelado" },
};

// Função para formatar data no horário de Brasília
const formatarDataBrasil = (dataISO) => {
  if (!dataISO) return 'Não informado';
  
  const dataUTC = new Date(dataISO);
  
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const partes = formatter.formatToParts(dataUTC);
  const valores = {};
  partes.forEach(parte => {
    valores[parte.type] = parte.value;
  });
  
  return `${valores.day}/${valores.month}/${valores.year} às ${valores.hour}:${valores.minute}`;
};

export default function DetalhesChamadoTecnico({ chamado, cliente, onVoltar, onFinalizar }) {
  const [equipamentosCliente, setEquipamentosCliente] = useState([]);
  const [chamadosPorEquip, setChamadosPorEquip] = useState({});
  const [equipExpandido, setEquipExpandido] = useState(null);
  const [loadingEquip, setLoadingEquip] = useState(false);

  useEffect(() => {
    if (!cliente?.id) return;
    setLoadingEquip(true);
    base44.entities.Equipamento.filter({ cliente_id: cliente.id })
      .then(async (equips) => {
        setEquipamentosCliente(equips);
      })
      .finally(() => setLoadingEquip(false));
  }, [cliente?.id]);

  const handleVerHistoricoEquip = async (equipId) => {
    if (equipExpandido === equipId) {
      setEquipExpandido(null);
      return;
    }
    setEquipExpandido(equipId);
    if (!chamadosPorEquip[equipId]) {
      const chs = await base44.entities.Chamado.filter({ equipamento_id: equipId }, '-created_date', 10);
      setChamadosPorEquip(prev => ({ ...prev, [equipId]: chs }));
    }
  };

  const handleExportarJSON = () => {
    const dados = {
      chamado,
      cliente,
      exportadoEm: new Date().toISOString()
    };
    
    const json = JSON.stringify(dados, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chamado-${chamado.numero_chamado}-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleAbrirGPS = () => {
    // Prioriza coordenadas do cliente
    if (cliente?.latitude && cliente?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${cliente.latitude},${cliente.longitude}`;
      window.open(url, '_blank');
    } else if (chamado.local) {
      // Se não tiver coordenadas, usa o endereço do chamado
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chamado.local)}`;
      window.open(url, '_blank');
    } else if (cliente?.endereco) {
      // Se não tiver local no chamado, usa endereço do cliente
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.endereco)}`;
      window.open(url, '_blank');
    }
  };

  // Determinar qual endereço mostrar (prioridade: cliente.endereco > chamado.local)
  const enderecoAtendimento = cliente?.endereco || chamado.local || 'Endereço não informado';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{chamado.titulo}</h2>
          <p className="text-sm text-gray-600">#{chamado.numero_chamado}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportarJSON}
          title="Exportar chamado como JSON"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar JSON
        </Button>
        {(chamado.status === 'em_andamento' || chamado.status === 'pendente') && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={onFinalizar}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar Chamado
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Informações do Cliente e Localização */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Nome</p>
              <p className="font-semibold text-gray-900">{cliente?.nome || 'Não informado'}</p>
            </div>

            {cliente?.telefone && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Telefone</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${cliente.telefone}`} className="text-blue-600 hover:underline">
                    {cliente.telefone}
                  </a>
                </div>
              </div>
            )}

            {cliente?.whatsapp && (
              <div>
                <p className="text-sm text-gray-500 mb-1">WhatsApp</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a 
                    href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    {cliente.whatsapp}
                  </a>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500 mb-1">📍 Endereço do Atendimento</p>
              <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <MapPin className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <p className="text-gray-900 flex-1 font-medium">{enderecoAtendimento}</p>
              </div>
            </div>

            {(cliente?.latitude && cliente?.longitude) && (
              <>
                <Button
                  onClick={handleAbrirGPS}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  🚗 Abrir Navegação GPS
                </Button>

                <div className="border-2 border-blue-300 rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="250"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${cliente.latitude},${cliente.longitude}&output=embed`}
                    allowFullScreen
                  ></iframe>
                </div>
              </>
            )}

            {/* Se não tiver coordenadas mas tiver endereço, ainda mostrar botão de navegação */}
            {!(cliente?.latitude && cliente?.longitude) && enderecoAtendimento !== 'Endereço não informado' && (
              <Button
                onClick={handleAbrirGPS}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Navigation className="w-4 h-4 mr-2" />
                🚗 Abrir Navegação GPS
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Detalhes do Chamado */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>Detalhes do Chamado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <Badge className={
                chamado.status === 'pendente' ? 'bg-orange-100 text-orange-800' :
                chamado.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                chamado.status === 'aguardando_aprovacao_empresa' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }>
                {chamado.status === 'pendente' ? 'Pendente' :
                 chamado.status === 'em_andamento' ? 'Em Andamento' :
                 chamado.status === 'aguardando_aprovacao_empresa' ? 'Aguardando Aprovação' :
                 'Finalizado'}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Prioridade</p>
              <Badge className={
                chamado.prioridade === 'urgente' ? 'bg-red-100 text-red-800' :
                chamado.prioridade === 'alta' ? 'bg-orange-100 text-orange-800' :
                chamado.prioridade === 'media' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }>
                {chamado.prioridade}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Descrição do Problema</p>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                {chamado.descricao}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Data de Abertura</p>
              <p className="text-gray-900">
                {formatarDataBrasil(chamado.created_date)}
              </p>
            </div>

            {chamado.data_finalizacao && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Data de Finalização</p>
                <p className="text-green-600 font-medium">
                  {formatarDataBrasil(chamado.data_finalizacao)}
                </p>
              </div>
            )}

            {chamado.observacoes_tecnico && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Observações</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {chamado.observacoes_tecnico}
                </p>
              </div>
            )}

            {chamado.fotos_anexos && chamado.fotos_anexos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-500">
                    Fotos Anexadas ({chamado.fotos_anexos.length})
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {chamado.fotos_anexos.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equipamentos do Cliente */}
      <Card className="shadow-lg border-none">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="w-5 h-5" />
            Equipamentos do Cliente {loadingEquip && <span className="text-xs text-gray-400">(carregando...)</span>}
            {!loadingEquip && <span className="text-sm font-normal text-gray-500">({equipamentosCliente.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {equipamentosCliente.length === 0 && !loadingEquip ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum equipamento cadastrado para este cliente.</p>
          ) : (
            <div className="space-y-2">
              {equipamentosCliente.map((equip) => (
                <div key={equip.id} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
                    onClick={() => handleVerHistoricoEquip(equip.id)}
                  >
                    <div className="flex items-center gap-3">
                      {equip.foto_url ? (
                        <img src={equip.foto_url} alt={equip.modelo} className="w-10 h-10 object-cover rounded border" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                          <Cpu className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm text-gray-900">{equip.marca} {equip.modelo}</p>
                        <p className="text-xs text-gray-500">{equip.tipo?.replace('_',' ')} {equip.capacidade ? `· ${equip.capacidade}` : ''} {equip.estabelecimento_nome ? `· ${equip.estabelecimento_nome}` : equip.localizacao ? `· ${equip.localizacao}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{equipExpandido === equip.id ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {equipExpandido === equip.id && (
                    <div className="border-t bg-gray-50 p-3">
                      {!chamadosPorEquip[equip.id] ? (
                        <p className="text-xs text-gray-500">Carregando histórico...</p>
                      ) : chamadosPorEquip[equip.id].length === 0 ? (
                        <p className="text-xs text-gray-500">Nenhum chamado registrado para este equipamento.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Últimos {chamadosPorEquip[equip.id].length} chamado(s):</p>
                          {chamadosPorEquip[equip.id].map((c) => {
                            const cfg = STATUS_LABELS[c.status] || STATUS_LABELS.pendente;
                            return (
                              <div key={c.id} className="flex items-start justify-between gap-2 bg-white rounded p-2 border text-xs">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">{c.numero_chamado} — {c.titulo}</p>
                                  <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    {c.created_date ? format(new Date(c.created_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                                  </div>
                                </div>
                                <Badge className={cfg.color + " text-xs shrink-0"}>{cfg.label}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}