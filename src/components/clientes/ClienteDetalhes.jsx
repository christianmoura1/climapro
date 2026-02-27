
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Phone, Mail, MapPin, Cpu, Edit, Trash2, Key, Eye } from "lucide-react";
import { base44 } from "@/api/base44Client";

import HistoricoChamadosCliente from "./HistoricoChamadosCliente";

// tipoConfig object removed as it is no longer used for rendering equipment badges

export default function ClienteDetalhes({
  cliente,
  equipamentos,
  onVoltar, // Changed from onClose
  onEditarCliente, // Changed from onEdit
  onDeletarCliente, // Changed from onDelete
  onVisualizarEquipamento // New prop for equipment interaction
}) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onVoltar}> {/* Updated handler */}
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{cliente.nome}</h1>
              <p className="text-gray-600 mt-1">Detalhes do cliente, equipamentos e histórico</p>
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

        {/* New wrapper for stacking major sections: Client Info, Equipments, History */}
        <div className="space-y-6">

          {/* Informações do Cliente - Kept as is, now a direct child of space-y-6 */}
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Nome/Razão Social</p>
                <p className="font-semibold text-gray-900">{cliente.nome}</p>
              </div>

              {cliente.telefone && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Telefone</p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{cliente.telefone}</p>
                  </div>
                </div>
              )}

              {cliente.whatsapp && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">WhatsApp</p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{cliente.whatsapp}</p>
                  </div>
                </div>
              )}

              {cliente.email && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{cliente.email}</p>
                  </div>
                </div>
              )}

              {cliente.endereco && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Endereço</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <p className="text-gray-900">{cliente.endereco}</p>
                  </div>
                </div>
              )}

              {cliente.tipo_estabelecimento && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tipo de Estabelecimento</p>
                  <Badge className="bg-green-100 text-green-800 capitalize">
                    {cliente.tipo_estabelecimento}
                  </Badge>
                </div>
              )}

              {cliente.tem_acesso_portal && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Acesso ao Portal</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    <Key className="w-3 h-3 mr-1" />
                    Portal Ativo
                  </Badge>
                </div>
              )}

              {cliente.observacoes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Observações</p>
                  <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                    {cliente.observacoes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipamentos - Reworked section */}
          <Card className="shadow-lg border-none">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Equipamentos ({equipamentos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {equipamentos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Cpu className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>Nenhum equipamento cadastrado</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipamentos.map((equipamento) => (
                    <Card
                      key={equipamento.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => onVisualizarEquipamento && onVisualizarEquipamento(equipamento)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {equipamento.foto_url ? (
                            <img
                              src={equipamento.foto_url}
                              alt={equipamento.modelo}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Cpu className="w-8 h-8 text-blue-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1">
                              {equipamento.marca} {equipamento.modelo}
                            </h4>
                            <div className="flex flex-wrap gap-1 mb-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {equipamento.tipo.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {equipamento.capacidade}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">
                              📍 {equipamento.localizacao}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card's onClick from firing
                              onVisualizarEquipamento && onVisualizarEquipamento(equipamento);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-2" />
                            Ver Histórico
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Chamados - Kept as is, now a direct child of space-y-6 */}
          {user && (
            <HistoricoChamadosCliente
              clienteId={cliente.id}
              cliente={cliente}
              user={user}
            />
          )}
        </div> {/* End of space-y-6 div */}
      </div>
    </div>
  );
}
