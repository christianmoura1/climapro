import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, MapPin, Calendar } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import HistoricoChamadosEquipamento from "../components/equipamentos/HistoricoChamadosEquipamento";
import { PageLoading } from "@/components/ui/page-loading";

const tipoConfig = {
  ar_condicionado: { label: "Ar Condicionado", color: "bg-blue-100 text-blue-800" },
  camara_fria: { label: "Câmara Fria", color: "bg-cyan-100 text-cyan-800" },
  geladeira: { label: "Geladeira", color: "bg-green-100 text-green-800" },
  freezer: { label: "Freezer", color: "bg-purple-100 text-purple-800" },
  chiller: { label: "Chiller", color: "bg-indigo-100 text-indigo-800" },
  outro: { label: "Outro", color: "bg-muted text-foreground" }
};

export default function EquipamentoDetalhesPage() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const equipamentoId = new URLSearchParams(location.search).get('id');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: equipamento, isLoading } = useQuery({
    queryKey: ['equipamento', equipamentoId],
    queryFn: async () => {
      const equipamentos = await base44.entities.Equipamento.list();
      return equipamentos.find(e => e.id === equipamentoId);
    },
    enabled: !!equipamentoId
  });

  const { data: cliente } = useQuery({
    queryKey: ['cliente', equipamento?.cliente_id],
    queryFn: async () => {
      const clientes = await base44.entities.Cliente.list();
      return clientes.find(c => c.id === equipamento.cliente_id);
    },
    enabled: !!equipamento?.cliente_id
  });

  if (isLoading || !user) {
    return (
      <PageLoading />
    );
  }

  if (!equipamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-none">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Equipamento não encontrado</p>
              <Link to={createPageUrl("Equipamentos")}>
                <Button>Voltar para Equipamentos</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tipo = tipoConfig[equipamento.tipo] || tipoConfig.outro;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Equipamentos")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {equipamento.numero_equipamento}
              </h1>
              <p className="text-muted-foreground mt-1">Detalhes do Equipamento</p>
            </div>
          </div>
          <Link to={createPageUrl("Equipamentos")}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Edit className="w-4 h-4 mr-2" />
              Editar Equipamento
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Card Principal */}
          <Card className="lg:col-span-2 shadow-lg border-none">
            <CardHeader className="border-b">
              <div className="flex justify-between items-start">
                <div>
                  <Badge className={tipo.color + " mb-3"}>
                    {tipo.label}
                  </Badge>
                  <CardTitle className="text-2xl">{equipamento.numero_equipamento}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {equipamento.foto_url && (
                <div className="mb-6">
                  <img
                    src={equipamento.foto_url}
                    alt={equipamento.numero_equipamento}
                    className="w-full h-64 object-cover rounded-lg border-2 border-border"
                  />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Marca</h3>
                  <p className="text-foreground font-medium">{equipamento.marca}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Modelo</h3>
                  <p className="text-foreground font-medium">{equipamento.modelo}</p>
                </div>

                {equipamento.capacidade && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Capacidade</h3>
                    <p className="text-foreground font-medium">{equipamento.capacidade}</p>
                  </div>
                )}

                {equipamento.numero_serie && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Número de Série</h3>
                    <p className="text-foreground font-medium">{equipamento.numero_serie}</p>
                  </div>
                )}

                {equipamento.localizacao && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Localização</h3>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">{equipamento.localizacao}</p>
                    </div>
                  </div>
                )}

                {equipamento.data_instalacao && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Data de Instalação</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">
                        {format(new Date(equipamento.data_instalacao), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {equipamento.observacoes && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Observações</h3>
                  <p className="text-foreground bg-muted p-4 rounded-lg">{equipamento.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card do Cliente */}
          <Card className="shadow-lg border-none">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {cliente ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Nome</h3>
                    <p className="text-foreground font-medium">{cliente.nome}</p>
                  </div>

                  {cliente.telefone && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Telefone</h3>
                      <a href={`tel:${cliente.telefone}`} className="text-blue-600 hover:underline">
                        {cliente.telefone}
                      </a>
                    </div>
                  )}

                  {cliente.endereco && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Endereço</h3>
                      <p className="text-foreground">{cliente.endereco}</p>
                    </div>
                  )}

                  <Link to={createPageUrl("Clientes")}>
                    <Button variant="outline" className="w-full mt-4">
                      Ver Detalhes do Cliente
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground">Cliente não encontrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Chamados */}
        <HistoricoChamadosEquipamento 
          equipamentoId={equipamentoId}
          equipamento={equipamento}
          user={user}
        />
      </div>
    </div>
  );
}