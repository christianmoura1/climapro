import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  User
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ListaPontos from "../components/ponto/ListaPontos";
import FiltrosPonto from "../components/ponto/FiltrosPonto";
import AdicionarPontoManual from "../components/ponto/AdicionarPontoManual";
import { PageLoading } from "@/components/ui/page-loading";
import { toast } from "@/components/ui/use-toast";

// Funções auxiliares para trabalhar com datas em Brasília
const obterDataLocal = (dataString) => {
  return new Date(dataString);
};

const obterChaveData = (dataString) => {
  const data = obterDataLocal(dataString);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export default function PontoEletronicoPage() {
  const [user, setUser] = useState(null);
  const [mesReferencia, setMesReferencia] = useState(new Date());
  const [filtros, setFiltros] = useState({
    tecnico_id: 'todos',
    status: 'todos'
  });
  const [showAdicionarManual, setShowAdicionarManual] = useState(false);
  const [alertasFechados, setAlertasFechados] = useState([]);
  const [visualizacao, setVisualizacao] = useState('diaria'); // 'diaria', 'semanal', 'mensal'
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const { data: pontos = [], isLoading } = useQuery({
    queryKey: ['pontos', user?.empresa_id, mesReferencia.getMonth(), mesReferencia.getFullYear()],
    queryFn: async () => {
      const inicio = startOfMonth(mesReferencia);
      const fim = endOfMonth(mesReferencia);
      
      if (user?.email === "christianmoura2014@gmail.com") {
        const todosPontos = await base44.entities.PontoEletronico.list('-data_hora');
        return todosPontos.filter(p => {
          const dataPonto = obterDataLocal(p.data_hora);
          return dataPonto >= inicio && dataPonto <= fim;
        });
      }
      
      const pontosDaEmpresa = await base44.entities.PontoEletronico.filter(
        { empresa_id: user.empresa_id },
        '-data_hora'
      );
      
      return pontosDaEmpresa.filter(p => {
        const dataPonto = obterDataLocal(p.data_hora);
        return dataPonto >= inicio && dataPonto <= fim;
      });
    },
    enabled: !!user
  });

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

  const pontosFiltrados = pontos.filter(ponto => {
    if (filtros.tecnico_id !== 'todos' && ponto.tecnico_id !== filtros.tecnico_id) return false;
    if (filtros.status !== 'todos' && ponto.status !== filtros.status) return false;
    return true;
  });

  const calcularEstatisticas = () => {
    const tecnicosUnicos = [...new Set(pontosFiltrados.map(p => p.tecnico_id))];
    const registrosCompletos = tecnicosUnicos.filter(tecnicoId => {
      const pontosTecnico = pontosFiltrados.filter(p => p.tecnico_id === tecnicoId);
      const diasComPonto = [...new Set(pontosTecnico.map(p => obterChaveData(p.data_hora)))];
      return diasComPonto.length >= 20;
    }).length;

    const totalHoras = calcularTotalHoras(pontosFiltrados);
    const alertas = identificarAlertas(pontosFiltrados);

    return {
      totalRegistros: pontosFiltrados.length,
      tecnicosAtivos: tecnicosUnicos.length,
      registrosCompletos,
      totalHoras,
      alertas: alertas.length
    };
  };

  const calcularTotalHoras = (pontos) => {
    let totalMinutos = 0;
    const pontosPorTecnicoDia = {};

    pontos.forEach(ponto => {
      const chaveData = obterChaveData(ponto.data_hora);
      const chave = `${ponto.tecnico_id}_${chaveData}`;
      if (!pontosPorTecnicoDia[chave]) {
        pontosPorTecnicoDia[chave] = [];
      }
      pontosPorTecnicoDia[chave].push(ponto);
    });

    Object.values(pontosPorTecnicoDia).forEach(pontosDia => {
      pontosDia.sort((a, b) => obterDataLocal(a.data_hora) - obterDataLocal(b.data_hora));
      const entrada = pontosDia.find(p => p.tipo_registro === 'entrada');
      const saida = pontosDia.find(p => p.tipo_registro === 'saida_final');
      
      if (entrada && saida) {
        const diffMs = obterDataLocal(saida.data_hora) - obterDataLocal(entrada.data_hora);
        const minutos = diffMs / (1000 * 60);
        totalMinutos += (minutos - 60);
      }
    });

    const horas = Math.floor(totalMinutos / 60);
    const minutos = Math.floor(totalMinutos % 60);
    return `${horas}h${minutos.toString().padStart(2, '0')}`;
  };

  const calcularHorasPorTecnico = (pontos) => {
    const porTecnico = {};
    
    pontos.forEach(ponto => {
      if (!porTecnico[ponto.tecnico_id]) {
        porTecnico[ponto.tecnico_id] = [];
      }
      porTecnico[ponto.tecnico_id].push(ponto);
    });

    return Object.entries(porTecnico).map(([tecnicoId, pontosTecnico]) => {
      const tecnico = tecnicos.find(t => t.id === tecnicoId);
      const totalHoras = calcularTotalHoras(pontosTecnico);
      
      // Calcular horas por semana
      const semanas = {};
      pontosTecnico.forEach(ponto => {
        const data = obterDataLocal(ponto.data_hora);
        const semana = `Semana ${Math.ceil(data.getDate() / 7)}`;
        if (!semanas[semana]) semanas[semana] = [];
        semanas[semana].push(ponto);
      });

      const horasPorSemana = Object.entries(semanas).map(([semana, pontosSemana]) => ({
        semana,
        horas: calcularTotalHoras(pontosSemana)
      }));

      return {
        tecnicoId,
        nome: tecnico?.nome || 'Desconhecido',
        totalMensal: totalHoras,
        semanas: horasPorSemana
      };
    });
  };

  const identificarAlertas = (pontos) => {
    const alertas = [];
    const pontosPorTecnicoDia = {};

    pontos.forEach(ponto => {
      const chaveData = obterChaveData(ponto.data_hora);
      const chave = `${ponto.tecnico_id}_${chaveData}`;
      if (!pontosPorTecnicoDia[chave]) {
        pontosPorTecnicoDia[chave] = [];
      }
      pontosPorTecnicoDia[chave].push(ponto);
    });

    Object.entries(pontosPorTecnicoDia).forEach(([chave, pontosDia]) => {
      const [tecnicoId, data] = chave.split('_');
      const tecnico = tecnicos.find(t => t.id === tecnicoId);
      
      // Verificar se é final de semana (sábado = 6, domingo = 0)
      // Usar o primeiro ponto do dia para determinar o dia da semana
      const dataObj = obterDataLocal(pontosDia[0].data_hora);
      const diaSemana = dataObj.getDay();
      if (diaSemana === 0 || diaSemana === 6) {
        return; // Ignorar sábados e domingos
      }
      
      pontosDia.sort((a, b) => obterDataLocal(a.data_hora) - obterDataLocal(b.data_hora));
      const entrada = pontosDia.find(p => p.tipo_registro === 'entrada');
      const saida = pontosDia.find(p => p.tipo_registro === 'saida_final');
      
      // Jornada completa precisa ter entrada E saída final
      // Saída almoço e retorno são opcionais
      if (!entrada || !saida) {
        alertas.push({
          id: `${tecnicoId}_${data}_incompleto`,
          tipo: 'incompleto',
          tecnico: tecnico?.nome || 'Desconhecido',
          data,
          mensagem: 'Jornada incompleta'
        });
      }
      
      if (entrada && saida) {
        const diffMs = obterDataLocal(saida.data_hora) - obterDataLocal(entrada.data_hora);
        const horas = diffMs / (1000 * 60 * 60);
        if (horas > 10) {
          alertas.push({
            id: `${tecnicoId}_${data}_hora_extra`,
            tipo: 'hora_extra',
            tecnico: tecnico?.nome || 'Desconhecido',
            data,
            mensagem: `Jornada de ${horas.toFixed(1)}h (acima de 10h)`
          });
        }
      }
    });

    return alertas;
  };

  const estatisticas = calcularEstatisticas();
  const alertas = identificarAlertas(pontosFiltrados).filter(
    (alerta) => !alertasFechados.includes(alerta.id)
  );

  const handleFecharAlerta = (alertaId) => {
    setAlertasFechados([...alertasFechados, alertaId]);
  };

  const handleExportarPDF = async () => {
    toast({ description: "Funcionalidade de exportação será implementada em breve!", variant: "default" });
  };

  if (!user) {
    return (
      <PageLoading />
    );
  }

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Ponto Eletrônico</h1>
              <p className="text-muted-foreground mt-1">Controle de jornada e localização dos técnicos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAdicionarManual(true)} className="bg-blue-600 hover:bg-blue-700">
              <Clock className="w-4 h-4 mr-2" />
              Adicionar Ponto Manual
            </Button>
            <Button onClick={handleExportarPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card className="shadow-sm border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Registros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-foreground">{estatisticas.totalRegistros}</p>
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Técnicos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-foreground">{estatisticas.tecnicosAtivos}</p>
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Registros Completos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-foreground">{estatisticas.registrosCompletos}</p>
                <CheckCircle className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Horas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-foreground">{estatisticas.totalHoras}</p>
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-orange-600">{estatisticas.alertas}</p>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {alertas.length > 0 && (
          <Card className="shadow-lg border-none mb-8 border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="w-5 h-5" />
                Alertas e Pendências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alertas.slice(0, 5).map((alerta) => (
                  <div key={alerta.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg group">
                    <div className="flex-1">
                      <p className="font-semibold text-orange-900">{alerta.tecnico}</p>
                      <p className="text-sm text-orange-700">
                        {format(new Date(alerta.data), "dd/MM/yyyy", { locale: ptBR })} - {alerta.mensagem}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-800">{alerta.tipo}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFecharAlerta(alerta.id)}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                      >
                        <span className="text-lg leading-none">×</span>
                      </Button>
                    </div>
                  </div>
                ))}
                {alertas.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    +{alertas.length - 5} alertas adicionais
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg border-none mb-6">
          <CardContent className="p-6">
            <div className="flex gap-2 mb-4">
              <Button
                variant={visualizacao === 'diaria' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('diaria')}
              >
                Visualização Diária
              </Button>
              <Button
                variant={visualizacao === 'semanal' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('semanal')}
              >
                Resumo Semanal
              </Button>
              <Button
                variant={visualizacao === 'mensal' ? 'default' : 'outline'}
                onClick={() => setVisualizacao('mensal')}
              >
                Resumo Mensal
              </Button>
            </div>
          </CardContent>
        </Card>

        <FiltrosPonto
          filtros={filtros}
          onFiltrosChange={setFiltros}
          tecnicos={tecnicos}
          mesReferencia={mesReferencia}
          onMesChange={setMesReferencia}
        />

        {visualizacao === 'diaria' && (
          <ListaPontos
            pontos={pontosFiltrados}
            tecnicos={tecnicos}
            isLoading={isLoading}
            podeEditar={true}
          />
        )}

        {visualizacao === 'semanal' && (
          <div className="space-y-6">
            {calcularHorasPorTecnico(pontosFiltrados).map((resultado) => (
              <Card key={resultado.tecnicoId} className="shadow-lg border-none">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{resultado.nome}</span>
                    <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
                      Total Mensal: {resultado.totalMensal}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    {resultado.semanas.map((semana) => (
                      <Card key={semana.semana} className="bg-muted">
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground mb-1">{semana.semana}</p>
                          <p className="text-2xl font-bold text-foreground">{semana.horas}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {visualizacao === 'mensal' && (
          <div className="space-y-4">
            {calcularHorasPorTecnico(pontosFiltrados).map((resultado) => (
              <Card key={resultado.tecnicoId} className="shadow-lg border-none">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{resultado.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Total de Horas</p>
                      <p className="text-4xl font-bold text-blue-600">{resultado.totalMensal}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AdicionarPontoManual
        isOpen={showAdicionarManual}
        onClose={() => setShowAdicionarManual(false)}
        tecnicos={tecnicos}
        empresaId={user?.empresa_id}
      />
    </div>
  );
}