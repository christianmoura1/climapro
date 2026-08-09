import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, X, MapPin, Navigation, Plus, Building2, ClipboardList, Clock, KeyRound, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";

const ESTABELECIMENTOS_PADRAO = [
  { id: "casa", label: "🏠 Casa", tipo: "residencial" },
  { id: "loja", label: "🏪 Loja", tipo: "comercial" },
  { id: "escritorio", label: "🏢 Escritório", tipo: "comercial" },
  { id: "trabalho", label: "💼 Trabalho", tipo: "comercial" },
  { id: "empresa", label: "🏭 Empresa", tipo: "comercial" },
];

function EnderecoForm({ dados, onChange, label }) {
  const [geocoding, setGeocoding] = useState(false);
  const [capturando, setCapturando] = useState(false);

  const handleGeocodeEndereco = async () => {
    if (!dados.endereco || dados.endereco.trim().length < 10) {
      toast({ description: "⚠️ Preencha o endereço completo antes de buscar as coordenadas.", variant: "warning" });
      return;
    }
    setGeocoding(true);
    try {
      const enderecoEncoded = encodeURIComponent(dados.endereco.trim() + ", Brasil");
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${enderecoEncoded}&limit=3&countrycodes=br`,
        { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        onChange({ ...dados, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) });
        alert(`✅ Coordenadas encontradas!\n\nLatitude: ${parseFloat(data[0].lat).toFixed(6)}\nLongitude: ${parseFloat(data[0].lon).toFixed(6)}`);
      } else {
        toast({ description: "❌ Não foi possível encontrar as coordenadas para este endereço.", variant: "destructive" });
      }
    } catch (error) {
      toast({ description: "❌ Erro ao conectar com o serviço de mapas.", variant: "destructive" });
    } finally {
      setGeocoding(false);
    }
  };

  const handleCapturarLocalizacao = () => {
    if (!navigator.geolocation) {
      toast({ description: "❌ Geolocalização não suportada pelo navegador.", variant: "destructive" });
      return;
    }
    setCapturando(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({ ...dados, latitude: position.coords.latitude, longitude: position.coords.longitude });
        setCapturando(false);
        alert(`✅ Localização capturada!\n\nLatitude: ${position.coords.latitude.toFixed(6)}\nLongitude: ${position.coords.longitude.toFixed(6)}`);
      },
      (error) => {
        toast({ description: "❌ Erro ao capturar localização. Verifique as permissões do navegador.", variant: "destructive" });
        setCapturando(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Endereço — {label}</Label>
        <Textarea
          value={dados.endereco || ""}
          onChange={(e) => onChange({ ...dados, endereco: e.target.value })}
          placeholder="Ex: Rua das Flores, 123 - Centro, São Paulo - SP"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          💡 <strong>Formato recomendado:</strong> Rua [Nome], [Número] - [Bairro], [Cidade] - [UF], [CEP]
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-blue-50">
        <Label className="text-sm font-medium mb-3 block">📍 Localização GPS — {label}</Label>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="any"
              value={dados.latitude || ""}
              onChange={(e) => onChange({ ...dados, latitude: parseFloat(e.target.value) || null })}
              placeholder="Ex: -23.550520"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="any"
              value={dados.longitude || ""}
              onChange={(e) => onChange({ ...dados, longitude: parseFloat(e.target.value) || null })}
              placeholder="Ex: -46.633308"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="outline" onClick={handleGeocodeEndereco} disabled={geocoding || !dados.endereco} className="flex-1">
            <MapPin className="w-4 h-4 mr-2" />
            {geocoding ? 'Buscando...' : 'Buscar Coordenadas'}
          </Button>
          <Button type="button" variant="outline" onClick={handleCapturarLocalizacao} disabled={capturando} className="flex-1">
            <Navigation className="w-4 h-4 mr-2" />
            {capturando ? 'Capturando...' : 'Usar Localização Atual'}
          </Button>
          {dados.latitude && dados.longitude && (
            <Button type="button" variant="outline" onClick={() => window.open(`https://www.google.com/maps?q=${dados.latitude},${dados.longitude}`, '_blank')}>
              <MapPin className="w-4 h-4 mr-2" />
              Ver no Mapa
            </Button>
          )}
        </div>
        {dados.latitude && dados.longitude && (
          <div className="mt-3 border-2 border-blue-300 rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="180"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps?q=${dados.latitude},${dados.longitude}&output=embed`}
              allowFullScreen
            />
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  pendente: { color: "bg-orange-100 text-orange-800", label: "Pendente" },
  em_andamento: { color: "bg-blue-100 text-blue-800", label: "Em Andamento" },
  aguardando_pecas: { color: "bg-yellow-100 text-yellow-800", label: "Aguardando Peças" },
  aguardando_aprovacao_empresa: { color: "bg-purple-100 text-purple-800", label: "Aguardando Aprovação" },
  finalizado: { color: "bg-green-100 text-green-800", label: "Finalizado" },
  cancelado: { color: "bg-muted text-foreground", label: "Cancelado" },
};

function HistoricoChamadosEstabelecimento({ clienteId, estabelecimentos, abaAtiva }) {
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clienteId) return;
    setLoading(true);
    base44.entities.Chamado.filter({ cliente_id: clienteId }, '-created_date')
      .then(setChamados)
      .finally(() => setLoading(false));
  }, [clienteId]);

  const estAtual = estabelecimentos[abaAtiva];
  const enderecoEst = estAtual?.endereco?.toLowerCase().trim();

  // Filtra chamados cujo local contenha parte do endereço do estabelecimento ativo
  const chamadosFiltrados = enderecoEst
    ? chamados.filter(c => {
        const local = (c.local || c.endereco || "").toLowerCase();
        // Pega as primeiras palavras do endereço para comparação flexível
        const palavras = enderecoEst.split(/[\s,]+/).filter(p => p.length > 3);
        return palavras.some(p => local.includes(p));
      })
    : [];

  const temEnderecoConfigurado = !!enderecoEst;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted border-b px-4 py-3 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-sm text-foreground">
          Histórico de Chamados — {estAtual?.nome || "Estabelecimento"}
        </span>
        {!loading && (
          <Badge variant="outline" className="ml-auto text-xs">
            {chamadosFiltrados.length} chamado(s)
          </Badge>
        )}
      </div>
      <div className="p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-3">Carregando...</p>
        ) : !temEnderecoConfigurado ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            Configure o endereço deste estabelecimento para ver os chamados relacionados.
          </p>
        ) : chamadosFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            Nenhum chamado encontrado para <strong>{estAtual?.nome}</strong>.
          </p>
        ) : (
          <div className="divide-y">
            {chamadosFiltrados.map((chamado) => {
              const cfg = STATUS_CONFIG[chamado.status] || STATUS_CONFIG.pendente;
              return (
                <div key={chamado.id} className="py-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {chamado.numero_chamado} — {chamado.titulo}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {chamado.created_date
                        ? format(new Date(chamado.created_date), "dd/MM/yyyy", { locale: ptBR })
                        : "N/A"}
                    </div>
                  </div>
                  <Badge className={cfg.color + " text-xs shrink-0"}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClienteForm({ cliente, onSubmit, onCancel, isLoading }) {
  // Inicializar estabelecimentos a partir dos dados existentes
  const initEstabelecimentos = () => {
    if (cliente?.estabelecimentos?.length > 0) return cliente.estabelecimentos;
    if (cliente?.endereco) {
      return [{
        nome: "Principal",
        endereco: cliente.endereco,
        latitude: cliente.latitude || null,
        longitude: cliente.longitude || null,
        tipo: cliente.tipo_estabelecimento || "comercial",
        observacoes: ""
      }];
    }
    return [];
  };

  const [formData, setFormData] = useState(cliente || {
    nome: "",
    email: "",
    telefone: "",
    whatsapp: "",
    endereco: "",
    latitude: null,
    longitude: null,
    tipo_estabelecimento: "comercial",
    observacoes: "",
    tem_acesso_portal: false,
    estabelecimentos: []
  });

  const [estabelecimentos, setEstabelecimentos] = useState(initEstabelecimentos);
  const [abaAtiva, setAbaAtiva] = useState(0);

  // Modal para nomear novo estabelecimento
  const [modalNome, setModalNome] = useState(null); // { opcao, nomeInput }

  // Código de acesso ao histórico público (QR code) — campo write-only: nunca
  // mostramos o hash já salvo, só grava se o usuário digitar algo novo.
  const [novoCodigoAcesso, setNovoCodigoAcesso] = useState("");

  const [senhaPortal, setSenhaPortal] = useState("");
  const [confirmarSenhaPortal, setConfirmarSenhaPortal] = useState("");
  const precisaSenhaInicial = !cliente || !cliente.tem_acesso_portal;
  const emailPortalAlterado = !!cliente?.tem_acesso_portal
    && String(formData.email || '').trim().toLowerCase() !== String(cliente.email || '').trim().toLowerCase();
  const senhaObrigatoria = precisaSenhaInicial || emailPortalAlterado;


  const handleSubmit = (e) => {
    e.preventDefault();
    const deveConfigurarSenha = formData.tem_acesso_portal && (senhaObrigatoria || !!senhaPortal);
    if (formData.tem_acesso_portal && !formData.email?.trim()) {
      toast({ description: "Cadastre um e-mail válido para liberar o acesso ao portal.", variant: "destructive" });
      return;
    }
    if (deveConfigurarSenha && senhaPortal.length < 8) {
      toast({ description: "A senha do portal deve ter pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (deveConfigurarSenha && senhaPortal !== confirmarSenhaPortal) {
      toast({ description: "A confirmação da senha do portal não confere.", variant: "destructive" });
      return;
    }

    const { senha_acesso_publico_hash, ...formDataSemSenha } = formData;
    const dadosFinal = { ...formDataSemSenha, estabelecimentos };
    if (estabelecimentos.length > 0) {
      dadosFinal.endereco = estabelecimentos[0].endereco || formData.endereco;
      dadosFinal.latitude = estabelecimentos[0].latitude || formData.latitude;
      dadosFinal.longitude = estabelecimentos[0].longitude || formData.longitude;
    }
    if (novoCodigoAcesso.trim()) {
      dadosFinal.senha_acesso_publico_hash = novoCodigoAcesso.trim();
    }
    if (deveConfigurarSenha) {
      dadosFinal.senha_portal = senhaPortal;
    }
    onSubmit(dadosFinal);
  };

  const abrirModalNome = (opcao) => {
    setModalNome({ opcao, nomeInput: opcao.label.replace(/[^\w\sÀ-ú]/gi, '').trim() });
  };

  const confirmarNomeEstabelecimento = () => {
    if (!modalNome) return;
    const nomeCustom = modalNome.nomeInput.trim();
    if (!nomeCustom) return;
    // Verificar duplicata
    const jaExiste = estabelecimentos.find(e => e.nome.toLowerCase() === nomeCustom.toLowerCase());
    if (jaExiste) {
      setAbaAtiva(estabelecimentos.indexOf(jaExiste));
      setModalNome(null);
      return;
    }
    const novo = { nome: nomeCustom, endereco: "", latitude: null, longitude: null, tipo: modalNome.opcao.tipo, observacoes: "" };
    const novos = [...estabelecimentos, novo];
    setEstabelecimentos(novos);
    setAbaAtiva(novos.length - 1);
    setModalNome(null);
  };

  // Manter compatibilidade com código antigo
  const adicionarEstabelecimento = (opcao) => {
    abrirModalNome(opcao);
  };

  const removerEstabelecimento = (idx) => {
    const novos = estabelecimentos.filter((_, i) => i !== idx);
    setEstabelecimentos(novos);
    setAbaAtiva(Math.max(0, idx - 1));
  };

  const atualizarEstabelecimento = (idx, dados) => {
    const novos = [...estabelecimentos];
    novos[idx] = dados;
    setEstabelecimentos(novos);
  };

  return (
    <>
    {/* Modal para nomear estabelecimento */}
    {modalNome && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
          <h3 className="text-lg font-bold mb-1">Nome do Estabelecimento</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Tipo: <strong>{modalNome.opcao.label}</strong> — dê um nome personalizado (ex: Loja 01, Loja Colchões, Casa Matriz...)
          </p>
          <input
            autoFocus
            type="text"
            value={modalNome.nomeInput}
            onChange={(e) => setModalNome({ ...modalNome, nomeInput: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarNomeEstabelecimento(); } if (e.key === 'Escape') setModalNome(null); }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ex: Loja 01, Casa Principal, Escritório Centro..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalNome(null)}>Cancelar</Button>
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={confirmarNomeEstabelecimento} disabled={!modalNome.nomeInput.trim()}>
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    )}

    <Card className="mb-8 shadow-lg border-none">
      <CardHeader>
        <CardTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Dados básicos */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Cliente *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="contato@cliente.com"
              />
              <p className="text-xs text-muted-foreground">
                💡 Opcional. Necessário caso o cliente deva receber lembretes automáticos de manutenção ou acesso ao portal.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Seção de Estabelecimentos */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted border-b px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <Label className="font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Estabelecimentos / Endereços
                </Label>
              </div>

              {/* Botões para adicionar estabelecimento */}
              <div className="flex flex-wrap gap-2 mb-3">
                {ESTABELECIMENTOS_PADRAO.map((opcao) => (
                  <Button
                    key={opcao.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adicionarEstabelecimento(opcao)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {opcao.label}
                  </Button>
                ))}
              </div>

              {/* Abas dos estabelecimentos */}
              {estabelecimentos.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {estabelecimentos.map((est, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAbaAtiva(idx)}
                      onDoubleClick={() => {
                        const novoNome = prompt("Renomear estabelecimento:", est.nome);
                        if (novoNome && novoNome.trim()) {
                          const novos = [...estabelecimentos];
                          novos[idx] = { ...novos[idx], nome: novoNome.trim() };
                          setEstabelecimentos(novos);
                        }
                      }}
                      title="Clique para selecionar. Duplo clique para renomear."
                      className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors flex items-center gap-1 ${
                        abaAtiva === idx
                          ? 'bg-white border border-b-white text-blue-700 border-border'
                          : 'bg-muted text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {est.nome}
                      <span
                        onClick={(e) => { e.stopPropagation(); removerEstabelecimento(idx); }}
                        className="ml-1 text-muted-foreground hover:text-red-500 cursor-pointer"
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4">
              {estabelecimentos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Clique em um dos botões acima para adicionar um endereço para este cliente.
                </p>
              ) : (
                <EnderecoForm
                  key={abaAtiva}
                  dados={estabelecimentos[abaAtiva]}
                  onChange={(dados) => atualizarEstabelecimento(abaAtiva, dados)}
                  label={estabelecimentos[abaAtiva]?.nome}
                />
              )}
            </div>
          </div>

          {/* Histórico de Chamados por Estabelecimento */}
          {cliente && estabelecimentos.length > 0 && (
            <HistoricoChamadosEstabelecimento
              clienteId={cliente.id}
              estabelecimentos={estabelecimentos}
              abaAtiva={abaAtiva}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Informações adicionais sobre o cliente..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="tem_acesso_portal"
                  checked={formData.tem_acesso_portal}
                  onCheckedChange={(checked) => {
                    const ativo = !!checked;
                    setFormData({ ...formData, tem_acesso_portal: ativo });
                    if (!ativo) {
                      setSenhaPortal("");
                      setConfirmarSenhaPortal("");
                    }
                  }}
                />
                <div className="flex-1">
                  <label
                    htmlFor="tem_acesso_portal"
                    className="flex cursor-pointer items-center gap-2 text-sm font-semibold leading-none"
                  >
                    <ShieldCheck className="h-4 w-4 text-blue-700" />
                    Liberar acesso ao sistema
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    O cliente entrará com o e-mail cadastrado para acompanhar chamados, equipamentos e PMOCs.
                  </p>
                </div>
              </div>
            </div>

            {formData.tem_acesso_portal && (
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-foreground">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    {cliente ? "Criar ou alterar senha de acesso" : "Senha inicial de acesso"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cliente
                      ? "Preencha somente para criar o acesso ou definir uma nova senha. A senha atual nunca é exibida."
                      : "Defina a senha que o cliente usará no primeiro acesso."}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="senha_portal">{senhaObrigatoria ? "Senha" : "Nova senha"} {senhaObrigatoria && "*"}</Label>
                    <Input
                      id="senha_portal"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={senhaPortal}
                      onChange={(e) => setSenhaPortal(e.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      required={senhaObrigatoria}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmar_senha_portal">Confirmar senha {senhaObrigatoria && "*"}</Label>
                    <Input
                      id="confirmar_senha_portal"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmarSenhaPortal}
                      onChange={(e) => setConfirmarSenhaPortal(e.target.value)}
                      placeholder="Digite a senha novamente"
                      required={senhaObrigatoria || !!senhaPortal}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Por segurança, a senha não fica salva nem visível no cadastro do cliente.
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="codigo_acesso_publico">Código de acesso ao histórico público (QR Code)</Label>
            <Input
              id="codigo_acesso_publico"
              type="text"
              value={novoCodigoAcesso}
              onChange={(e) => setNovoCodigoAcesso(e.target.value)}
              placeholder={cliente ? "•••••• deixe em branco para manter o código atual" : "Padrão: 123 (deixe em branco pra usar o padrão)"}
            />
            <p className="text-xs text-muted-foreground">
              O código padrão de todo cliente é <strong>123</strong>. Digite um código próprio aqui se quiser trocar. Entregue-o a quem administra o local (síndico, gestor) para que ele consulte, sem login, o histórico completo de manutenção dos equipamentos deste cliente ao escanear o QR Code.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </CardFooter>
      </form>
    </Card>
    </>
  );
}