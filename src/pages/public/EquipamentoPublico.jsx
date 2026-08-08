import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, History, ArrowLeft, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { statusManutencao, STATUS_MANUTENCAO_CONFIG, LABEL_PERIODICIDADE } from "@/lib/pmocChecklist";
import HistoricoManutencaoPublico from "@/components/equipamentos/HistoricoManutencaoPublico";

// Página pública do QR code de um equipamento — sem login. Renderizada fora
// do PrivateApplication e fora das páginas de marketing pré-renderizadas
// (ver src/public/site-config.js e o branch novo em src/App.jsx).
export default function EquipamentoPublico() {
  const { id } = useParams();
  const [tela, setTela] = useState("menu"); // menu | chamado | chamado_ok | historico
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [dados, setDados] = useState(null);

  const [codigoAcesso, setCodigoAcesso] = useState("");
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState(null);

  const [formChamado, setFormChamado] = useState({ nome_solicitante: "", contato_solicitante: "", descricao: "" });
  const [enviandoChamado, setEnviandoChamado] = useState(false);
  const [erroChamado, setErroChamado] = useState(null);
  const [numeroChamadoCriado, setNumeroChamadoCriado] = useState(null);

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const criouMeta = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    const anterior = meta.getAttribute("content");
    meta.setAttribute("content", "noindex,nofollow");
    return () => {
      if (criouMeta) {
        meta.remove();
      } else if (anterior !== null) {
        meta.setAttribute("content", anterior);
      }
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    invokeEdgeFunction("equipamento-publico", { equipamento_id: id })
      .then((resposta) => {
        if (cancelado) return;
        setDados(resposta);
      })
      .catch((error) => {
        if (cancelado) return;
        setErro(error.message || "Não foi possível carregar os dados do equipamento.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  const enviarChamado = async (e) => {
    e.preventDefault();
    setErroChamado(null);
    if (!formChamado.nome_solicitante.trim() || !formChamado.descricao.trim()) {
      setErroChamado("Preencha seu nome e a descrição do problema.");
      return;
    }
    setEnviandoChamado(true);
    try {
      const resposta = await invokeEdgeFunction("equipamento-abrir-chamado", {
        equipamento_id: id,
        nome_solicitante: formChamado.nome_solicitante.trim(),
        contato_solicitante: formChamado.contato_solicitante.trim() || null,
        descricao: formChamado.descricao.trim(),
      });
      setNumeroChamadoCriado(resposta.numero_chamado || resposta.id);
      setTela("chamado_ok");
    } catch (error) {
      setErroChamado(error.message || "Não foi possível abrir o chamado. Tente novamente.");
    } finally {
      setEnviandoChamado(false);
    }
  };

  const validarCodigo = async (e) => {
    e.preventDefault();
    setErroCodigo(null);
    if (!codigoAcesso.trim()) {
      setErroCodigo("Digite o código de acesso.");
      return;
    }
    setValidandoCodigo(true);
    try {
      const resposta = await invokeEdgeFunction("equipamento-publico", {
        equipamento_id: id,
        codigo_acesso: codigoAcesso.trim(),
      });
      setDados(resposta);
      if (resposta.requiresCode) {
        setErroCodigo("Código incorreto. Confira com a empresa responsável.");
      }
    } catch (error) {
      setErroCodigo(error.message || "Não foi possível validar o código.");
    } finally {
      setValidandoCodigo(false);
    }
  };

  if (carregando) {
    return (
      <TelaPublica>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          Carregando informações do equipamento...
        </div>
      </TelaPublica>
    );
  }

  if (erro || !dados) {
    return (
      <TelaPublica>
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-foreground mb-2">Equipamento não encontrado</p>
          <p className="text-sm text-muted-foreground">{erro || "Verifique se o QR code está correto ou fale com a empresa responsável."}</p>
        </div>
      </TelaPublica>
    );
  }

  const { equipamento, cliente, empresa } = dados;
  const status = equipamento.periodicidade_pmoc
    ? statusManutencao(equipamento.proxima_manutencao, equipamento.ultima_manutencao)
    : null;

  return (
    <TelaPublica empresaNome={empresa?.nome}>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="outline">{equipamento.numero_equipamento || "Equipamento"}</Badge>
          {status && (
            <Badge variant="outline" className={STATUS_MANUTENCAO_CONFIG[status].cor}>
              {STATUS_MANUTENCAO_CONFIG[status].label}
            </Badge>
          )}
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {equipamento.marca} {equipamento.modelo}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[equipamento.estabelecimento_nome, equipamento.localizacao].filter(Boolean).join(" · ") || "Localização não informada"}
        </p>
        {cliente?.nome && <p className="text-sm text-muted-foreground">Cliente: {cliente.nome}</p>}
        {equipamento.periodicidade_pmoc && (
          <p className="text-xs text-purple-600 font-medium mt-1">PMOC {LABEL_PERIODICIDADE[equipamento.periodicidade_pmoc]}</p>
        )}
      </div>

      {tela === "menu" && (
        <div className="grid gap-3">
          <Button size="lg" className="h-auto py-4 bg-indigo-600 hover:bg-indigo-700 justify-start" onClick={() => setTela("chamado")}>
            <Wrench className="w-5 h-5 mr-3 shrink-0" />
            <span className="text-left">
              <span className="block font-semibold">Abrir Chamado</span>
              <span className="block text-xs font-normal opacity-90">Reportar um problema neste equipamento</span>
            </span>
          </Button>
          <Button size="lg" variant="outline" className="h-auto py-4 justify-start" onClick={() => setTela("historico")}>
            <History className="w-5 h-5 mr-3 shrink-0" />
            <span className="text-left">
              <span className="block font-semibold">Ver Histórico de Manutenção</span>
              <span className="block text-xs font-normal text-muted-foreground">Chamados e PMOC já executados (requer código de acesso)</span>
            </span>
          </Button>
        </div>
      )}

      {tela === "chamado" && (
        <Card>
          <CardContent className="p-5">
            <button type="button" onClick={() => setTela("menu")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <form onSubmit={enviarChamado} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome_solicitante">Seu nome *</Label>
                <Input
                  id="nome_solicitante"
                  value={formChamado.nome_solicitante}
                  onChange={(e) => setFormChamado({ ...formChamado, nome_solicitante: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contato_solicitante">Telefone ou e-mail (opcional)</Label>
                <Input
                  id="contato_solicitante"
                  value={formChamado.contato_solicitante}
                  onChange={(e) => setFormChamado({ ...formChamado, contato_solicitante: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descreva o problema *</Label>
                <Textarea
                  id="descricao"
                  rows={4}
                  value={formChamado.descricao}
                  onChange={(e) => setFormChamado({ ...formChamado, descricao: e.target.value })}
                  required
                />
              </div>
              {erroChamado && <p className="text-sm text-red-600">{erroChamado}</p>}
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={enviandoChamado}>
                {enviandoChamado ? "Enviando..." : "Abrir Chamado"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tela === "chamado_ok" && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="font-semibold text-foreground mb-1">Chamado aberto com sucesso!</p>
            {numeroChamadoCriado && (
              <p className="text-sm text-muted-foreground">Número: {numeroChamadoCriado}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">A equipe responsável foi notificada e entrará em contato.</p>
            <Button variant="outline" className="mt-4" onClick={() => setTela("menu")}>Voltar ao início</Button>
          </CardContent>
        </Card>
      )}

      {tela === "historico" && (
        <div>
          <button type="button" onClick={() => setTela("menu")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          {dados.requiresCode ? (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3 text-foreground">
                  <Lock className="w-4 h-4" />
                  <p className="font-semibold text-sm">Histórico protegido por código de acesso</p>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Peça o código de acesso à empresa responsável ou ao administrador do local.
                </p>
                <form onSubmit={validarCodigo} className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Código de acesso"
                    value={codigoAcesso}
                    onChange={(e) => setCodigoAcesso(e.target.value)}
                  />
                  {erroCodigo && <p className="text-sm text-red-600">{erroCodigo}</p>}
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={validandoCodigo}>
                    {validandoCodigo ? "Verificando..." : "Ver Histórico"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <HistoricoManutencaoPublico historico={dados.historico} />
          )}
        </div>
      )}
    </TelaPublica>
  );
}

function TelaPublica({ children, empresaNome }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <p className="text-center text-xs font-medium tracking-wide text-indigo-600 uppercase mb-4">
          {empresaNome || "ClimaPro"}
        </p>
        {children}
      </div>
    </div>
  );
}
