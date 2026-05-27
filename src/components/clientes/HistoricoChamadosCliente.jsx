import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Eye, Plus, AlertCircle, Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-orange-100 text-orange-800" },
  em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-800" },
  finalizado: { label: "Finalizado", color: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-800" }
};

const tipoProblemaConfig = {
  manutencao_preventiva: "Preventiva",
  manutencao_corretiva: "Corretiva",
  instalacao: "Instalação",
  emergencia: "Emergência",
  outro: "Outro"
};

export default function HistoricoChamadosCliente({ clienteId, cliente, user }) {
  const navigate = useNavigate();

  const { data: chamados = [], isLoading } = useQuery({
    queryKey: ['chamados-cliente', clienteId],
    queryFn: async () => {
      if (!user) return [];
      
      const todosChamados = user.email === "christianmoura2014@gmail.com"
        ? await base44.entities.Chamado.list('-created_date')
        : await base44.entities.Chamado.filter(
            { empresa_id: user.empresa_id },
            '-created_date'
          );
      
      // Filtrar chamados deste cliente
      return todosChamados.filter(chamado => chamado.cliente_id === clienteId);
    },
    enabled: !!clienteId && !!user
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if (user.email === "christianmoura2014@gmail.com") {
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if (user.email === "christianmoura2014@gmail.com") {
        return base44.entities.Equipamento.list();
      }
      return base44.entities.Equipamento.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const handleNovoChamado = () => {
    // Redirecionar para página de chamados com cliente pré-selecionado
    navigate(createPageUrl("Chamados") + `?cliente_id=${clienteId}`);
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando histórico...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Histórico de Chamados ({chamados.length})
          </CardTitle>
          <Button
            onClick={handleNovoChamado}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Chamado
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {chamados.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Nenhum chamado registrado para este cliente</p>
            <p className="text-sm text-gray-500">Clique em "Novo Chamado" para criar o primeiro</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chamado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Técnico
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chamados.map((chamado) => {
                  const tecnico = tecnicos.find(t => t.id === chamado.tecnico_id);
                  const equipamento = equipamentos.find(e => e.id === chamado.equipamento_id);
                  const status = statusConfig[chamado.status] || statusConfig.pendente;

                  return (
                    <tr key={chamado.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {chamado.numero_chamado || `#${chamado.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {chamado.titulo}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {chamado.created_date 
                          ? format(new Date(chamado.created_date), "dd/MM/yyyy", { locale: ptBR })
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {tecnico?.nome || 'Não atribuído'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {equipamento ? (
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {equipamento.numero_equipamento}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tipoProblemaConfig[chamado.tipo_problema] || chamado.tipo_problema}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div className="max-w-xs truncate">
                          {chamado.descricao}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            sessionStorage.setItem('edit_chamado_id', chamado.id);
                            navigate(createPageUrl("Chamados"));
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}