import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Package } from "lucide-react";
import { PECAS, MATERIAIS } from "@/lib/itensOrcamento";

export const CATEGORIAS_PECA = {
  peca: 'Peça',
  material: 'Material',
  gas: 'Gás refrigerante',
  ferramenta: 'Ferramenta',
  outro: 'Outro',
};

export const UNIDADES = ['un', 'kg', 'm', 'L', 'cx', 'par'];

export default function PecaForm({ peca, onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState(() => ({
    codigo: peca?.codigo || "",
    nome: peca?.nome || "",
    categoria: peca?.categoria || "peca",
    unidade: peca?.unidade || "un",
    estoque_minimo: peca?.estoque_minimo ?? 0,
    custo_medio: peca?.custo_medio ?? 0,
    preco_venda: peca?.preco_venda ?? "",
    localizacao: peca?.localizacao || "",
    observacoes: peca?.observacoes || "",
    ativo: peca?.ativo ?? true,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      estoque_minimo: Number(form.estoque_minimo) || 0,
      custo_medio: Number(form.custo_medio) || 0,
      preco_venda: form.preco_venda === "" ? null : Number(form.preco_venda),
    });
  };

  return (
    <Card className="shadow-lg border-none mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          {peca ? `Editar ${peca.nome}` : "Nova Peça"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                list="catalogo-pecas"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Escolha da lista ou digite"
                required
              />
              <datalist id="catalogo-pecas">
                {[...PECAS, ...MATERIAIS].map((nome) => <option key={nome} value={nome} />)}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código interno</Label>
              <Input
                id="codigo"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <select
                id="categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(CATEGORIAS_PECA).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unidade">Unidade</Label>
              <select
                id="unidade"
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
              <Input
                id="estoque_minimo"
                type="number"
                min="0"
                step="0.01"
                value={form.estoque_minimo}
                onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Abaixo disso o item entra no alerta de reposição.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="custo_medio">
                {peca ? 'Custo médio (R$)' : 'Custo unitário inicial (R$)'}
              </Label>
              <Input
                id="custo_medio"
                type="number"
                min="0"
                step="0.01"
                value={form.custo_medio}
                onChange={(e) => setForm({ ...form, custo_medio: e.target.value })}
                disabled={!!peca}
              />
              <p className="text-xs text-muted-foreground">
                {peca
                  ? 'Recalculado sozinho a cada entrada, pela média ponderada.'
                  : 'Depois passa a ser calculado pelas entradas.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="preco_venda">Preço de venda (R$)</Label>
              <Input
                id="preco_venda"
                type="number"
                min="0"
                step="0.01"
                value={form.preco_venda}
                onChange={(e) => setForm({ ...form, preco_venda: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={form.localizacao}
                onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                placeholder="Ex: Prateleira A3, van do João"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          {peca && (
            <div className="flex items-center gap-2">
              <input
                id="ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="ativo" className="cursor-pointer font-normal">
                Item ativo (desmarque para tirar da lista sem apagar o histórico)
              </Label>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
