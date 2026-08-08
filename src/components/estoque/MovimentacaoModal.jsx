import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, ArrowDownCircle, ArrowUpCircle, ClipboardCheck } from "lucide-react";

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TIPOS = {
  entrada: {
    rotulo: 'Entrada',
    descricao: 'Compra ou devolução ao estoque',
    icone: ArrowDownCircle,
    cor: 'text-green-600',
  },
  saida: {
    rotulo: 'Saída',
    descricao: 'Peça usada em atendimento',
    icone: ArrowUpCircle,
    cor: 'text-red-600',
  },
  ajuste: {
    rotulo: 'Ajuste',
    descricao: 'Contagem de inventário',
    icone: ClipboardCheck,
    cor: 'text-blue-600',
  },
};

export default function MovimentacaoModal({ peca, chamados = [], tecnicos = [], onConfirmar, onClose, isLoading }) {
  const [tipo, setTipo] = useState('saida');
  const [quantidade, setQuantidade] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [chamadoId, setChamadoId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState(null);

  const qtd = Number(quantidade) || 0;
  const saldoAtual = Number(peca.saldo_atual) || 0;

  const saldoDepois = tipo === 'entrada' ? saldoAtual + qtd
    : tipo === 'saida' ? saldoAtual - qtd
    : qtd;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);

    if (qtd <= 0 && tipo !== 'ajuste') {
      setErro('Informe uma quantidade maior que zero.');
      return;
    }
    if (tipo === 'ajuste' && quantidade === '') {
      setErro('Informe o saldo contado.');
      return;
    }
    if (tipo === 'saida' && qtd > saldoAtual) {
      setErro(`Saldo insuficiente: há ${saldoAtual} ${peca.unidade} em estoque.`);
      return;
    }

    onConfirmar({
      peca_id: peca.id,
      tipo,
      quantidade: qtd,
      custo_unitario: tipo === 'entrada' && custoUnitario !== '' ? Number(custoUnitario) : null,
      chamado_id: tipo === 'saida' && chamadoId ? chamadoId : null,
      tecnico_id: tecnicoId || null,
      observacao: observacao.trim() || null,
      data_movimentacao: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="mov-title">
      <div className="w-full max-w-lg rounded-t-2xl bg-background shadow-xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-start justify-between p-6 pb-3">
          <div>
            <h2 id="mov-title" className="text-lg font-semibold text-foreground">Movimentar estoque</h2>
            <p className="text-sm text-muted-foreground">
              {peca.nome} · saldo atual {saldoAtual} {peca.unidade}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TIPOS).map(([valor, cfg]) => {
              const Icone = cfg.icone;
              const ativo = tipo === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setTipo(valor)}
                  aria-pressed={ativo}
                  className={`rounded-lg border-2 p-3 text-center transition-colors ${
                    ativo ? 'border-indigo-600 bg-indigo-50' : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icone className={`w-5 h-5 mx-auto mb-1 ${cfg.cor}`} />
                  <span className="block text-sm font-medium text-foreground">{cfg.rotulo}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{TIPOS[tipo].descricao}</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quantidade">
                {tipo === 'ajuste' ? `Saldo contado (${peca.unidade}) *` : `Quantidade (${peca.unidade}) *`}
              </Label>
              <Input
                id="quantidade"
                type="number"
                min="0"
                step="0.01"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                autoFocus
                required
              />
            </div>

            {tipo === 'entrada' && (
              <div className="space-y-1.5">
                <Label htmlFor="custo">Custo unitário (R$)</Label>
                <Input
                  id="custo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(e.target.value)}
                  placeholder={moeda(peca.custo_medio)}
                />
                <p className="text-xs text-muted-foreground">Recalcula o custo médio.</p>
              </div>
            )}
          </div>

          {tipo === 'saida' && (
            <div className="space-y-1.5">
              <Label htmlFor="chamado">Chamado (opcional)</Label>
              <select
                id="chamado"
                value={chamadoId}
                onChange={(e) => setChamadoId(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Não vincular a chamado</option>
                {chamados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero_chamado} — {c.titulo}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Vincular deixa o custo da peça aparecer no chamado.</p>
            </div>
          )}

          {tecnicos.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="tecnico">Técnico (opcional)</Label>
              <select
                id="tecnico"
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Não informar</option>
                {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={tipo === 'entrada' ? 'Ex: NF 1234, fornecedor Refrigeração Sul' : 'Ex: troca no split da sala 3'}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Saldo depois desta movimentação</span>
            <span className={`font-semibold ${saldoDepois < 0 ? 'text-red-600' : 'text-foreground'}`}>
              {saldoDepois} {peca.unidade}
            </span>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
