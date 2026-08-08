import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, CalendarClock, Eraser, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignatureCanvas, limparAssinatura, isCanvasEmpty, getCanvasDataURL } from "@/components/ui/signature-canvas";
import { gerarTextoProposta } from "@/lib/propostaTexto";

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataCurta = (iso) => {
  if (!iso) return null;
  try {
    return format(new Date(`${String(iso).split('T')[0]}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return null;
  }
};

const STATUS_INFO = {
  aprovado: { label: "Aprovado", cor: "bg-green-100 text-green-800 border-green-200" },
  recusado: { label: "Recusado", cor: "bg-red-100 text-red-800 border-red-200" },
  expirado: { label: "Vencido", cor: "bg-amber-100 text-amber-800 border-amber-200" },
  enviado: { label: "Aguardando sua resposta", cor: "bg-blue-100 text-blue-800 border-blue-200" },
};

// Página pública de aprovação de orçamento (/orcamento/:token). Sem login:
// quem recebe o link não tem conta no sistema. O layout imita uma proposta
// comercial impressa, e o texto de apresentação é gerado a partir dos dados
// preenchidos (ver src/lib/propostaTexto.js).
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
      <Fundo>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          Carregando proposta...
        </div>
      </Fundo>
    );
  }

  if (erro || !dados) {
    return (
      <Fundo>
        <div className="text-center py-24">
          <p className="text-lg font-semibold text-foreground mb-2">Proposta não encontrada</p>
          <p className="text-sm text-muted-foreground">{erro || "Confira o link ou peça um novo à empresa."}</p>
        </div>
      </Fundo>
    );
  }

  const { orcamento, cliente, empresa, podeResponder } = dados;
  const itens = orcamento.itens || [];
  const subtotal = itens.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0);
  const info = STATUS_INFO[orcamento.status];
  const paragrafos = gerarTextoProposta({ empresa, cliente, orcamento });
  const dataDocumento = dataCurta(orcamento.data_envio) || dataCurta(new Date().toISOString());

  return (
    <Fundo>
      <EstilosImpressao />

      <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        {/* Cabeçalho da empresa */}
        <header className="border-b-4 border-indigo-600 px-6 sm:px-10 pt-8 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {empresa?.logo_url && (
                <img src={empresa.logo_url} alt={empresa.nome} className="h-12 w-auto object-contain shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 leading-tight">{empresa?.nome}</p>
                {empresa?.cnpj && <p className="text-xs text-slate-500">CNPJ {empresa.cnpj}</p>}
                {empresa?.endereco && <p className="text-xs text-slate-500">{empresa.endereco}</p>}
                <p className="text-xs text-slate-500">
                  {[empresa?.telefone, empresa?.email_contato].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold tracking-widest text-indigo-600 uppercase">Proposta comercial</p>
              <p className="text-xl font-bold text-slate-900">{orcamento.numero_orcamento}</p>
              <p className="text-xs text-slate-500">{dataDocumento}</p>
            </div>
          </div>
        </header>

        <div className="px-6 sm:px-10 py-7 space-y-7">
          {/* Destinatário */}
          <section className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">À</p>
              <p className="font-semibold text-slate-900">{cliente?.nome || 'Cliente'}</p>
              <p className="text-sm text-slate-600 mt-1">
                <span className="text-slate-400">Ref.:</span> {orcamento.titulo}
              </p>
            </div>
            {info && (
              <Badge variant="outline" className={`${info.cor} print:hidden`}>{info.label}</Badge>
            )}
          </section>

          {/* Carta de apresentação gerada a partir dos dados */}
          <section className="space-y-3 text-[15px] leading-relaxed text-slate-700">
            <p className="font-medium text-slate-900">Prezados,</p>
            {paragrafos.map((paragrafo, idx) => (
              <p key={idx} className="whitespace-pre-wrap">{paragrafo}</p>
            ))}
          </section>

          {/* Quadro de itens */}
          <section>
            <h2 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
              Discriminação dos itens
            </h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Item</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-slate-600 w-16">Qtd</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600 w-28">Unit.</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600 w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2.5 text-slate-800">{item.descricao}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{item.quantidade}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{moeda(item.valor_unitario)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                        {moeda(Number(item.quantidade || 0) * Number(item.valor_unitario || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right text-slate-500">Subtotal</td>
                    <td className="px-4 py-2 text-right text-slate-600">{moeda(subtotal)}</td>
                  </tr>
                  {Number(orcamento.desconto) > 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-slate-500">Desconto</td>
                      <td className="px-4 py-2 text-right text-red-600">- {moeda(orcamento.desconto)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-200">
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900">Valor total</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-green-700">
                      {moeda(orcamento.valor_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {orcamento.observacoes && (
            <section>
              <h2 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                Condições
              </h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{orcamento.observacoes}</p>
            </section>
          )}

          <section className="pt-1">
            <p className="text-sm text-slate-700">Atenciosamente,</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{empresa?.nome}</p>
          </section>
        </div>

        {/* Aceite */}
        <footer className="border-t border-slate-200 bg-slate-50/60 px-6 sm:px-10 py-7">
          {podeResponder ? (
            <div className="space-y-4">
              <h2 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Aceite da proposta
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome do responsável *</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="bg-white" />
              </div>

              {!modoRecusa && (
                <div className="space-y-1.5">
                  <Label>Assinatura *</Label>
                  <SignatureCanvas
                    canvasRef={canvasRef}
                    width={600}
                    height={180}
                    label="Assine para aprovar a proposta"
                    onChange={setAssinou}
                  />
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
                  <p className="text-xs text-slate-500">
                    Ao assinar, você declara estar de acordo com o escopo e o valor apresentados acima.
                  </p>
                </div>
              )}

              {modoRecusa && (
                <div className="space-y-1.5">
                  <Label htmlFor="motivo">Motivo da recusa (opcional)</Label>
                  <Textarea id="motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="bg-white" />
                </div>
              )}

              {erroResposta && <p className="text-sm text-red-600">{erroResposta}</p>}

              {modoRecusa ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-white" onClick={() => { setModoRecusa(false); setErroResposta(null); }} disabled={enviando}>
                    Voltar
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => responder("recusar")} disabled={enviando}>
                    {enviando ? "Enviando..." : "Confirmar recusa"}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-white text-red-600" onClick={() => { setModoRecusa(true); setErroResposta(null); }} disabled={enviando}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Recusar
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => responder("aprovar")} disabled={enviando}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {enviando ? "Enviando..." : "Aprovar proposta"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              {orcamento.status === "aprovado" && <CheckCircle2 className="w-11 h-11 text-green-600 mx-auto mb-3" />}
              {orcamento.status === "recusado" && <XCircle className="w-11 h-11 text-red-500 mx-auto mb-3" />}
              {orcamento.status === "expirado" && <CalendarClock className="w-11 h-11 text-amber-500 mx-auto mb-3" />}
              <p className="font-semibold text-slate-900">
                {orcamento.status === "aprovado" && "Proposta aprovada"}
                {orcamento.status === "recusado" && "Proposta recusada"}
                {orcamento.status === "expirado" && "Esta proposta venceu"}
              </p>
              {orcamento.nome_aprovador && (
                <p className="text-sm text-slate-600 mt-1">
                  Por {orcamento.nome_aprovador}
                  {orcamento.data_resposta && ` em ${format(new Date(orcamento.data_resposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
                </p>
              )}
              {orcamento.motivo_recusa && (
                <p className="text-sm text-slate-600 mt-2">Motivo: {orcamento.motivo_recusa}</p>
              )}
              {orcamento.status === "expirado" && (
                <p className="text-sm text-slate-600 mt-2">Peça uma proposta nova à empresa.</p>
              )}
            </div>
          )}
        </footer>
      </article>

      <div className="flex justify-center mt-5 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir ou salvar em PDF
        </Button>
      </div>
    </Fundo>
  );
}

function Fundo({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-3 sm:px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto">{children}</div>
    </div>
  );
}

// A proposta é um documento: o cliente vai querer guardar ou mandar pro
// contador. Some com o que não faz sentido no papel.
function EstilosImpressao() {
  return (
    <style>{`
      @media print {
        @page { size: A4 portrait; margin: 14mm; }
        body { background: #fff !important; }
        table { break-inside: auto; }
        tr { break-inside: avoid; }
        thead { display: table-header-group; }
      }
    `}</style>
  );
}
