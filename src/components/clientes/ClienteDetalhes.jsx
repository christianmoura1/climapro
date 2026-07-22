import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Phone, Mail, MapPin, Cpu, Edit, Trash2, Key, Eye, Copy, ClipboardList, Clock, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import HistoricoChamadosCliente from "./HistoricoChamadosCliente";
import { toast } from "@/components/ui/use-toast";

const STATUS_CONFIG = {
  pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
  em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
  aguardando_pecas: { color: "bg-yellow-100 text-yellow-800", label: "Aguard. Peças" },
  aguardando_aprovacao_empresa: { color: "bg-purple-100 text-purple-800", label: "Aguard. Aprovação" },
  finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
  cancelado: { color: "bg-muted text-foreground", label: "Cancelado" },
};

// tipoConfig object removed as it is no longer used for rendering equipment badges

export default function ClienteDetalhes({
  cliente,
  equipamentos,
  onVoltar,
  onEditarCliente,
  onDeletarCliente,
  onVisualizarEquipamento,
  onVisualizarChamado,
  onDeletarChamado
}) {
  const [user, setUser] = useState(null);
  const [estAtivaIdx, setEstAtivaIdx] = useState(null); // null = visão geral
  const [chamadosCliente, setChamadosCliente] = useState([]);
  const [loadingChamados, setLoadingChamados] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!cliente?.id) return;
    setLoadingChamados(true);
    base44.entities.Chamado.filter({ cliente_id: cliente.id }, '-created_date', 200)
      .then(setChamadosCliente)
      .finally(() => setLoadingChamados(false));
  }, [cliente?.id]);

  const estabelecimentos = cliente.estabelecimentos || [];
  const estAtiva = estAtivaIdx !== null ? estabelecimentos[estAtivaIdx] : null;

  // Equipamentos filtrados pelo estabelecimento ativo (por localizacao)
  const equipamentosVisiveis = estAtiva
    ? equipamentos.filter(eq => {
        const loc = (eq.localizacao || "").toLowerCase();
        const nome = estAtiva.nome.toLowerCase();
        const end = (estAtiva.endereco || "").toLowerCase();
        return loc.includes(nome) || (end && end.split(/[\s,]+/).filter(p => p.length > 3).some(p => loc.includes(p)));
      })
    : equipamentos;

  // Chamados filtrados pelo estabelecimento ativo (por local)
  const chamadosVisiveis = estAtiva
    ? chamadosCliente.filter(c => {
        const local = (c.local || "").toLowerCase();
        const end = (estAtiva.endereco || "").toLowerCase();
        if (!end || !local) return false;
        // Comparar pelo começo do endereço (rua + número), ignorando bairro/cidade
        const enderecoBase = end.split(',')[0].trim();
        const localBase = local.split(',')[0].trim();
        return localBase.includes(enderecoBase) || enderecoBase.includes(localBase);
      })
    : chamadosCliente;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onVoltar}> {/* Updated handler */}
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{cliente.nome}</h1>
              <p className="text-muted-foreground mt-1">Detalhes do cliente, equipamentos e histórico</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onDeletarCliente(cliente)} // Updated handler
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Cliente
            </Button>
            <Button
              onClick={() => onEditarCliente(cliente)} // Updated handler
              className="bg-green-600 hover:bg-green-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar Cliente
            </Button>
          </div>
        </div>

        <div className="space-y-6">

          {/* Info do cliente */}
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                {cliente.telefone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{cliente.telefone}</span></div>}
                {cliente.whatsapp && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{cliente.whatsapp}</span></div>}
                {cliente.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span>{cliente.email}</span></div>}
                {cliente.endereco && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{cliente.endereco}</span></div>}
              </div>
              {cliente.tem_acesso_portal && (
                <div className="flex items-center gap-3 pt-2">
                  <Badge className="bg-blue-100 text-blue-800"><Key className="w-3 h-3 mr-1" />Portal Ativo</Badge>
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => {
                    const msg = `🔐 ACESSO AO PORTAL DO CLIENTE - ClimaPro\n\nOlá ${cliente.nome}!\n\nAcesse: https://geradordepmoc.com.br\n\nEmail: ${cliente.email}\nCrie sua senha no primeiro acesso.\n\nDúvidas? ${cliente.whatsapp || cliente.telefone}`;
                    navigator.clipboard.writeText(msg).then(() => toast({ description: '✅ Instruções copiadas!', variant: "success" })).catch(() => toast({ description: msg, variant: "default" }));
                  }}>
                    <Copy className="w-3 h-3 mr-1" />Copiar Link de Acesso
                  </Button>
                </div>
              )}
              {cliente.observacoes && <p className="text-sm text-foreground bg-muted p-3 rounded-lg">{cliente.observacoes}</p>}
            </CardContent>
          </Card>

          {/* Abas de Estabelecimentos */}
          {estabelecimentos.length > 0 && (
            <Card className="shadow-lg border-none">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-5 h-5" />
                  Estabelecimentos
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setEstAtivaIdx(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${estAtivaIdx === null ? 'bg-green-600 text-white border-green-600' : 'bg-white text-muted-foreground border-border hover:bg-muted'}`}
                  >
                    🏢 Todos ({estabelecimentos.length} estabelecimentos)
                  </button>
                  {estabelecimentos.map((est, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEstAtivaIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${estAtivaIdx === idx ? 'bg-green-600 text-white border-green-600' : 'bg-white text-muted-foreground border-border hover:bg-muted'}`}
                    >
                      {est.nome === 'Casa' || est.nome === 'casa' ? '🏠' :
                       est.nome === 'Loja' || est.nome === 'loja' ? '🏪' :
                       est.nome === 'Escritório' || est.nome === 'escritório' || est.nome === 'Escritorio' ? '🏢' :
                       est.nome === 'Trabalho' || est.nome === 'trabalho' ? '💼' :
                       est.nome === 'Empresa' || est.nome === 'empresa' ? '🏭' : '📍'} {est.nome}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {estAtiva && (
                  <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-foreground">
                    <p><strong>Endereço:</strong> {estAtiva.endereco || 'Não cadastrado'}</p>
                    {estAtiva.latitude && estAtiva.longitude && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => window.open(`https://www.google.com/maps?q=${estAtiva.latitude},${estAtiva.longitude}`, '_blank')}>
                        <MapPin className="w-3 h-3 mr-1" /> Ver no Mapa
                      </Button>
                    )}
                  </div>
                )}

                {/* Equipamentos do estabelecimento */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Equipamentos ({equipamentosVisiveis.length})
                  </h4>
                  {equipamentosVisiveis.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum equipamento neste estabelecimento.</p>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {equipamentosVisiveis.map((equipamento) => (
                        <Card key={equipamento.id} className="hover:shadow-md transition-shadow cursor-pointer border" onClick={() => onVisualizarEquipamento && onVisualizarEquipamento(equipamento)}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              {equipamento.foto_url ? (
                                <img src={equipamento.foto_url} alt={equipamento.modelo} className="w-12 h-12 object-cover rounded-lg border" />
                              ) : (
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Cpu className="w-6 h-6 text-blue-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground text-sm truncate">{equipamento.marca} {equipamento.modelo}</h4>
                                <p className="text-xs text-muted-foreground">{equipamento.tipo?.replace('_', ' ')}</p>
                                {equipamento.capacidade && <p className="text-xs text-muted-foreground">{equipamento.capacidade}</p>}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); onVisualizarEquipamento && onVisualizarEquipamento(equipamento); }}>
                              <Eye className="w-3 h-3 mr-1" /> Ver Histórico
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Histórico de chamados do estabelecimento */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Histórico de Chamados ({chamadosVisiveis.length})
                  </h4>
                  {loadingChamados ? (
                    <p className="text-sm text-muted-foreground text-center py-3">Carregando...</p>
                  ) : chamadosVisiveis.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {estAtiva ? `Nenhum chamado encontrado para ${estAtiva.nome}.` : 'Nenhum chamado registrado.'}
                    </p>
                  ) : (
                    <div className="divide-y border rounded-lg overflow-hidden">
                      {chamadosVisiveis.map((chamado) => {
                        const cfg = STATUS_CONFIG[chamado.status] || STATUS_CONFIG.pendente;
                        const isFinalizado = chamado.status === 'finalizado';
                        return (
                          <div
                            key={chamado.id}
                            className={`py-3 px-4 flex items-start justify-between gap-2 ${isFinalizado ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                            onClick={() => isFinalizado && onVisualizarChamado && onVisualizarChamado(chamado)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{chamado.numero_chamado} — {chamado.titulo}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                {chamado.created_date ? format(new Date(chamado.created_date), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}
                                {chamado.local && <span className="truncate">· {chamado.local}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={cfg.color + " text-xs"}>{cfg.label}</Badge>
                              {onDeletarChamado && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); onDeletarChamado(chamado); }}
                                  className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                  title="Excluir chamado"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Equipamentos (quando não tem estabelecimentos) */}
          {estabelecimentos.length === 0 && (
            <Card className="shadow-lg border-none">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" />Equipamentos ({equipamentos.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {equipamentos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><Cpu className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" /><p>Nenhum equipamento cadastrado</p></div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipamentos.map((equipamento) => (
                      <Card key={equipamento.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onVisualizarEquipamento && onVisualizarEquipamento(equipamento)}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {equipamento.foto_url ? <img src={equipamento.foto_url} alt={equipamento.modelo} className="w-16 h-16 object-cover rounded-lg border-2 border-border" /> : <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center"><Cpu className="w-8 h-8 text-blue-600" /></div>}
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground text-sm mb-1">{equipamento.marca} {equipamento.modelo}</h4>
                              <div className="flex flex-wrap gap-1 mb-2">
                                <Badge variant="outline" className="text-xs capitalize">{equipamento.tipo?.replace('_', ' ')}</Badge>
                                {equipamento.capacidade && <Badge variant="outline" className="text-xs">{equipamento.capacidade}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">📍 {equipamento.localizacao}</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <Button size="sm" variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); onVisualizarEquipamento && onVisualizarEquipamento(equipamento); }}><Eye className="w-3 h-3 mr-2" />Ver Histórico</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Histórico completo (quando não tem estabelecimentos) */}
          {estabelecimentos.length === 0 && user && (
            <HistoricoChamadosCliente clienteId={cliente.id} cliente={cliente} user={user} />
          )}
        </div>
      </div>
    </div>
  );
}