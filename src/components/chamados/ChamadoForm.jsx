import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, X, Upload, MapPin, Navigation, Image as ImageIcon, Video, Trash2, Cpu, ChevronLeft, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CHAMADO = {
  pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
  em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
  aguardando_pecas: { color: "bg-yellow-100 text-yellow-800", label: "Aguard. Peças" },
  finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
  cancelado: { color: "bg-gray-100 text-gray-800", label: "Cancelado" },
};

export default function ChamadoForm({ chamado, clientes, tecnicos, onSubmit, onCancel }) {
  const [currentChamado, setCurrentChamado] = useState(chamado || {
    titulo: "",
    descricao: "",
    local: "",
    cliente_id: "",
    tecnico_id: "",
    tipo_problema: "manutencao_corretiva",
    prioridade: "media",
    status: "pendente",
    fotos_anexos: [],
    fotos_finalizacao: [],
    videos_finalizacao: [],
    data_agendamento: "",
    nome_cliente_confirmacao: "",
    observacoes_tecnico: ""
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(chamado?.fotos_anexos || []);
  const [photosFinalizacao, setPhotosFinalizacao] = useState(chamado?.fotos_finalizacao || []);
  const [videosFinalizacao, setVideosFinalizacao] = useState(chamado?.videos_finalizacao || []);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [criarEvento, setCriarEvento] = useState(true);
  const [buscaCliente, setBuscaCliente] = useState("");

  // Estabelecimentos e equipamentos
  const [estabelecimentoAtivo, setEstabelecimentoAtivo] = useState(null);
  const [equipamentosCliente, setEquipamentosCliente] = useState([]);
  const [historicoEquipamento, setHistoricoEquipamento] = useState(null); // { equipamento, chamados }
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const ehChamadoFinalizado = chamado && chamado.status === 'finalizado';
  const ehNovoChamado = !chamado?.id;

  // Filtrar clientes pela busca
  const clientesFiltrados = clientes.filter(cliente => 
    cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  // Buscar dados do cliente quando selecionado
  useEffect(() => {
    if (currentChamado.cliente_id && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === currentChamado.cliente_id);
      if (cliente) {
        setClienteSelecionado(cliente);
        setEstabelecimentoAtivo(null);
        setHistoricoEquipamento(null);

        // Buscar equipamentos do cliente
        base44.entities.Equipamento.filter({ cliente_id: cliente.id })
          .then(setEquipamentosCliente)
          .catch(() => setEquipamentosCliente([]));

        // Selecionar primeiro estabelecimento ou endereço legado
        const ests = cliente.estabelecimentos || [];
        if (ests.length > 0) {
          const primeiroEst = ests[0];
          setEstabelecimentoAtivo(primeiroEst);
          setCurrentChamado(prev => ({ ...prev, local: primeiroEst.endereco || "" }));
          setMostrarMapa(!!(primeiroEst.latitude && primeiroEst.longitude));
        } else if (cliente.endereco) {
          setCurrentChamado(prev => ({ ...prev, local: cliente.endereco }));
          setMostrarMapa(!!(cliente.latitude && cliente.longitude));
        }
      }
    }
  }, [currentChamado.cliente_id, clientes]);

  const handleSelecionarEstabelecimento = (est) => {
    setEstabelecimentoAtivo(est);
    setCurrentChamado(prev => ({ ...prev, local: est.endereco || "" }));
    setMostrarMapa(!!(est.latitude && est.longitude));
  };

  const handleVerHistoricoEquipamento = async (equipamento) => {
    // toggle: se já está aberto para este equipamento, fecha
    if (historicoEquipamento?.equipamento?.id === equipamento.id) {
      setHistoricoEquipamento(null);
      return;
    }
    setLoadingHistorico(true);
    setHistoricoEquipamento({ equipamento, chamados: [] });
    try {
      // Busca por equipamento_id principal
      const chamados = await base44.entities.Chamado.filter(
        { cliente_id: clienteSelecionado.id }, '-created_date', 100
      );
      // Filtra os que têm este equipamento em equipamento_id ou equipamentos_ids
      const filtrados = chamados.filter(c =>
        c.equipamento_id === equipamento.id ||
        (Array.isArray(c.equipamentos_ids) && c.equipamentos_ids.includes(equipamento.id))
      );
      setHistoricoEquipamento({ equipamento, chamados: filtrados });
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert(`⚠️ ${file.name} não é uma imagem válida`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert(`⚠️ ${file.name} é muito grande. Tamanho máximo: 10MB`);
        continue;
      }

      setUploadingPhoto(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        const newPhotos = [...(currentChamado.fotos_anexos || []), result.file_url];
        setCurrentChamado(prev => ({ ...prev, fotos_anexos: newPhotos }));
        setPhotoPreview(newPhotos);
      } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        alert(`❌ Erro ao fazer upload de ${file.name}`);
      } finally {
        setUploadingPhoto(false);
      }
    }
    
    e.target.value = ''; // Clear input to allow re-uploading the same file
  };

  const handlePhotoFinalizacaoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    if (photosFinalizacao.length + files.length > 10) {
      alert('⚠️ Você pode adicionar no máximo 10 fotos de finalização');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert(`⚠️ ${file.name} não é uma imagem válida`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert(`⚠️ ${file.name} é muito grande. Tamanho máximo: 10MB`);
        continue;
      }

      setUploadingPhoto(true); // Reusing uploadingPhoto state for simplicity, could be new state for finalization
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        const newPhotos = [...photosFinalizacao, result.file_url];
        setPhotosFinalizacao(newPhotos);
        setCurrentChamado(prev => ({ ...prev, fotos_finalizacao: newPhotos }));
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        alert(`❌ Erro ao fazer upload de ${file.name}`);
      } finally {
        setUploadingPhoto(false);
      }
    }
    
    e.target.value = '';
  };

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    if (videosFinalizacao.length + files.length > 2) {
      alert('⚠️ Você pode adicionar no máximo 2 vídeos');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('video/')) {
        alert(`⚠️ ${file.name} não é um vídeo válido`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert(`⚠️ ${file.name} é muito grande. Tamanho máximo: 50MB`);
        continue;
      }

      setUploadingVideo(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        const newVideos = [...videosFinalizacao, result.file_url];
        setVideosFinalizacao(newVideos);
        setCurrentChamado(prev => ({ ...prev, videos_finalizacao: newVideos }));
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        alert(`❌ Erro ao fazer upload de ${file.name}`);
      } finally {
        setUploadingVideo(false);
      }
    }
    
    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    const newPhotos = currentChamado.fotos_anexos.filter((_, i) => i !== index);
    setCurrentChamado(prev => ({ ...prev, fotos_anexos: newPhotos }));
    setPhotoPreview(newPhotos);
  };

  const handleRemovePhotoFinalizacao = (index) => {
    const newPhotos = photosFinalizacao.filter((_, i) => i !== index);
    setPhotosFinalizacao(newPhotos);
    setCurrentChamado(prev => ({ ...prev, fotos_finalizacao: newPhotos }));
  };

  const handleRemoveVideo = (index) => {
    const newVideos = videosFinalizacao.filter((_, i) => i !== index);
    setVideosFinalizacao(newVideos);
    setCurrentChamado(prev => ({ ...prev, videos_finalizacao: newVideos }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!currentChamado.local && clienteSelecionado && !clienteSelecionado.endereco) {
      alert('Este cliente não possui endereço cadastrado. Por favor, cadastre a localização do cliente antes de criar o chamado.');
      return;
    }
    
    onSubmit(currentChamado, criarEvento);
  };

  const handleAbrirGPS = () => {
    const lat = estabelecimentoAtivo?.latitude || clienteSelecionado?.latitude;
    const lng = estabelecimentoAtivo?.longitude || clienteSelecionado?.longitude;
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg p-6 mb-8"
    >
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          {ehNovoChamado ? 'Novo Chamado' : (ehChamadoFinalizado ? 'Editar Chamado Finalizado' : 'Editar Chamado')}
        </h2>
        {ehChamadoFinalizado && (
          <p className="text-sm text-orange-600 mt-1">
            ⚠️ Você está editando um chamado finalizado. Todas as alterações serão registradas.
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título do Chamado</Label>
              <Input
                value={currentChamado.titulo}
                onChange={(e) => setCurrentChamado({...currentChamado, titulo: e.target.value})}
                placeholder="Ex: Ar condicionado não está gelando"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input
                type="text"
                placeholder="Digite para buscar cliente..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="mb-2"
              />
              <select
                value={currentChamado.cliente_id}
                onChange={(e) => {
                  setCurrentChamado({...currentChamado, cliente_id: e.target.value});
                  setBuscaCliente("");
                }}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
                size="15"
              >
                <option value="">Selecione o cliente</option>
                {clientesFiltrados.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {buscaCliente && clientesFiltrados.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">Nenhum cliente encontrado</p>
              )}
            </div>
          </div>

          {clienteSelecionado && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              {/* Info básica */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-2">📍 Informações do Cliente</h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-800"><strong>Nome:</strong> {clienteSelecionado.nome}</p>
                    {clienteSelecionado.telefone && (
                      <p className="text-blue-800"><strong>Telefone:</strong> {clienteSelecionado.telefone}</p>
                    )}
                    {estabelecimentoAtivo?.endereco ? (
                      <p className="text-blue-800"><strong>Endereço:</strong> {estabelecimentoAtivo.endereco}</p>
                    ) : clienteSelecionado.endereco ? (
                      <p className="text-blue-800"><strong>Endereço:</strong> {clienteSelecionado.endereco}</p>
                    ) : (
                      <p className="text-red-600">⚠️ Cliente sem endereço cadastrado</p>
                    )}
                  </div>
                </div>
                {(estabelecimentoAtivo?.latitude || clienteSelecionado.latitude) && (
                  <Button type="button" variant="outline" size="sm" onClick={handleAbrirGPS} className="ml-4">
                    <Navigation className="w-4 h-4 mr-2" />
                    Abrir GPS
                  </Button>
                )}
              </div>

              {/* Abas de Estabelecimentos */}
              {(clienteSelecionado.estabelecimentos?.length > 0) ? (
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-2">🏠 Selecione o Estabelecimento:</p>
                  <div className="flex flex-wrap gap-2">
                    {clienteSelecionado.estabelecimentos.map((est, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelecionarEstabelecimento(est)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border shadow-sm ${
                          estabelecimentoAtivo?.nome === est.nome
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {est.nome === 'casa' || est.nome === 'Casa' ? '🏠' :
                         est.nome === 'loja' || est.nome === 'Loja' ? '🏪' :
                         est.nome === 'escritorio' || est.nome === 'Escritório' || est.nome === 'escritório' ? '🏢' :
                         est.nome === 'trabalho' || est.nome === 'Trabalho' ? '💼' :
                         est.nome === 'empresa' || est.nome === 'Empresa' ? '🏭' : '📍'} {est.nome}
                      </button>
                    ))}
                  </div>
                  {estabelecimentoAtivo && (
                    <div className="mt-2 text-xs text-blue-700 bg-blue-100 rounded px-2 py-1">
                      📌 <strong>{estabelecimentoAtivo.nome}:</strong> {estabelecimentoAtivo.endereco || 'Sem endereço cadastrado'}
                    </div>
                  )}
                </div>
              ) : (
                clienteSelecionado.endereco && (
                  <div className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1">
                    📌 <strong>Endereço:</strong> {clienteSelecionado.endereco}
                  </div>
                )
              )}

              {/* Mapa do estabelecimento ativo */}
              {mostrarMapa && (estabelecimentoAtivo?.latitude || clienteSelecionado.latitude) && (
                <div className="border-2 border-blue-300 rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="180"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${estabelecimentoAtivo?.latitude || clienteSelecionado.latitude},${estabelecimentoAtivo?.longitude || clienteSelecionado.longitude}&output=embed`}
                    allowFullScreen
                  />
                </div>
              )}

              {/* Equipamentos do cliente */}
              {equipamentosCliente.length > 0 && (
                <div>
                  {/* Filtro por estabelecimento */}
                  {(() => {
                    const nomesEstabelecimentos = [...new Set(equipamentosCliente.filter(e => e.estabelecimento_nome).map(e => e.estabelecimento_nome))];
                    const temEstabelecimentos = nomesEstabelecimentos.length > 0;
                    const equipamentosFiltrados = estabelecimentoAtivo
                      ? equipamentosCliente.filter(e => e.estabelecimento_nome === estabelecimentoAtivo.nome)
                      : equipamentosCliente;

                    return (
                      <>
                        {temEstabelecimentos && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">🏠 Filtrar por Estabelecimento:</p>
                            <div className="flex flex-wrap gap-2">
                              {nomesEstabelecimentos.map((nome) => (
                                <button
                                  key={nome}
                                  type="button"
                                  onClick={() => {
                                    const est = clienteSelecionado.estabelecimentos?.find(e => e.nome === nome);
                                    if (est) handleSelecionarEstabelecimento(est);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                    estabelecimentoAtivo?.nome === nome
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                                  }`}
                                >
                                  📍 {nome} ({equipamentosCliente.filter(e => e.estabelecimento_nome === nome).length})
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs font-semibold text-blue-700 mb-2">
                          <Cpu className="w-3 h-3 inline mr-1" />
                          Equipamentos ({equipamentosFiltrados.length}) — clique para ver histórico:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {equipamentosFiltrados.map((eq) => (
                            <button
                              key={eq.id}
                              type="button"
                              onClick={() => handleVerHistoricoEquipamento(eq)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-colors ${
                                historicoEquipamento?.equipamento?.id === eq.id
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50'
                              }`}
                            >
                              ❄️ {eq.marca} {eq.modelo}
                              {eq.localizacao && <span className="ml-1 opacity-70">({eq.localizacao})</span>}
                            </button>
                          ))}
                        </div>
                      </>
                    );
                  })()}

                  {/* Histórico do equipamento selecionado */}
                  {historicoEquipamento && (
                    <div className="mt-3 border border-indigo-200 rounded-lg bg-white overflow-hidden">
                      <div className="bg-indigo-50 px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-800">
                          📋 Histórico: {historicoEquipamento.equipamento.marca} {historicoEquipamento.equipamento.modelo}
                        </span>
                        <button type="button" onClick={() => setHistoricoEquipamento(null)} className="text-indigo-500 hover:text-indigo-700">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2 max-h-48 overflow-y-auto">
                        {loadingHistorico ? (
                          <p className="text-xs text-gray-500 text-center py-3">Carregando...</p>
                        ) : historicoEquipamento.chamados.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-3">Nenhum chamado registrado para este equipamento.</p>
                        ) : (
                          <div className="divide-y">
                            {historicoEquipamento.chamados.map((c) => {
                              const cfg = STATUS_CHAMADO[c.status] || STATUS_CHAMADO.pendente;
                              return (
                                <div key={c.id} className="py-2 flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-800 truncate">{c.numero_chamado} — {c.titulo}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                      <Clock className="w-3 h-3" />
                                      {c.created_date ? format(new Date(c.created_date), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                                    </p>
                                  </div>
                                  <Badge className={cfg.color + " text-xs shrink-0"}>{cfg.label}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Local do Atendimento</Label>
            <div className="flex gap-2">
              <Input
                value={currentChamado.local}
                onChange={(e) => setCurrentChamado({...currentChamado, local: e.target.value})}
                placeholder={clienteSelecionado?.endereco || "Ex: Rua das Flores, 123 - Sala 203"}
                className="flex-1"
              />
              {clienteSelecionado?.latitude && clienteSelecionado?.longitude && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAbrirGPS}
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              )}
            </div>
            {!clienteSelecionado?.endereco && currentChamado.cliente_id && (
              <p className="text-xs text-orange-600">
                ⚠️ Este cliente não possui endereço cadastrado. Recomendamos cadastrar antes de criar o chamado.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição do Problema</Label>
            <Textarea
              value={currentChamado.descricao}
              onChange={(e) => setCurrentChamado({...currentChamado, descricao: e.target.value})}
              placeholder="Descreva o problema detalhadamente..."
              rows={4}
              required
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Problema</Label>
              <select
                value={currentChamado.tipo_problema}
                onChange={(e) => setCurrentChamado({...currentChamado, tipo_problema: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="manutencao_preventiva">Manutenção Preventiva</option>
                <option value="manutencao_corretiva">Manutenção Corretiva</option>
                <option value="instalacao">Instalação</option>
                <option value="emergencia">Emergência</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <select
                value={currentChamado.prioridade}
                onChange={(e) => setCurrentChamado({...currentChamado, prioridade: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Técnico Responsável</Label>
              <select
                value={currentChamado.tecnico_id}
                onChange={(e) => setCurrentChamado({...currentChamado, tecnico_id: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione o técnico</option>
                {tecnicos.filter(t => t.status === 'ativo' && ['Fred Santana', 'Danyel Farias', 'Warner', 'ALEX MOURA'].some(nome => t.nome.includes(nome))).map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data e Hora de Agendamento</Label>
            <Input
              type="datetime-local"
              value={currentChamado.data_agendamento}
              onChange={(e) => setCurrentChamado({...currentChamado, data_agendamento: e.target.value})}
            />
          </div>

          {/* Upload de Fotos Iniciais */}
          <div className="space-y-2">
            <Label>Fotos do Local/Problema</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {uploadingPhoto ? 'Fazendo upload...' : 'Clique para adicionar fotos'}
                </span>
                <span className="text-xs text-gray-400 mt-1">PNG, JPG até 10MB</span>
              </label>
            </div>

            {photoPreview.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                {photoPreview.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção de Finalização - Só para chamados finalizados */}
          {ehChamadoFinalizado && (
            <div className="border-t-2 border-gray-200 pt-6 mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Dados de Finalização</h3>
              
              {/* Nome do Cliente que Confirmou */}
              <div className="space-y-2">
                <Label>Nome do Cliente que Confirmou o Serviço</Label>
                <Input
                  value={currentChamado.nome_cliente_confirmacao || ""}
                  onChange={(e) => setCurrentChamado(prev => ({...prev, nome_cliente_confirmacao: e.target.value}))}
                  placeholder="Nome completo de quem recebeu o serviço"
                />
              </div>

              {/* Observações do Técnico */}
              <div className="space-y-2">
                <Label>Observações do Técnico</Label>
                <Textarea
                  value={currentChamado.observacoes_tecnico || ""}
                  onChange={(e) => setCurrentChamado(prev => ({...prev, observacoes_tecnico: e.target.value}))}
                  placeholder="Observações sobre o serviço realizado..."
                  rows={4}
                />
              </div>

              {/* Fotos de Finalização */}
              <div className="space-y-2">
                <Label>Fotos de Finalização (até 10)</Label>
                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoFinalizacaoUpload}
                    disabled={uploadingPhoto || photosFinalizacao.length >= 10}
                    className="hidden"
                    id="photo-finalizacao-upload"
                  />
                  <label
                    htmlFor="photo-finalizacao-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <ImageIcon className="w-8 h-8 text-green-600 mb-2" />
                    <span className="text-sm text-green-800">
                      {uploadingPhoto ? 'Fazendo upload...' : 'Adicionar fotos de finalização'}
                    </span>
                    <span className="text-xs text-green-600 mt-1">
                      {photosFinalizacao.length}/10 fotos
                    </span>
                  </label>
                </div>

                {photosFinalizacao.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-3">
                    {photosFinalizacao.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Finalização ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-green-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhotoFinalizacao(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vídeos de Finalização */}
              <div className="space-y-2">
                <Label>Vídeos de Finalização (até 2)</Label>
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleVideoUpload}
                    disabled={uploadingVideo || videosFinalizacao.length >= 2}
                    className="hidden"
                    id="video-finalizacao-upload"
                  />
                  <label
                    htmlFor="video-finalizacao-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Video className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="text-sm text-blue-800">
                      {uploadingVideo ? 'Fazendo upload...' : 'Adicionar vídeos de finalização'}
                    </span>
                    <span className="text-xs text-blue-600 mt-1">
                      {videosFinalizacao.length}/2 vídeos (máx 50MB cada)
                    </span>
                  </label>
                </div>

                {videosFinalizacao.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {videosFinalizacao.map((url, index) => (
                      <div key={index} className="relative group">
                        <video
                          src={url}
                          controls
                          className="w-full h-32 rounded-lg border-2 border-blue-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Opção de criar evento na agenda */}
        {ehNovoChamado && currentChamado.data_agendamento && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <input
              type="checkbox"
              id="criar-evento"
              checked={criarEvento}
              onChange={(e) => setCriarEvento(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="criar-evento" className="text-sm text-blue-900 cursor-pointer">
              🗓️ Criar evento automaticamente na agenda
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {ehNovoChamado ? '➕ Criar Chamado' : '✏️ Salvar Alterações'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}