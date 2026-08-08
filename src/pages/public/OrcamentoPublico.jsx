import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, CalendarClock, Eraser } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignatureCanvas, limparAssinatura, isCanvasEmpty, getCanvasDataURL } from "@/components/ui/signature-canvas";

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_INFO = {
  aprovado: { label: "Aprovado", cor: "bg-green-100 text-green-800 border-green-200" },
  recusado: { label: "Recusado", cor: "bg-red-100 text-red-800 border-red-200" },
  expirado: { label: "Vencido", cor: "bg-amber-100 text-amber-800 border-amber-200" },
  enviado: { label: "Aguardando sua resposta", cor: "bg-blue-100 text-blue-800 border-blue-200" },
};

// Página pública de aprovação de orçamento (/orcamento/:token). Sem login:
// quem recebe o link não tem conta no sistema.
export default function OrcamentoPublico() {
  const { token } = useParams();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [dados, setDados] = useState(null);

  const [nome, setNome] = useState("");
  const [motivo, setMotivo] = useState("");
  const [modoRecusa, setModoRecusa] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroResposta, setErroResposta] = useState(null);
  const [assinou, setAssinou] = useState(false);
  const canvasRef = useRef(null);

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
      if (criouMeta) meta.remove();
      else if (anterior !== null) meta.setAttribute("content", anterior);
    };
  }, []);

  const carregar = React.useCallback(() => {
    setCarregando(true);
    setErro(null);
    return invokeEdgeFunction("orcamento-publico", { token })
      .then(setDados)
      .catch((e) => setErro(e.message || "Não foi possível carregar o orçamento."))
      .finally(() => setCarregando(false));
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);

  const responder = async (acao) => {
    setErroResposta(null);
    if (!nome.trim()) {
      setErroResposta("Informe seu nome para registrar a resposta.");
      return;
    }
    if (acao === "aprovar" && isCanvasEmpty(canvasRef)) {
      setErroResposta("Assine no quadro acima para aprovar.");
      return;
    }
    setEnviando(true);
    try {
      await invokeEdgeFunction("orcamento-responder", {
        token,
        acao,
        nome_aprovador: nome.trim(),
        assinatura_cliente: acao === "aprovar" ? getCanvasDataURL(canvasRef) : null,
        motivo_recusa: acao === "recusar" ? motivo.trim() : null,
      });
      await carregar();
    } catch (e) {
      setErroResposta(e.message || "Não foi possível registrar sua resposta.");
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <Tela>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          Carregando orçamento...
        </div>
      </Tela>
    );
  }

  if (erro || !dados) {
    return (
      <Tela>
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-foreground mb-2">Orçamento não encontrado</p>
          <p className="text-sm text-muted-foreground">{erro || "Confira o link ou peça um novo à empresa."}</p>
        </div>
      </Tela>
    );
  }

  const { orcamento, cliente, empresa, podeResponder } = dados;
  const itens = orcamento.itens || [];
  const subtotal = itens.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0);
  const info = STATUS_INFO[orcamento.status];

  return (
    <Tela empresa={empresa}>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="outline">{orcamento.numero_orcamento}</Badge>
          {info && <Badge variant="outline" className={info.cor}>{info.label}</Badge>}
        </div>
        <h1 className="text-xl font-semibold text-foreground">{orcamento.titulo}</h1>
        {cliente?.nome && <p className="text-sm text-muted-foreground">Para: {cliente.nome}</p>}
        {orcamento.validade_ate && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <CalendarClock className="w-4 h-4" />
            Válido até {format(new Date(`${orcamento.validade_ate}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}
      </div>

      {orcamento.descricao && (
        <Card className="mb-4">
          <CardContent className="p-4 text-sm text-foreground whitespace-pre-wrap">{orcamento.descricao}</CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">Qtd</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Unit.</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itens.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-foreground">{item.descricao}</td>
                    <td className="px-4 py-2 text-center text-muted-foreground">{item.quantidade}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{moeda(item.valor_unitario)}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground">
                      {moeda(Number(item.quantidade || 0) * Number(item.valor_unitario || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t p-4 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{moeda(subtotal)}</span>
            </div>
            {Number(orcamento.desconto) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Desconto</span><span className="text-red-600">- {moeda(orcamento.desconto)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 mt-1 text-base font-semibold text-foreground">
              <span>Total</span><span className="text-green-700">{moeda(orcamento.valor_total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {orcamento.observacoes && (
        <p className="text-xs text-muted-foreground mb-4 whitespace-pre-wrap">{orcamento.observacoes}</p>
      )}

      {podeResponder ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Seu nome *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            {!modoRecusa && (
              <div className="space-y-1.5">
                <Label>Assinatura *</Label>
                <SignatureCanvas canvasRef={canvasRef} width={600} height={180} label="Assine para aprovar o orçamento" onChange={setAssinou} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => limparAssinatura(canvasRef, setAssinou)}
                  disabled={!assinou}
                >
                  <Eraser className="w-4 h-4 mr-1.5" />
                  Limpar assinatura
                </Button>
              </div>
            )}

            {modoRecusa && (
              <div className="space-y-1.5">
                <Label htmlFor="motivo">Motivo da recusa (opcional)</Label>
                <Textarea id="motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </div>
            )}

            {erroResposta && <p className="text-sm text-red-600">{erroResposta}</p>}

            {modoRecusa ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setModoRecusa(false); setErroResposta(null); }} disabled={enviando}>
                  Voltar
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => responder("recusar")} disabled={enviando}>
                  {enviando ? "Enviando..." : "Confirmar recusa"}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-red-600" onClick={() => { setModoRecusa(true); setErroResposta(null); }} disabled={enviando}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Recusar
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => responder("aprovar")} disabled={enviando}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {enviando ? "Enviando..." : "Aprovar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            {orcamento.status === "aprovado" && <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />}
            {orcamento.status === "recusado" && <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />}
            {orcamento.status === "expirado" && <CalendarClock className="w-12 h-12 text-amber-500 mx-auto mb-3" />}
            <p className="font-semibold text-foreground">
              {orcamento.status === "aprovado" && "Orçamento aprovado"}
              {orcamento.status === "recusado" && "Orçamento recusado"}
              {orcamento.status === "expirado" && "Este orçamento venceu"}
            </p>
            {orcamento.nome_aprovador && (
              <p className="text-sm text-muted-foreground mt-1">
                Por {orcamento.nome_aprovador}
                {orcamento.data_resposta && ` em ${format(new Date(orcamento.data_resposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
              </p>
            )}
            {orcamento.motivo_recusa && (
              <p className="text-sm text-muted-foreground mt-2">Motivo: {orcamento.motivo_recusa}</p>
            )}
            {orcamento.status === "expirado" && (
              <p className="text-sm text-muted-foreground mt-2">Peça um orçamento novo à empresa.</p>
            )}
          </CardContent>
        </Card>
      )}

      {(empresa?.telefone || empresa?.email_contato) && (
        <p className="text-center text-xs text-muted-foreground mt-6">
          Dúvidas? Fale com {empresa.nome}
          {empresa.telefone && ` · ${empresa.telefone}`}
          {empresa.email_contato && ` · ${empresa.email_contato}`}
        </p>
      )}
    </Tela>
  );
}

function Tela({ children, empresa }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {empresa?.logo_url ? (
          <img src={empresa.logo_url} alt={empresa.nome} className="h-10 mx-auto mb-4 object-contain" />
        ) : (
          <p className="text-center text-xs font-medium tracking-wide text-indigo-600 uppercase mb-4">
            {empresa?.nome || "ClimaPro"}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
