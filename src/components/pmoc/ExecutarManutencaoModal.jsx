
import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Check, 
  Camera, 
  MapPin, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Download,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";

// Componente de Canvas de Assinatura Nativo
function SignatureCanvas({ canvasRef, width = 600, height = 200 }) {
  const [isDrawing, setIsDrawing] = useState(false);

  // Set up canvas context properties
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [canvasRef]);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (event) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    setupCanvas(); // Ensure canvas properties are set
    const { x, y } = getCoordinates(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (event) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={(e) => {
        e.preventDefault(); // Prevent scrolling
        startDrawing(e);
      }}
      onTouchMove={(e) => {
        e.preventDefault(); // Prevent scrolling
        draw(e);
      }}
      onTouchEnd={stopDrawing}
      className="border-2 border-border rounded-lg bg-white cursor-crosshair"
      style={{ touchAction: 'none' }} // Disable default touch actions like pan and zoom
    />
  );
}

export default function ExecutarManutencaoModal({ pmoc, cliente, onClose }) {
  const [user, setUser] = useState(null);
  const [tecnico, setTecnico] = useState(null);
  const queryClient = useQueryClient();
  const sigCanvas = useRef(null);

  // Estados principais
  const [equipamentoExpandido, setEquipamentoExpandido] = useState(null);
  const [checklists, setChecklists] = useState({});
  const [fotos, setFotos] = useState({});
  const [observacoesPorEquipamento, setObservacoesPorEquipamento] = useState({});
  const [nomeCliente, setNomeCliente] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(null);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.tecnico_id) {
        const tecnicoData = await base44.entities.Tecnico.filter({ id: currentUser.tecnico_id });
        setTecnico(tecnicoData[0]);
      }
    };
    loadUser();
  }, []);

  // Buscar equipamentos do PMOC
  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos-pmoc', pmoc.equipamentos_ids],
    queryFn: async () => {
      if (!pmoc.equipamentos_ids || pmoc.equipamentos_ids.length === 0) return [];
      const allEquipamentos = await base44.entities.Equipamento.list();
      return allEquipamentos.filter(e => pmoc.equipamentos_ids.includes(e.id));
    },
    enabled: !!pmoc.equipamentos_ids
  });

  // Inicializar checklists quando equipamentos carregarem
  useEffect(() => {
    if (equipamentos.length > 0 && Object.keys(checklists).length === 0) {
      const checklistsIniciais = {};
      const fotosIniciais = {};
      const observacoesIniciais = {};
      
      equipamentos.forEach(eq => {
        checklistsIniciais[eq.id] = pmoc.atividades?.map(a => ({
          descricao: a.descricao,
          concluido: false,
          observacao: ""
        })) || [];
        fotosIniciais[eq.id] = [];
        observacoesIniciais[eq.id] = "";
      });
      
      setChecklists(checklistsIniciais);
      setFotos(fotosIniciais);
      setObservacoesPorEquipamento(observacoesIniciais);
    }
  }, [equipamentos, pmoc.atividades, checklists]); // Added checklists to dependency array for stricter linting, though check is for Object.keys(checklists).length === 0

  const toggleChecklistItem = (equipamentoId, index) => {
    setChecklists(prev => ({
      ...prev,
      [equipamentoId]: prev[equipamentoId].map((item, i) => 
        i === index ? { ...item, concluido: !item.concluido } : item
      )
    }));
  };

  const updateObservacaoItem = (equipamentoId, index, valor) => {
    setChecklists(prev => ({
      ...prev,
      [equipamentoId]: prev[equipamentoId].map((item, i) => 
        i === index ? { ...item, observacao: valor } : item
      )
    }));
  };

  const handleUploadFoto = async (equipamentoId, file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({ description: '⚠️ Por favor, selecione apenas arquivos de imagem', variant: "warning" });
      return;
    }

    const fotosAtuais = fotos[equipamentoId] || [];
    if (fotosAtuais.length >= 5) {
      toast({ description: '⚠️ Máximo de 5 fotos por equipamento', variant: "warning" });
      return;
    }

    setUploadingFoto(equipamentoId);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFotos(prev => ({
        ...prev,
        [equipamentoId]: [...(prev[equipamentoId] || []), result.file_url]
      }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({ description: '❌ Erro ao fazer upload da foto', variant: "destructive" });
    } finally {
      setUploadingFoto(null);
    }
  };

  const removerFoto = (equipamentoId, index) => {
    setFotos(prev => ({
      ...prev,
      [equipamentoId]: prev[equipamentoId].filter((_, i) => i !== index)
    }));
  };

  const limparAssinatura = () => {
    const canvas = sigCanvas.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const isCanvasEmpty = () => {
    const canvas = sigCanvas.current;
    if (!canvas) return true;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    
    const pixelBuffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    
    return !pixelBuffer.some(color => color !== 0);
  };

  const getCanvasDataURL = () => {
    return sigCanvas.current ? sigCanvas.current.toDataURL() : '';
  };

  const validarFormulario = () => {
    // Verificar se todos os equipamentos têm checklist preenchido
    for (const equipamentoId of Object.keys(checklists)) {
      const checklist = checklists[equipamentoId];
      if (checklist.length === 0) {
        return "❌ Todos os equipamentos devem ter pelo menos um item no checklist";
      }
      // Added check that all checklist items are concluded for submission
      if (!checklist.every(item => item.concluido)) {
        return `❌ O checklist do equipamento ${equipamentos.find(eq => eq.id === equipamentoId)?.modelo || 'desconhecido'} não está totalmente concluído.`;
      }
    }

    return null;
  };

  const abrirNavegacao = () => {
    if (cliente.latitude && cliente.longitude) {
      // Abrir Google Maps com coordenadas
      const url = `https://www.google.com/maps/dir/?api=1&destination=${cliente.latitude},${cliente.longitude}`;
      window.open(url, '_blank');
    } else if (cliente.endereco) {
      // Abrir Google Maps com endereço
      const enderecoEncoded = encodeURIComponent(cliente.endereco);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${enderecoEncoded}`;
      window.open(url, '_blank');
    } else {
      toast({ description: "❌ Endereço do cliente não disponível", variant: "destructive" });
    }
  };

  const finalizarManutencaoMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Criar registro de manutenção com status "aguardando_aprovacao_empresa"
      const manutencao = await base44.entities.ManutencaoPMOC.create({
        ...data,
        status: 'aguardando_aprovacao_empresa'
      });
      
      // 2. Atualizar status do PMOC para "aguardando_aprovacao_empresa"
      await base44.entities.PMOC.update(pmoc.id, {
        status: 'aguardando_aprovacao_empresa'
      });

      // 3. Enviar notificação para a empresa
      if (user?.empresa_id) {
        const empresas = await base44.entities.Empresa.list();
        const empresa = empresas.find(e => e.id === user.empresa_id);
        
        if (empresa?.email_contato) {
          await base44.integrations.Core.SendEmail({
            to: empresa.email_contato,
            subject: `⏳ PMOC Executado - Aguardando Aprovação - ${cliente.nome}`,
            body: `Olá,

O técnico ${tecnico?.nome} concluiu a execução do PMOC:

📋 Cliente: ${cliente.nome}
🔧 Técnico: ${tecnico?.nome}
📅 Data de Execução: ${format(new Date(data.data_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
🏢 Equipamentos: ${equipamentos.length}
⏳ Status: Aguardando Aprovação da Empresa

Por favor, acesse o sistema para revisar e aprovar o PMOC antes de enviá-lo ao cliente.

Atenciosamente,
ClimaPro`
          });
        }
      }

      return manutencao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meus-pmocs']);
      queryClient.invalidateQueries(['pmocs']);
      queryClient.invalidateQueries(['manutencoes-pmoc']);
      alert("✅ PMOC enviado para aprovação da empresa!\n\nAguarde a revisão antes do envio ao cliente.");
      onClose();
    },
    onError: (error) => {
      console.error("Erro ao finalizar manutenção:", error);
      toast({ description: "❌ Erro ao enviar PMOC. Tente novamente.", variant: "destructive" });
    }
  });

  const handleFinalizar = async () => {
    const erro = validarFormulario();
    if (erro) {
      toast({ description: erro, variant: "default" });
      return;
    }

    if (!window.confirm("⚠️ Confirma o envio deste PMOC para aprovação da empresa?\n\nApós o envio, a empresa precisará revisar e aprovar antes de enviar ao cliente.")) {
      return;
    }

    // Capturar localização
    let latitude = null;
    let longitude = null;
    let endereco = cliente.endereco;

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch (error) {
      console.warn("Localização não disponível ou acesso negado:", error);
      // Optional: Inform user that location could not be captured
      // toast({ description: "Não foi possível capturar a localização atual. A manutenção será registrada sem dados de GPS.", variant: "default" });
    }

    // Capturar assinatura
    const assinaturaBase64 = getCanvasDataURL();

    const dadosManutencao = {
      empresa_id: user.empresa_id,
      pmoc_id: pmoc.id,
      cliente_id: cliente.id,
      tecnico_id: tecnico.id,
      equipamentos_ids: pmoc.equipamentos_ids,
      data_programada: pmoc.data_execucao_programada,
      data_execucao: new Date().toISOString(),
      checklists_por_equipamento: checklists,
      fotos_por_equipamento: fotos,
      observacoes_tecnico: Object.entries(observacoesPorEquipamento)
        .filter(([_, obs]) => obs.trim())
        .map(([eqId, obs]) => {
          const eq = equipamentos.find(e => e.id === eqId);
          return `${eq?.modelo || 'Equipamento'}: ${obs}`;
        })
        .join('\n\n'),
      assinatura_tecnico: assinaturaBase64,
      nome_responsavel_local: nomeCliente,
      latitude,
      longitude,
      endereco
    };

    finalizarManutencaoMutation.mutate(dadosManutencao);
  };

  const gerarRelatorioPDF = async () => {
    setGerandoRelatorio(true);
    try {
      // Construir HTML do relatório
      let htmlEquipamentos = '';
      
      equipamentos.forEach((eq, index) => {
        const checklistEq = checklists[eq.id] || [];
        const fotosEq = fotos[eq.id] || [];
        const obsEq = observacoesPorEquipamento[eq.id] || '';

        htmlEquipamentos += `
          <div class="equipamento-section">
            <h3>Equipamento ${index + 1}: ${eq.tipo} ${eq.marca} ${eq.modelo}</h3>
            <p><strong>Localização:</strong> ${eq.localizacao || 'Não informado'}</p>
            <p><strong>Capacidade:</strong> ${eq.capacidade || 'N/A'}</p>
            
            <h4>✅ Checklist Executado:</h4>
            <ul class="checklist">
              ${checklistEq.map(item => `
                <li class="${item.concluido ? 'concluido' : 'pendente'}">
                  ${item.concluido ? '✅' : '❌'} ${item.descricao}
                  ${item.observacao ? `<br><span class="obs">Obs: ${item.observacao}</span>` : ''}
                </li>
              `).join('')}
            </ul>

            ${obsEq ? `
              <div class="observacoes">
                <strong>📝 Observações:</strong>
                <p>${obsEq}</p>
              </div>
            ` : ''}

            ${fotosEq.length > 0 ? `
              <div class="fotos">
                <strong>📸 Fotos do Equipamento (${fotosEq.length}):</strong>
                <div class="fotos-grid">
                  ${fotosEq.map((url, idx) => `
                    <img src="${url}" alt="Foto ${idx + 1}" />
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      });

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #9333ea; padding-bottom: 20px; }
    .header h1 { color: #9333ea; font-size: 24px; margin-bottom: 10px; }
    .header p { font-size: 12px; color: #666; }
    .section { margin: 20px 0; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: bold; color: #9333ea; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .info-row { display: flex; margin: 8px 0; }
    .info-label { font-weight: bold; width: 200px; color: #4b5563; }
    .info-value { flex: 1; color: #1f2937; }
    .equipamento-section { margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px; page-break-inside: avoid; }
    .equipamento-section h3 { color: #7c3aed; margin-bottom: 10px; }
    .equipamento-section h4 { color: #4b5563; margin: 15px 0 10px 0; font-size: 14px; }
    .checklist { list-style: none; margin: 10px 0; }
    .checklist li { padding: 8px; margin: 5px 0; background: white; border-radius: 4px; border-left: 4px solid #10b981; }
    .checklist li.pendente { border-left-color: #ef4444; }
    .checklist li .obs { font-size: 11px; color: #6b7280; font-style: italic; margin-left: 20px; }
    .observacoes { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
    .fotos { margin: 15px 0; }
    .fotos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
    .fotos-grid img { width: 100%; height: auto; border-radius: 8px; border: 2px solid #e5e7eb; }
    .assinatura { text-align: center; margin: 30px 0; page-break-inside: avoid; }
    .assinatura img { max-width: 400px; border: 2px solid #e5e7eb; border-radius: 8px; }
    .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    @media print {
      body { padding: 20px; }
      .section, .equipamento-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 RELATÓRIO DE MANUTENÇÃO PMOC</h1>
    <p>ClimaPro – Sistema CRM Operacional</p>
  </div>

  <div class="section">
    <div class="section-title">🏢 Informações da Empresa Executora</div>
    <div class="info-row">
      <div class="info-label">Empresa:</div>
      <div class="info-value">${user?.full_name || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Técnico Responsável:</div>
      <div class="info-value">${tecnico?.nome || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Especialidade:</div>
      <div class="info-value">${tecnico?.especialidade || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">👤 Dados do Cliente</div>
    <div class="info-row">
      <div class="info-label">Cliente:</div>
      <div class="info-value">${cliente.nome}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Endereço:</div>
      <div class="info-value">${cliente.endereco || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Telefone:</div>
      <div class="info-value">${cliente.telefone || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📅 Informações da Manutenção</div>
    <div class="info-row">
      <div class="info-label">Tipo:</div>
      <div class="info-value">PMOC ${pmoc.periodicidade}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Data de Execução:</div>
      <div class="info-value">${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Equipamentos Atendidos:</div>
      <div class="info-value">${equipamentos.length}</div>
    </div>
  </div>

  ${htmlEquipamentos}

  ${!isCanvasEmpty() ? `
  <div class="section">
    <div class="section-title">✍️ Assinatura do Cliente</div>
    <div class="assinatura">
      <img src="${getCanvasDataURL()}" alt="Assinatura do Cliente" />
      <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
        ${nomeCliente}
      </p>
      <p style="margin-top: 5px; font-size: 11px; color: #9ca3af;">
        Confirmo a realização do serviço conforme descrito acima.
      </p>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    Documento gerado automaticamente pelo ClimaPro<br>
    Data de geração: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}<br>
    https://climapro.base44.app
  </div>
</body>
</html>
      `;

      // Fazer download do HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PMOC_${cliente.nome.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'ddMMyyyy')}.html`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert("✅ Relatório gerado com sucesso!\n\nVocê pode abrir o arquivo HTML no navegador e usar 'Imprimir' ou 'Salvar como PDF'.");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({ description: "❌ Erro ao gerar relatório. Tente novamente.", variant: "destructive" });
    } finally {
      setGerandoRelatorio(false);
    }
  };

  if (!user || !tecnico) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todosEquipamentosConcluidos = equipamentos.every(eq => {
    const checklist = checklists[eq.id] || [];
    return checklist.length > 0 && checklist.every(item => item.concluido);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">🔧 Executar Manutenção PMOC</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{cliente.nome}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={gerarRelatorioPDF}
                disabled={gerandoRelatorio || !todosEquipamentosConcluidos || isCanvasEmpty() || !nomeCliente.trim()}
              >
                <Download className="w-4 h-4 mr-2" />
                Prévia PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Informações Gerais */}
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{cliente.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm flex-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {cliente.endereco}
                    </p>
                    <Button
                      onClick={abrirNavegacao}
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      📍 GPS
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Técnico</p>
                  <p className="font-semibold">{tecnico.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Periodicidade</p>
                  <Badge className="bg-purple-600 text-white capitalize">{pmoc.periodicidade}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Equipamentos</p>
                  <p className="font-semibold">{equipamentos.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Equipamentos */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏢 Equipamentos para Manutenção
              <Badge variant="outline">{equipamentos.length}</Badge>
            </h3>

            {equipamentos.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <p>Nenhum equipamento vinculado a este PMOC</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {equipamentos.map((equipamento, index) => {
                  const isExpanded = equipamentoExpandido === equipamento.id;
                  const checklist = checklists[equipamento.id] || [];
                  const totalItens = checklist.length;
                  const itensConcluidos = checklist.filter(i => i.concluido).length;
                  const percentualConclusao = totalItens > 0 ? (itensConcluidos / totalItens) * 100 : 0;

                  return (
                    <Card 
                      key={equipamento.id} 
                      className={`border-2 ${
                        percentualConclusao === 100 ? 'border-green-300 bg-green-50' : 
                        percentualConclusao > 0 ? 'border-yellow-300 bg-yellow-50' : 
                        'border-border'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div 
                          className="flex justify-between items-center cursor-pointer"
                          onClick={() => setEquipamentoExpandido(isExpanded ? null : equipamento.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline">Equipamento {index + 1}</Badge>
                              <h4 className="font-semibold">
                                {equipamento.tipo} {equipamento.marca} {equipamento.modelo}
                              </h4>
                              {percentualConclusao === 100 && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                              <p>📍 {equipamento.localizacao || 'Localização não informada'}</p>
                              <p>⚙️ {equipamento.capacidade || 'N/A'}</p>
                              <p>✅ {itensConcluidos}/{totalItens} itens</p>
                            </div>
                            {percentualConclusao > 0 && (
                              <div className="mt-2 bg-muted rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    percentualConclusao === 100 ? 'bg-green-600' : 'bg-yellow-600'
                                  }`}
                                  style={{ width: `${percentualConclusao}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="icon">
                            {isExpanded ? <ChevronUp /> : <ChevronDown />}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="mt-6 space-y-6 border-t pt-6">
                            {/* Checklist */}
                            <div>
                              <h5 className="font-semibold mb-3">✅ Checklist de Manutenção</h5>
                              <div className="space-y-3">
                                {checklist.map((item, itemIndex) => (
                                  <div key={itemIndex} className="bg-white p-4 rounded-lg border">
                                    <div className="flex items-start gap-3">
                                      <button
                                        onClick={() => toggleChecklistItem(equipamento.id, itemIndex)}
                                        className={`mt-1 flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center ${
                                          item.concluido 
                                            ? 'bg-green-500 border-green-500 text-white' 
                                            : 'border-border'
                                        }`}
                                      >
                                        {item.concluido && <Check className="w-4 h-4" />}
                                      </button>
                                      <div className="flex-1">
                                        <p className={item.concluido ? 'line-through text-muted-foreground' : ''}>
                                          {item.descricao}
                                        </p>
                                        <Input
                                          placeholder="Observações adicionais (opcional)"
                                          value={item.observacao}
                                          onChange={(e) => updateObservacaoItem(equipamento.id, itemIndex, e.target.value)}
                                          className="mt-2 text-sm"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Fotos */}
                            <div>
                              <h5 className="font-semibold mb-3">📸 Fotos do Equipamento ({(fotos[equipamento.id] || []).length}/5)</h5>
                              <div className="grid grid-cols-3 gap-3 mb-3">
                                {(fotos[equipamento.id] || []).map((url, fotoIndex) => (
                                  <div key={fotoIndex} className="relative">
                                    <img 
                                      src={url} 
                                      alt={`Foto ${fotoIndex + 1}`}
                                      className="w-full h-32 object-cover rounded-lg border-2 border-border"
                                    />
                                    <button
                                      onClick={() => removerFoto(equipamento.id, fotoIndex)}
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleUploadFoto(equipamento.id, e.target.files[0])}
                                  disabled={uploadingFoto === equipamento.id || (fotos[equipamento.id] || []).length >= 5}
                                  className="hidden"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={uploadingFoto === equipamento.id || (fotos[equipamento.id] || []).length >= 5}
                                  className="w-full"
                                  asChild
                                >
                                  <span>
                                    {uploadingFoto === equipamento.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                                        Enviando...
                                      </>
                                    ) : (
                                      <>
                                        <Camera className="w-4 h-4 mr-2" />
                                        Adicionar Foto
                                      </>
                                    )}
                                  </span>
                                </Button>
                              </label>
                            </div>

                            {/* Observações Gerais */}
                            <div>
                              <Label>📝 Observações sobre este Equipamento</Label>
                              <Textarea
                                value={observacoesPorEquipamento[equipamento.id] || ''}
                                onChange={(e) => setObservacoesPorEquipamento(prev => ({
                                  ...prev,
                                  [equipamento.id]: e.target.value
                                }))}
                                placeholder="Observações gerais, problemas encontrados, recomendações..."
                                rows={3}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assinatura do Cliente */}
          <Card className="border-2 border-indigo-200 bg-indigo-50">
            <CardHeader>
              <CardTitle className="text-lg">✍️ Assinatura do Responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome-cliente">Nome do Responsável *</Label>
                <Input
                  id="nome-cliente"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Nome completo de quem está confirmando"
                />
              </div>
              <div>
                <Label>Assinatura Digital *</Label>
                <SignatureCanvas canvasRef={sigCanvas} width={600} height={200} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={limparAssinatura}
                  className="mt-2"
                >
                  Limpar Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Botão Finalizar */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFinalizar}
              disabled={finalizarManutencaoMutation.isPending || !todosEquipamentosConcluidos}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {finalizarManutencaoMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Enviar para Aprovação da Empresa
                </>
              )}
            </Button>
          </div>

          {!todosEquipamentosConcluidos && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 inline mr-2" />
              <span className="text-sm text-yellow-800">
                Complete todos os checklists antes de enviar
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
