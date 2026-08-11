import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Plus, Trash2, FileText } from "lucide-react";
import { ITENS_ORCAMENTO } from "@/lib/itensOrcamento";
import { gerarTextoProposta } from "@/lib/propostaTexto";
import { SelectBuscavel } from "@/components/ui/select-buscavel";

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const itemVazio = () => ({ descricao: "", quantidade: 1, valor_unitario: 0 });

function dataDaquiA(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

export default function OrcamentoForm({ orcamento, clientes, empresaNome, onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState(() => ({
    cliente_id: orcamento?.cliente_id || "",
    titulo: orcamento?.titulo || "",
    descricao: orcamento?.descricao || "",
    validade_ate: orcamento?.validade_ate || dataDaquiA(15),
    desconto: orcamento?.desconto || 0,
    observacoes: orcamento?.observacoes || "",
  }));
  const [itens, setItens] = useState(() =>
    orcamento?.itens?.length ? orcamento.itens : [itemVazio()]
  );
  const [erro, setErro] = useState(null);

  const subtotal = itens.reduce(
    (s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0),
    0
  );
  const total = Math.max(0, subtotal - Number(form.desconto || 0));

  const atualizarItem = (idx, campo, valor) => {
    setItens(itens.map((item, i) => (i === idx ? { ...item, [campo]: valor } : item)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro(null);

    const itensValidos = itens
      .filter((i) => i.descricao.trim())
      .map((i) => ({
        descricao: i.descricao.trim(),
        quantidade: Number(i.quantidade) || 0,
        valor_unitario: Number(i.valor_unitario) || 0,
      }));

    if (itensValidos.length === 0) {
      setErro("Adicione pelo menos um item com descrição.");
      return;
    }

    onSubmit({
      ...form,
      desconto: Number(form.desconto) || 0,
      itens: itensValidos,
      valor_total: total,
    });
  };

  return (
    <Card className="shadow-lg border-none mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {orcamento ? `Editar ${orcamento.numero_orcamento}` : "Novo Orçamento"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cliente_id">Cliente *</Label>
              <SelectBuscavel
                id="cliente_id"
                itens={clientes.map((c) => ({ valor: c.id, rotulo: c.nome, secundario: c.endereco }))}
                valor={form.cliente_id}
                onChange={(valor) => setForm({ ...form, cliente_id: valor })}
                placeholder="Selecione um cliente"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="validade_ate">Válido até</Label>
              <Input
                id="validade_ate"
                type="date"
                value={form.validade_ate}
                onChange={(e) => setForm({ ...form, validade_ate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Troca de compressor — Split 12.000 BTUs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição do serviço</Label>
            <Textarea
              id="descricao"
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="O que será feito, prazo de execução, garantia..."
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Itens</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setItens([...itens, itemVazio()])}>
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar item
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Comece a digitar na descrição para ver os serviços e peças de refrigeração mais comuns, ou escreva o
              seu próprio.
            </p>

            {/* Sugestões compartilhadas por todas as linhas de item */}
            <datalist id="catalogo-itens-orcamento">
              {ITENS_ORCAMENTO.map((nome) => (
                <option key={nome} value={nome} />
              ))}
            </datalist>

            <div className="space-y-3">
              {itens.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-6 space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      list="catalogo-itens-orcamento"
                      value={item.descricao}
                      onChange={(e) => atualizarItem(idx, "descricao", e.target.value)}
                      placeholder="Escolha da lista ou digite"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(idx, "quantidade", e.target.value)}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3 space-y-1">
                    <Label className="text-xs">Valor unit. (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valor_unitario}
                      onChange={(e) => atualizarItem(idx, "valor_unitario", e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => setItens(itens.length > 1 ? itens.filter((_, i) => i !== idx) : [itemVazio()])}
                      aria-label={`Remover item ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="desconto">Desconto (R$)</Label>
              <Input
                id="desconto"
                type="number"
                min="0"
                step="0.01"
                value={form.desconto}
                onChange={(e) => setForm({ ...form, desconto: e.target.value })}
              />
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{moeda(subtotal)}</span>
              </div>
              {Number(form.desconto) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Desconto</span><span className="text-red-600">- {moeda(form.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 mt-1 font-semibold text-foreground">
                <span>Total</span><span className="text-green-700">{moeda(total)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações (aparecem para o cliente)</Label>
            <Textarea
              id="observacoes"
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Ex: Valor não inclui alvenaria. Pagamento em até 2x."
            />
          </div>

          {/* O cliente não vê os campos crus: a proposta que chega até ele é
              montada a partir deles. Mostrar aqui evita surpresa. */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-foreground mb-1">Como o cliente vai ver</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Texto gerado automaticamente com o que você preencheu. Muda sozinho conforme você edita.
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm text-foreground">
              <p className="font-medium">Prezados,</p>
              {gerarTextoProposta({
                empresa: { nome: empresaNome },
                cliente: { nome: clientes.find((c) => c.id === form.cliente_id)?.nome },
                orcamento: {
                  titulo: form.titulo || 'este serviço',
                  descricao: form.descricao,
                  itens: itens.filter((i) => i.descricao.trim()),
                  valor_total: total,
                  desconto: Number(form.desconto) || 0,
                  validade_ate: form.validade_ate,
                },
              }).map((paragrafo, idx) => (
                <p key={idx} className="whitespace-pre-wrap leading-relaxed">{paragrafo}</p>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Salvando..." : "Salvar Orçamento"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
