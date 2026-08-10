
import React, { useState, useRef, useEffect } from "react";
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
  Save,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import {
  checklistParaEquipamento,
  LABEL_PERIODICIDADE,
  ROTULO_RESULTADO,
  resultadoChecklistItem as resultadoItem,
} from "@/lib/pmocChecklist";
import { SignatureCanvas, limparAssinatura, isCanvasEmpty, getCanvasDataURL } from "@/components/ui/signature-canvas";
import { notificarPorEmail } from "@/lib/notificacoes";

export default function ExecutarManutencaoModal({ pmoc, cliente, onClose }) {
  const [user, setUser] = useState(null);
  const [tecnico, setTecnico] = useState(null);
  const queryClient = useQueryClient();
  const sigCanvasTecnico = useRef(null);
  const sigCanvasCliente = useRef(null);

  // Estados principais
  const [equipamentoExpandido, setEquipamentoExpandido] = useState(null);
  const [checklists, setChecklists] = useState({});
  const [fotos, setFotos] = useState({});
  const [observacoesPorEquipamento, setObservacoesPorEquipamento] = useState({});
  const [nomeTecnico, setNomeTecnico] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(null);
  const [assinaturaTecnicoPreenchida, setAssinaturaTecnicoPreenchida] = useState(false);
  const [assinaturaClientePreenchida, setAssinaturaClientePreenchida] = useState(false);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  // id do rascunho quando a execução foi retomada (ou salva ao menos uma vez)
  const [rascunhoId, setRascunhoId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.tecnico_id) {
        const tecnicoData = await base44.entities.Tecnico.filter({ id: currentUser.tecnico_id });
        setTecnico(tecnicoData[0]);
        setNomeTecnico(tecnicoData[0]?.nome || currentUser.full_name || "");
      } else {
        setNomeTecnico(currentUser.full_name || "");
      }
    };
    loadUser();
  }, []);

  // Busca TODOS os equipamentos ativos no PMOC daquele cliente — não mais um
  // lote fixo escolhido manualmente (pmoc.equipamentos_ids); cada equipamento
  // tem sua própria periodicidade, então a lista sempre reflete o cadastro
  // atual (inclusão/remoção de equipamento não exige recriar o PMOC).
  const { data: equipamentos = [] } = useQuery({
    queryKey: ['equipamentos-pmoc-ativos', cliente?.id],
    queryFn: () => base44.entities.Equipamento.filter({ cliente_id: cliente.id, pmoc_ativo: true }),
    enabled: !!cliente?.id
  });

  // Execução já iniciada e não enviada. Uma rodada com vários equipamentos
  // dificilmente fecha numa visita só, então o que o técnico marcou fica
  // guardado como 'em_andamento' até ele enviar para aprovação.
  const { data: rascunho, isLoading: carregandoRascunho } = useQuery({
    queryKey: ['rascunho-manutencao', pmoc?.id],
    queryFn: async () => {
      const lista = await base44.entities.ManutencaoPMOC.filter(
        { pmoc_id: pmoc.id, status: 'em_andamento' },
        '-created_date'
      );
      return lista[0] || null;
    },
    enabled: !!pmoc?.id,
    staleTime: 0,
  });

  // Quais equipamentos têm o ciclo profundo vencendo nesta rodada (calculado
  // uma vez, na carga, pelo mês corrente do Plano Anual) — usado para montar
  // o checklist e, na aprovação, para saber de quais equipamentos avançar a
  // próxima_manutencao.
  const [cicloProfundoDevido, setCicloProfundoDevido] = useState({});

  // Inicializar checklists quando equipamentos carregarem — o checklist de
  // cada equipamento segue o que o Plano Anual prevê para o MÊS ATUAL.
  //
  // Se houver rascunho, o que já foi marcado volta como estava. Equipamento
  // que entrou no cadastro depois do rascunho não aparece lá, então recebe um
  // checklist novo em folha — assim ninguém fica de fora da rodada.
  useEffect(() => {
    if (carregandoRascunho) return;
    if (equipamentos.length > 0 && Object.keys(checklists).length === 0) {
      const checklistsSalvos = rascunho?.checklists_por_equipamento || {};
      const fotosSalvas = rascunho?.fotos_por_equipamento || {};
      const observacoesSalvas = rascunho?.observacoes_por_equipamento || {};

      const checklistsIniciais = {};
      const fotosIniciais = {};
      const observacoesIniciais = {};
      const devidoIniciais = {};

      equipamentos.forEach(eq => {
        const { itensMensal, itensCicloProfundo, cicloProfundoDevido: devido } = checklistParaEquipamento(eq);
        const salvo = checklistsSalvos[eq.id];
        checklistsIniciais[eq.id] = Array.isArray(salvo) && salvo.length > 0
          ? salvo
          : [
              ...itensMensal.map((item) => ({ ...item, tier: 'mensal' })),
              ...itensCicloProfundo.map((item) => ({ ...item, tier: 'profundo' })),
            ];
        devidoIniciais[eq.id] = devido;
        fotosIniciais[eq.id] = fotosSalvas[eq.id] || [];
        observacoesIniciais[eq.id] = observacoesSalvas[eq.id] || "";
      });

      setChecklists(checklistsIniciais);
      setCicloProfundoDevido(devidoIniciais);
      setFotos(fotosIniciais);
      setObservacoesPorEquipamento(observacoesIniciais);
      setRascunhoId(rascunho?.id || null);
    }
  }, [equipamentos, checklists, rascunho, carregandoRascunho]);

  const itensPendentes = Object.values(checklists)
    .reduce((total, lista) => total + (lista || []).filter((i) => resultadoItem(i) === 'pendente').length, 0);

  // Atalho para a visita em que estava tudo certo. Marcar 30 caixinhas no
  // celular, uma a uma, é o tipo de atrito que faz o técnico preencher no fim
  // do dia de memória — o que é pior para o laudo do que este botão.
  //
  // Só toca no que está pendente. Item já marcado como não conforme fica como
  // está: apagar um problema que o técnico encontrou seria bem pior que a
  // economia de cliques.
  const marcarTudoConforme = () => {
    if (!window.confirm(
      `Marcar ${itensPendentes} item(ns) como conforme?\n\n`
      + 'Isso vale como sua verificação: o laudo vai dizer que estava tudo certo, com sua assinatura.\n\n'
      + 'O que você já marcou como não conforme continua como está.'
    )) return;

    setChecklists((prev) => {
      const novo = {};
      for (const [equipamentoId, lista] of Object.entries(prev)) {
        novo[equipamentoId] = lista.map((item) => (
          resultadoItem(item) === 'pendente'
            ? { ...item, resultado: 'ok', concluido: true }
            : item
        ));
      }
      return novo;
    });
  };

  const marcarResultadoItem = (equipamentoId, index, resultado) => {
    setChecklists(prev => ({
      ...prev,
      [equipamentoId]: prev[equipamentoId].map((item, i) => {
        if (i !== index) return item;
        // Tocar de novo no mesmo botão desmarca, para corrigir um toque errado
        // sem ter que apagar tudo.
        const novo = resultadoItem(item) === resultado ? 'pendente' : resultado;
        return { ...item, resultado: novo, concluido: novo !== 'pendente' };
      })
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

  // Fechar sem salvar joga fora o que foi marcado — e agora que existe onde
  // guardar, perder por um toque errado no X seria pior do que antes.
  const temProgresso = () =>
    Object.values(checklists).some((lista) => lista?.some((item) => item.concluido)) ||
    Object.values(fotos).some((lista) => lista?.length > 0) ||
    Object.values(observacoesPorEquipamento).some((obs) => obs?.trim());

  const fecharComAviso = () => {
    if (temProgresso() && !window.confirm('Sair sem salvar? O que você marcou nesta visita será perdido.\n\nUse "Salvar e continuar depois" para retomar de onde parou.')) {
      return;
    }
    onClose();
  };

  const validarFormulario = () => {
    // Verificar se todos os equipamentos têm checklist preenchido
    for (const equipamentoId of Object.keys(checklists)) {
      const checklist = checklists[equipamentoId];
      if (checklist.length === 0) {
        return "❌ Todos os equipamentos devem ter pelo menos um item no checklist";
      }
      const nomeEquipamento = equipamentos.find(eq => eq.id === equipamentoId)?.modelo || 'desconhecido';
      // Added check that all checklist items are concluded for submission
      if (!checklist.every(item => item.concluido)) {
        return `❌ O checklist do equipamento ${nomeEquipamento} não está totalmente concluído.`;
      }
      // Um "não conforme" sem descrição não serve de nada no laudo: quem lê
      // depois precisa saber o que foi encontrado.
      const semDescricao = checklist.find(
        (item) => resultadoItem(item) === 'nok' && !item.observacao?.trim()
      );
      if (semDescricao) {
        return `❌ Descreva o que foi encontrado em "${semDescricao.descricao}" (${nomeEquipamento}).`;
      }
    }

    if (!nomeTecnico.trim() || isCanvasEmpty(sigCanvasTecnico)) {
      return "❌ Assinatura do técnico é obrigatória";
    }
    if (!nomeCliente.trim() || isCanvasEmpty(sigCanvasCliente)) {
      return "❌ Assinatura do cliente é obrigatória";
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

  // Parte da execução que rascunho e envio final têm em comum. As assinaturas,
  // a data de execução e o GPS ficam de fora: são o fechamento com o cliente
  // presente, e só fazem sentido no envio.
  const montarDadosExecucao = () => ({
    empresa_id: user.empresa_id,
    pmoc_id: pmoc.id,
    cliente_id: cliente.id,
    tecnico_id: tecnico?.id || null,
    equipamentos_ids: equipamentos.map((eq) => eq.id),
    equipamentos_ciclo_profundo: equipamentos.filter((eq) => cicloProfundoDevido[eq.id]).map((eq) => eq.id),
    data_programada: pmoc.data_execucao_programada,
    checklists_por_equipamento: checklists,
    fotos_por_equipamento: fotos,
    observacoes_por_equipamento: observacoesPorEquipamento,
    observacoes_tecnico: Object.entries(observacoesPorEquipamento)
      .filter(([, obs]) => obs.trim())
      .map(([eqId, obs]) => {
        const eq = equipamentos.find(e => e.id === eqId);
        return `${eq?.modelo || 'Equipamento'}: ${obs}`;
      })
      .join('\n\n'),
    nome_responsavel_local: nomeTecnico,
  });

  // Salvar e continuar depois. Uma rodada com vários equipamentos raramente
  // fecha numa visita só; sem isso, o técnico que parasse no meio perdia o
  // checklist e as fotos e recomeçava do zero no dia seguinte.
  const salvarRascunhoMutation = useMutation({
    mutationFn: async () => {
      const dados = montarDadosExecucao();

      if (rascunhoId) {
        await base44.entities.ManutencaoPMOC.update(rascunhoId, dados);
        return rascunhoId;
      }

      const criado = await base44.entities.ManutencaoPMOC.create({
        ...dados,
        status: 'em_andamento',
      });

      // O PMOC sai de 'agendado' para 'em_execucao' na primeira gravação: quem
      // olha a lista precisa ver que a visita começou e não terminou.
      if (pmoc.status !== 'em_execucao') {
        await base44.entities.PMOC.update(pmoc.id, { status: 'em_execucao' });
      }

      return criado.id;
    },
    onSuccess: (id) => {
      setRascunhoId(id);
      queryClient.invalidateQueries(['rascunho-manutencao', pmoc.id]);
      queryClient.invalidateQueries(['meus-pmocs']);
      queryClient.invalidateQueries(['pmocs']);
      toast({ description: '💾 Execução salva. Você pode continuar depois de onde parou.' });
    },
    onError: (error) => {
      console.error('Erro ao salvar rascunho:', error);
      toast({
        description: '❌ Não foi possível salvar. Verifique a conexão e tente de novo antes de fechar.',
        variant: 'destructive',
      });
    },
  });

  const finalizarManutencaoMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Registro de manutenção "aguardando_aprovacao_empresa". Se a execução
      //    veio de um rascunho, ele vira o registro final — criar um novo
      //    deixaria a rodada duplicada no caderno de manutenção.
      const manutencao = rascunhoId
        ? await base44.entities.ManutencaoPMOC.update(rascunhoId, {
            ...data,
            status: 'aguardando_aprovacao_empresa'
          })
        : await base44.entities.ManutencaoPMOC.create({
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
          await notificarPorEmail({
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

    // Capturar as duas assinaturas — técnico que executou e cliente que
    // confirma no local, cada um com seu próprio traço.
    const assinaturaTecnicoBase64 = getCanvasDataURL(sigCanvasTecnico);
    const assinaturaClienteBase64 = getCanvasDataURL(sigCanvasCliente);

    const dadosManutencao = {
      ...montarDadosExecucao(),
      data_execucao: new Date().toISOString(),
      assinatura_tecnico: assinaturaTecnicoBase64,
      assinatura_cliente: assinaturaClienteBase64,
      nome_cliente_confirmacao: nomeCliente,
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
                <li class="${resultadoItem(item)}">
                  ${ROTULO_RESULTADO[resultadoItem(item)]} ${item.descricao}
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
    .checklist li.nok { border-left-color: #dc2626; background: #fef2f2; font-weight: bold; }
    .checklist li.pendente { border-left-color: #f59e0b; }
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

  <div class="section">
    <div class="section-title">✍️ Assinaturas</div>
    <div style="display:flex; gap:24px; flex-wrap:wrap;">
      ${!isCanvasEmpty(sigCanvasTecnico) ? `
      <div class="assinatura" style="flex:1; min-width:220px;">
        <img src="${getCanvasDataURL(sigCanvasTecnico)}" alt="Assinatura do Técnico" />
        <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">${nomeTecnico}</p>
        <p style="margin-top: 5px; font-size: 11px; color: #9ca3af;">Técnico responsável pela execução.</p>
      </div>
      ` : ''}
      ${!isCanvasEmpty(sigCanvasCliente) ? `
      <div class="assinatura" style="flex:1; min-width:220px;">
        <img src="${getCanvasDataURL(sigCanvasCliente)}" alt="Assinatura do Cliente" />
        <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">${nomeCliente}</p>
        <p style="margin-top: 5px; font-size: 11px; color: #9ca3af;">Confirmo a realização do serviço conforme descrito acima.</p>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="footer">
    Documento gerado automaticamente pelo ClimaPro<br>
    Data de geração: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}<br>
    https://geradordepmoc.com.br
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

  // Só exige um registro de Técnico se o usuário logado for um técnico; um
  // admin_empresa pode executar a rodada diretamente (ex.: cobrindo a falta
  // de um técnico), e nesse caso os relatórios usam o nome do próprio admin.
  if (!user) {
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

  const equipamentosPendentes = equipamentos.filter((eq) => {
    const checklist = checklists[eq.id] || [];
    return checklist.length === 0 || checklist.some((item) => !item.concluido);
  });
  // Não conforme sem descrição vira pendência visível, e não uma surpresa só
  // na hora de enviar.
  const nokSemDescricao = equipamentos.reduce((total, eq) => total + (checklists[eq.id] || []).filter(
    (item) => resultadoItem(item) === 'nok' && !item.observacao?.trim()
  ).length, 0);
  const totalNok = equipamentos.reduce((total, eq) => total + (checklists[eq.id] || []).filter(
    (item) => resultadoItem(item) === 'nok'
  ).length, 0);

  const requisitosPendentes = [
    equipamentosPendentes.length > 0 ? `Concluir o checklist de ${equipamentosPendentes.length} equipamento(s)` : null,
    nokSemDescricao > 0 ? `Descrever o que foi encontrado em ${nokSemDescricao} item(ns) marcado(s) como não conforme` : null,
    !nomeTecnico.trim() ? 'Informar o nome do técnico' : null,
    !assinaturaTecnicoPreenchida ? 'Coletar a assinatura do técnico' : null,
    !nomeCliente.trim() ? 'Informar o nome do responsável no local' : null,
    !assinaturaClientePreenchida ? 'Coletar a assinatura do responsável no local' : null,
  ].filter(Boolean);
  const prontoParaEnviar = requisitosPendentes.length === 0;


  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Executar manutenção PMOC">
      <Card className="max-h-[100dvh] w-full max-w-5xl overflow-y-auto rounded-b-none rounded-t-2xl sm:max-h-[95vh] sm:rounded-xl">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50 sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">🔧 Executar Manutenção PMOC</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{cliente.nome}</p>
            </div>
            <div className="flex shrink-0 gap-1 sm:gap-2">
              <Button
                variant="outline"
                onClick={gerarRelatorioPDF}
                disabled={gerandoRelatorio || !prontoParaEnviar}
              >
                <Download className="w-4 h-4 mr-2" />
                Prévia PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={fecharComAviso} aria-label="Fechar execução do PMOC">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-3 sm:p-6">
          {rascunho && (
            <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-blue-950" role="status">
              <p className="text-sm font-semibold">Execução retomada</p>
              <p className="mt-1 text-sm">
                {(rascunho.updated_at || rascunho.created_at)
                  ? `O que você marcou em ${format(new Date(rascunho.updated_at || rascunho.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })} continua aqui.`
                  : 'O que você já tinha marcado continua aqui.'}
                {' '}Termine o que falta e envie para aprovação.
              </p>
            </div>
          )}

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
                  <p className="font-semibold">{tecnico?.nome || user?.full_name || 'Administrador'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ciclo profundo nesta rodada</p>
                  <Badge className="bg-purple-600 text-white">
                    {equipamentos.filter((eq) => cicloProfundoDevido[eq.id]).length} de {equipamentos.length} equipamento(s)
                  </Badge>
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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                🏢 Equipamentos para Manutenção
                <Badge variant="outline">{equipamentos.length}</Badge>
              </h3>
              {itensPendentes > 0 && (
                <Button
                  variant="outline"
                  onClick={marcarTudoConforme}
                  className="min-h-11 whitespace-normal border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Marcar tudo como conforme ({itensPendentes})
                </Button>
              )}
            </div>

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
                  const itensNok = checklist.filter((i) => resultadoItem(i) === 'nok').length;
                  const percentualConclusao = totalItens > 0 ? (itensConcluidos / totalItens) * 100 : 0;

                  return (
                    <Card 
                      key={equipamento.id} 
                      className={`border-2 ${
                        itensNok > 0 ? 'border-red-300 bg-red-50' :
                        percentualConclusao === 100 ? 'border-green-300 bg-green-50' :
                        percentualConclusao > 0 ? 'border-yellow-300 bg-yellow-50' :
                        'border-border'
                      }`}
                    >
                      <CardContent className="p-4">
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() => setEquipamentoExpandido(isExpanded ? null : equipamento.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`equipamento-${equipamento.id}-detalhes`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <Badge variant="outline">Equipamento {index + 1}</Badge>
                              <h4 className="font-semibold">
                                {equipamento.tipo} {equipamento.marca} {equipamento.modelo}
                              </h4>
                              {cicloProfundoDevido[equipamento.id] ? (
                                <Badge className="bg-purple-600 text-white">
                                  🔧 Manutenção Completa ({LABEL_PERIODICIDADE[equipamento.periodicidade_pmoc]})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  🧹 Checagem Mensal
                                </Badge>
                              )}
                              {itensNok > 0 ? (
                                <Badge className="bg-red-600 text-white">
                                  {itensNok} não conforme
                                </Badge>
                              ) : percentualConclusao === 100 && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div className="grid md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                              <p>📍 {equipamento.localizacao || 'Localização não informada'}</p>
                              <p>⚙️ {equipamento.capacidade || 'N/A'}</p>
                              <p>✅ {itensConcluidos}/{totalItens} itens{itensNok > 0 ? ` · ${itensNok} NOK` : ''}</p>
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
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md" aria-hidden="true">
                            {isExpanded ? <ChevronUp /> : <ChevronDown />}
                          </span>
                        </button>

                        {isExpanded && (
                          <div id={`equipamento-${equipamento.id}-detalhes`} className="mt-6 space-y-6 border-t pt-6">
                            {/* Checklist */}
                            <div>
                              <h5 className="font-semibold mb-3">✅ Checklist de Manutenção</h5>
                              <div className="space-y-3">
                                {checklist.map((item, itemIndex) => (
                                  <React.Fragment key={itemIndex}>
                                    {item.tier === 'profundo' && (itemIndex === 0 || checklist[itemIndex - 1].tier !== 'profundo') && (
                                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide pt-2">
                                        Itens do ciclo {LABEL_PERIODICIDADE[equipamento.periodicidade_pmoc]?.toLowerCase()}
                                      </p>
                                    )}
                                    <div className={`rounded-lg border p-4 ${
                                      resultadoItem(item) === 'nok' ? 'border-red-300 bg-red-50' : 'bg-card'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                      <div className="flex flex-shrink-0 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => marcarResultadoItem(equipamento.id, itemIndex, 'ok')}
                                          aria-pressed={resultadoItem(item) === 'ok'}
                                          aria-label={`Conforme: ${item.descricao}`}
                                          title="Conforme"
                                          className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 transition-colors ${
                                            resultadoItem(item) === 'ok'
                                              ? 'border-green-500 bg-green-500 text-white'
                                              : 'border-border text-muted-foreground hover:border-green-400 hover:text-green-600'
                                          }`}
                                        >
                                          <Check className="h-5 w-5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => marcarResultadoItem(equipamento.id, itemIndex, 'nok')}
                                          aria-pressed={resultadoItem(item) === 'nok'}
                                          aria-label={`Não conforme: ${item.descricao}`}
                                          title="Não conforme"
                                          className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 transition-colors ${
                                            resultadoItem(item) === 'nok'
                                              ? 'border-red-600 bg-red-600 text-white'
                                              : 'border-border text-muted-foreground hover:border-red-400 hover:text-red-600'
                                          }`}
                                        >
                                          <X className="h-5 w-5" />
                                        </button>
                                      </div>
                                      <div className="flex-1">
                                        <p className={resultadoItem(item) === 'ok' ? 'line-through text-muted-foreground' : ''}>
                                          {item.descricao}
                                          {resultadoItem(item) === 'nok' && (
                                            <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                              Não conforme
                                            </span>
                                          )}
                                        </p>
                                        <Input
                                          placeholder={resultadoItem(item) === 'nok'
                                            ? 'Descreva o que foi encontrado (obrigatório)'
                                            : 'Observações adicionais (opcional)'}
                                          aria-label={`Observações para ${item.descricao}`}
                                          value={item.observacao}
                                          onChange={(e) => updateObservacaoItem(equipamento.id, itemIndex, e.target.value)}
                                          className={`mt-2 text-sm ${
                                            resultadoItem(item) === 'nok' && !item.observacao?.trim()
                                              ? 'border-red-400 bg-card'
                                              : ''
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>

                            {/* Fotos */}
                            <div>
                              <h5 className="font-semibold mb-3">📸 Fotos do Equipamento ({(fotos[equipamento.id] || []).length}/5)</h5>
                              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {(fotos[equipamento.id] || []).map((url, fotoIndex) => (
                                  <div key={fotoIndex} className="relative">
                                    <img 
                                      src={url} 
                                      alt={`Foto ${fotoIndex + 1}`}
                                      className="w-full h-32 object-cover rounded-lg border-2 border-border"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removerFoto(equipamento.id, fotoIndex)}
                                      aria-label={`Remover foto ${fotoIndex + 1}`}
                                      className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <label htmlFor={`foto-pmoc-${equipamento.id}`} className="block cursor-pointer">
                                <input
                                  id={`foto-pmoc-${equipamento.id}`}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  aria-describedby={`foto-pmoc-${equipamento.id}-ajuda`}
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
                              <p id={`foto-pmoc-${equipamento.id}-ajuda`} className="mt-2 text-xs text-muted-foreground">
                                No celular, a câmera traseira será aberta quando estiver disponível. Limite de 5 fotos.
                              </p>

                            {/* Observações Gerais */}
                            <div>
                              <Label>📝 Observações sobre este Equipamento</Label>
                              <Textarea
                                aria-label="Observações gerais sobre este equipamento"
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

          {/* Assinaturas do técnico que executou e do responsável no local. */}
          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-lg">✍️ Assinatura do Técnico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome-tecnico">Nome do Técnico *</Label>
                <Input
                  id="nome-tecnico"
                  value={nomeTecnico}
                  onChange={(e) => setNomeTecnico(e.target.value)}
                  placeholder="Nome completo do técnico responsável"
                />
              </div>
              <div>
                <Label>Assinatura Digital *</Label>
                <p className="mb-2 text-xs text-muted-foreground">Assine com o dedo ou com uma caneta compatível. O traço acompanha o tamanho da tela.</p>
                <SignatureCanvas canvasRef={sigCanvasTecnico} width={600} height={200} label="Área de assinatura do técnico" onChange={setAssinaturaTecnicoPreenchida} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => limparAssinatura(sigCanvasTecnico, setAssinaturaTecnicoPreenchida)}
                  className="mt-2"
                >
                  Limpar Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-200 bg-indigo-50">
            <CardHeader>
              <CardTitle className="text-lg">✍️ Assinatura do Cliente</CardTitle>
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
                <p className="mb-2 text-xs text-muted-foreground">Peça ao responsável no local para assinar dentro da área abaixo.</p>
                <SignatureCanvas canvasRef={sigCanvasCliente} width={600} height={200} label="Área de assinatura do responsável no local" onChange={setAssinaturaClientePreenchida} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => limparAssinatura(sigCanvasCliente, setAssinaturaClientePreenchida)}
                  className="mt-2"
                >
                  Limpar Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>

          {requisitosPendentes.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status" aria-live="polite">
              <AlertCircle className="mb-2 h-5 w-5 text-amber-700" aria-hidden="true" />
              <p className="text-sm font-semibold">Falta concluir antes do envio:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {requisitosPendentes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {/* Botão Finalizar */}
          <div className="sticky bottom-0 z-10 -mx-3 flex flex-col-reverse gap-2 border-t bg-background/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:gap-3 sm:px-6">
            <Button
              variant="outline"
              onClick={fecharComAviso}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => salvarRascunhoMutation.mutate()}
              disabled={salvarRascunhoMutation.isPending || equipamentos.length === 0}
              className="min-h-12 flex-1 whitespace-normal border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
            >
              {salvarRascunhoMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar e continuar depois
                </>
              )}
            </Button>
            <Button
              onClick={handleFinalizar}
              disabled={finalizarManutencaoMutation.isPending || !prontoParaEnviar}
              className="min-h-12 flex-1 whitespace-normal bg-orange-600 hover:bg-orange-700"
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

        </CardContent>
      </Card>
    </div>
  );
}
