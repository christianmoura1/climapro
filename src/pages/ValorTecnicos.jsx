import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PageLoading } from "@/components/ui/page-loading";

export default function ValorTecnicosPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));
  const [valoresPorTecnico, setValoresPorTecnico] = useState({});
  const [observacoesPorTecnico, setObservacoesPorTecnico] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if (user?.email === "christianmoura2014@gmail.com") {
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ['chamados', user?.empresa_id, mesReferencia],
    queryFn: async () => {
      if (user?.email === "christianmoura2014@gmail.com") {
        return base44.entities.Chamado.list();
      }
      return base44.entities.Chamado.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const { data: valores = [] } = useQuery({
    queryKey: ['valores-tecnicos', user?.empresa_id, mesReferencia],
    queryFn: async () => {
      const mesFormatado = mesReferencia + '-01';
      if (user?.email === "christianmoura2014@gmail.com") {
        return base44.entities.ValorTecnico.filter({ mes_referencia: mesFormatado });
      }
      return base44.entities.ValorTecnico.filter({
        empresa_id: user.empresa_id,
        mes_referencia: mesFormatado
      });
    },
    enabled: !!user
  });

  // Inicializar valores quando os dados carregarem
  useEffect(() => {
    if (valores.length > 0) {
      const novosValores = {};
      const novasObs = {};
      valores.forEach(v => {
        novosValores[v.tecnico_id] = v.valor_por_chamado || 0;
        novasObs[v.tecnico_id] = v.observacoes || "";
      });
      setValoresPorTecnico(novosValores);
      setObservacoesPorTecnico(novasObs);
    }
  }, [valores]);

  const upsertValorMutation = useMutation({
    mutationFn: async ({ tecnico_id, valor_por_chamado, observacoes }) => {
      const mesFormatado = mesReferencia + '-01';
      const valorExistente = valores.find(v => v.tecnico_id === tecnico_id);

      // Contar chamados do técnico no mês
      const inicioMes = new Date(mesReferencia + '-01');
      const fimMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0);
      
      const chamadosDoMes = chamados.filter(c => {
        if (c.tecnico_id !== tecnico_id) return false;
        const dataChamado = new Date(c.data_abertura);
        return dataChamado >= inicioMes && dataChamado <= fimMes;
      }).length;

      const total = chamadosDoMes * (parseFloat(valor_por_chamado) || 0);

      const data = {
        empresa_id: user.empresa_id,
        tecnico_id,
        mes_referencia: mesFormatado,
        chamados_executados: chamadosDoMes,
        valor_por_chamado: parseFloat(valor_por_chamado) || 0,
        total_mes: total,
        observacoes
      };

      if (valorExistente) {
        return base44.entities.ValorTecnico.update(valorExistente.id, data);
      } else {
        return base44.entities.ValorTecnico.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['valores-tecnicos']);
    }
  });

  const handleValorChange = (tecnicoId, valor) => {
    setValoresPorTecnico(prev => ({
      ...prev,
      [tecnicoId]: valor
    }));
  };

  const handleObsChange = (tecnicoId, obs) => {
    setObservacoesPorTecnico(prev => ({
      ...prev,
      [tecnicoId]: obs
    }));
  };

  const calcularTotalGeral = () => {
    return valores.reduce((sum, v) => sum + (v.total_mes || 0), 0);
  };

  const calcularChamadosDoTecnico = (tecnicoId) => {
    const inicioMes = new Date(mesReferencia + '-01');
    const fimMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0);
    
    return chamados.filter(c => {
      if (c.tecnico_id !== tecnicoId) return false;
      const dataChamado = new Date(c.data_abertura);
      return dataChamado >= inicioMes && dataChamado <= fimMes;
    }).length;
  };

  if (!user) {
    return (
      <PageLoading />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Financeiro")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Controle de Valores com Técnicos</h1>
              <p className="text-muted-foreground mt-1">Gerencie valores e chamados por técnico</p>
            </div>
          </div>
        </div>

        {/* Filtro de Mês */}
        <Card className="shadow-lg border-none mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Mês de Referência:</label>
              <Input
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
                className="w-48"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Técnicos */}
        <Card className="shadow-lg border-none mb-6">
          <CardHeader>
            <CardTitle>Valores por Técnico</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Técnico</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Chamados</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Valor/Chamado</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Total Mês</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Observações</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tecnicos.map((tecnico) => {
                    const valorTecnico = valores.find(v => v.tecnico_id === tecnico.id) || {};
                    const valorPorChamado = valoresPorTecnico[tecnico.id] ?? (valorTecnico.valor_por_chamado || 0);
                    const obs = observacoesPorTecnico[tecnico.id] ?? (valorTecnico.observacoes || "");
                    const chamadosExecutados = calcularChamadosDoTecnico(tecnico.id);
                    const totalMes = chamadosExecutados * parseFloat(valorPorChamado || 0);

                    return (
                      <tr key={tecnico.id} className="hover:bg-muted">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{tecnico.nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-lg font-bold text-blue-600">
                          {chamadosExecutados}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Input
                            type="number"
                            value={valorPorChamado}
                            onChange={(e) => handleValorChange(tecnico.id, e.target.value)}
                            className="w-32 mx-auto"
                            placeholder="0.00"
                            step="0.01"
                          />
                        </td>
                        <td className="px-6 py-4 text-center text-lg font-bold text-green-600">
                          R$ {totalMes.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <Input
                            type="text"
                            value={obs}
                            onChange={(e) => handleObsChange(tecnico.id, e.target.value)}
                            placeholder="Observações..."
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="sm"
                            onClick={() => upsertValorMutation.mutate({
                              tecnico_id: tecnico.id,
                              valor_por_chamado: valorPorChamado,
                              observacoes: obs
                            })}
                            disabled={upsertValorMutation.isPending}
                          >
                            {upsertValorMutation.isPending ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted border-t-2">
                  <tr>
                    <td colSpan="3" className="px-6 py-4 font-bold text-foreground">TOTAL GERAL</td>
                    <td className="px-6 py-4 text-center text-2xl font-bold text-green-600">
                      R$ {calcularTotalGeral().toFixed(2)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}