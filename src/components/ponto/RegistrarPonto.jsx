import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Clock, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const criarDataBrasilia = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  const segundo = String(data.getSeconds()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}-03:00`;
};

export default function RegistrarPonto({ isOpen, onClose, user, tecnico, ultimoPonto, onSuccess }) {
  const [localizacao, setLocalizacao] = useState(null);
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [registrando, setRegistrando] = useState(false);
  const queryClient = useQueryClient();

  // Determinar próximo tipo de ponto baseado no último registro
  const determinarProximoTipo = () => {
    if (!ultimoPonto) return 'entrada';
    
    const hoje = new Date().toDateString();
    const dataUltimoPonto = new Date(ultimoPonto.data_hora).toDateString();
    
    // Se o último ponto não é de hoje, começar nova jornada
    if (hoje !== dataUltimoPonto) {
      return 'entrada';
    }

    // Verificar o tipo do último ponto para determinar o próximo
    switch (ultimoPonto.tipo_registro) {
      case 'entrada':
        return 'saida_final'; // Após entrada, permitir apenas saída
      case 'saida_almoco':
        return 'retorno';
      case 'retorno':
        return 'saida_final';
      case 'saida_final':
        return null; // Jornada completa
      default:
        return 'entrada';
    }
  };

  const proximoTipo = determinarProximoTipo();

  const tiposLabel = {
    entrada: "Registrar Entrada",
    saida_almoco: "Registrar Saída para Almoço",
    retorno: "Registrar Retorno do Almoço",
    saida_final: "Registrar Saída Final"
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraAtual(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocalizacao({ latitude, longitude });
          
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            setEndereco(data.display_name || "Endereço não disponível");
          } catch (error) {
            setEndereco("Erro ao obter endereço");
          }
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          alert("❌ Não foi possível obter sua localização. Ative o GPS e tente novamente.");
          onClose();
        }
      );
    }
  }, [isOpen, onClose]);

  const registrarPontoMutation = useMutation({
    mutationFn: async (tipo) => {
      if (!localizacao) throw new Error("Localização não disponível");

      const dataAtualBrasilia = criarDataBrasilia(new Date());

      await base44.entities.PontoEletronico.create({
        empresa_id: user.empresa_id,
        tecnico_id: tecnico.id,
        tipo_registro: tipo,
        data_hora: dataAtualBrasilia,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        endereco: endereco,
        observacoes: observacoes,
        status: 'normal'
      });

      // Se for entrada, registrar automaticamente saída e retorno do almoço
      if (tipo === 'entrada') {
        const dataSaidaAlmoco = new Date();
        dataSaidaAlmoco.setHours(12, 0, 0, 0);
        const dataSaidaAlmocoBrasilia = criarDataBrasilia(dataSaidaAlmoco);

        await base44.entities.PontoEletronico.create({
          empresa_id: user.empresa_id,
          tecnico_id: tecnico.id,
          tipo_registro: 'saida_almoco',
          data_hora: dataSaidaAlmocoBrasilia,
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
          endereco: endereco,
          observacoes: "Registro automático",
          status: 'normal'
        });

        // Adicionar retorno do almoço (13:00)
        const dataRetornoAlmoco = new Date();
        dataRetornoAlmoco.setHours(13, 0, 0, 0);
        const dataRetornoAlmocoBrasilia = criarDataBrasilia(dataRetornoAlmoco);

        await base44.entities.PontoEletronico.create({
          empresa_id: user.empresa_id,
          tecnico_id: tecnico.id,
          tipo_registro: 'retorno',
          data_hora: dataRetornoAlmocoBrasilia,
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
          endereco: endereco,
          observacoes: "Registro automático",
          status: 'normal'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ultimo-ponto']);
      queryClient.invalidateQueries(['pontos']);
      alert("✅ Ponto registrado com sucesso!");
      onSuccess();
    },
    onError: (error) => {
      console.error("Erro ao registrar ponto:", error);
      alert("❌ Erro ao registrar ponto. Tente novamente.");
      setRegistrando(false);
    }
  });

  const handleRegistrar = async () => {
    if (!proximoTipo) {
      alert("⚠️ Você já completou sua jornada de hoje!");
      return;
    }

    if (registrando) return; // Prevenir duplo clique

    const confirmacao = window.confirm(
      `Deseja registrar ${tiposLabel[proximoTipo].toLowerCase()}?\n\n` +
      `📍 Local: ${endereco}\n` +
      `🕐 Horário: ${horaAtual.toLocaleTimeString('pt-BR')}`
    );

    if (confirmacao) {
      setRegistrando(true);
      registrarPontoMutation.mutate(proximoTipo);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ponto Eletrônico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Relógio */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none">
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold text-blue-900 mb-2">
                {horaAtual.toLocaleTimeString('pt-BR')}
              </p>
              <p className="text-sm text-blue-700">
                {horaAtual.toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </CardContent>
          </Card>

          {/* Status da Jornada */}
          {ultimoPonto && (
            <Card className="border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Último registro:</p>
                    <p className="text-sm text-gray-600">
                      {tiposLabel[ultimoPonto.tipo_registro] || ultimoPonto.tipo_registro} - {' '}
                      {new Date(ultimoPonto.data_hora).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Localização */}
          <Card className="border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Sua Localização
              </CardTitle>
            </CardHeader>
            <CardContent>
              {localizacao ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">{endereco}</p>
                  <p className="text-xs text-gray-500">
                    Lat: {localizacao.latitude.toFixed(6)}, Lon: {localizacao.longitude.toFixed(6)}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <p className="text-sm">Obtendo localização...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Observações (opcional)
            </label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Trabalhando em obra externa"
              rows={3}
              disabled={registrando}
            />
          </div>

          {/* Botão de Registro */}
          {proximoTipo ? (
            <Button
              onClick={handleRegistrar}
              disabled={!localizacao || registrando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
            >
              {registrando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  {tiposLabel[proximoTipo]}
                </>
              )}
            </Button>
          ) : (
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-green-900">Jornada Completa!</p>
              <p className="text-sm text-green-700 mt-1">
                Você já registrou todos os pontos de hoje.
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            O registro de ponto captura sua localização para garantir autenticidade
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}