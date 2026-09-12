import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SelectBuscavel } from "@/components/ui/select-buscavel";
import { Layers, Plus, AlertCircle } from "lucide-react";
import { LABEL_PERIODICIDADE } from "@/lib/pmocChecklist";
import {
  expandirFaixa,
  parseLocalizacoes,
  montarEquipamentos,
  validarLote,
  MAXIMO_POR_LOTE,
} from "@/lib/cadastroLote";

const TIPOS = [
  { valor: "ar_condicionado", rotulo: "Ar condicionado" },
  { valor: "camara_fria", rotulo: "Câmara fria" },
  { valor: "geladeira", rotulo: "Geladeira" },
  { valor: "freezer", rotulo: "Freezer" },
  { valor: "chiller", rotulo: "Chiller" },
  { valor: "outro", rotulo: "Outro" },
];

export default function CadastroLoteEquipamentos({ clientes, equipamentos = [], onSubmit, onCancel, isLoading }) {
  const [comum, setComum] = useState({
    cliente_id: "",
    estabelecimento_nome: "",
    tipo: "ar_condicionado",
    marca: "",
    modelo: "",
    capacidade: "",
    pmoc_ativo: true,
    periodicidade_pmoc: "mensal",
  });

  const [texto, setTexto] = useState("");
  const [faixa, setFaixa] = useState({ prefixo: "Quarto", de: "", ate: "" });
  const [prefixoNumero, setPrefixoNumero] = useState("AC-");

  const cliente = clientes.find((c) => c.id === comum.cliente_id);
  const estabelecimentos = cliente?.estabelecimentos || [];

  // Continua a numeração de onde o cliente parou, para o segundo lote não
  // repetir AC-001. É contagem simples, não leitura do maior número existente:
  // a prévia mostra o resultado e o usuário corrige se não gostar.
  const numeroInicial = useMemo(() => {
    if (!comum.cliente_id) return 1;
    return equipamentos.filter((e) => e.cliente_id === comum.cliente_id).length + 1;
  }, [comum.cliente_id, equipamentos]);

  const localizacoes = parseLocalizacoes(texto);
  const erros = validarLote({ comum, localizacoes });

  const previa = montarEquipamentos({
    comum: {
      ...comum,
      estabelecimento_nome: comum.estabelecimento_nome || null,
      capacidade: comum.capacidade || null,
      periodicidade_pmoc: comum.pmoc_ativo ? comum.periodicidade_pmoc : null,
    },
    localizacoes,
    prefixoNumero,
    numeroInicial,
  });

  const adicionarFaixa = () => {
    const novas = expandirFaixa(faixa);
    if (novas.length === 0) return;
    setTexto((atual) => (atual.trim() ? `${atual.trim()}\n${novas.join("\n")}` : novas.join("\n")));
    setFaixa((f) => ({ ...f, de: "", ate: "" }));
  };

  const faixaInvalida = faixa.de !== "" && faixa.ate !== "" && expandirFaixa(faixa).length === 0;

  const gravar = (evento) => {
    evento.preventDefault();
    if (erros.length > 0) return;
    onSubmit(previa);
  };

  return (
    <Card className="shadow-lg border-none mb-6">
      <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Cadastrar equipamentos em lote
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Para um hotel ou prédio, onde as máquinas são iguais e só muda o lugar. Preencha o que se
          repete uma vez e liste as localizações. Se houver modelos diferentes, faça um lote por
          modelo.
        </p>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={gravar} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lote-cliente">Cliente *</Label>
              <SelectBuscavel
                id="lote-cliente"
                itens={clientes.map((c) => ({ valor: c.id, rotulo: c.nome, secundario: c.endereco }))}
                valor={comum.cliente_id}
                onChange={(valor) => setComum({ ...comum, cliente_id: valor, estabelecimento_nome: "" })}
                placeholder="Escolha o cliente"
              />
            </div>

            {estabelecimentos.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="lote-estabelecimento">Estabelecimento</Label>
                <SelectBuscavel
                  id="lote-estabelecimento"
                  itens={estabelecimentos.map((e) => ({ valor: e.nome, rotulo: e.nome, secundario: e.endereco }))}
                  valor={comum.estabelecimento_nome}
                  onChange={(valor) => setComum({ ...comum, estabelecimento_nome: valor })}
                  placeholder="Todos"
                  opcaoTodos="Não vincular"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="lote-tipo">Tipo *</Label>
              <SelectBuscavel
                id="lote-tipo"
                itens={TIPOS}
                valor={comum.tipo}
                onChange={(valor) => setComum({ ...comum, tipo: valor })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lote-marca">Marca *</Label>
              <Input
                id="lote-marca"
                value={comum.marca}
                onChange={(e) => setComum({ ...comum, marca: e.target.value })}
                placeholder="Springer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lote-modelo">Modelo *</Label>
              <Input
                id="lote-modelo"
                value={comum.modelo}
                onChange={(e) => setComum({ ...comum, modelo: e.target.value })}
                placeholder="Midea Inverter"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lote-capacidade">Capacidade</Label>
              <Input
                id="lote-capacidade"
                value={comum.capacidade}
                onChange={(e) => setComum({ ...comum, capacidade: e.target.value })}
                placeholder="12.000 BTUs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Switch
                id="lote-pmoc"
                checked={comum.pmoc_ativo}
                onCheckedChange={(marcado) => setComum({ ...comum, pmoc_ativo: marcado })}
              />
              <Label htmlFor="lote-pmoc" className="cursor-pointer">Incluir todos no PMOC</Label>
            </div>
            {comum.pmoc_ativo && (
              <div className="flex items-center gap-2">
                <Label htmlFor="lote-periodicidade" className="text-sm text-muted-foreground">Periodicidade</Label>
                <div className="w-44">
                  <SelectBuscavel
                    id="lote-periodicidade"
                    itens={Object.entries(LABEL_PERIODICIDADE).map(([valor, rotulo]) => ({ valor, rotulo }))}
                    valor={comum.periodicidade_pmoc}
                    onChange={(valor) => setComum({ ...comum, periodicidade_pmoc: valor })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="lote-localizacoes">Localizações, uma por linha *</Label>

            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/50 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="faixa-prefixo" className="text-xs">Gerar faixa</Label>
                <Input
                  id="faixa-prefixo"
                  value={faixa.prefixo}
                  onChange={(e) => setFaixa({ ...faixa, prefixo: e.target.value })}
                  placeholder="Quarto"
                  className="w-32"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faixa-de" className="text-xs">De</Label>
                <Input
                  id="faixa-de"
                  value={faixa.de}
                  onChange={(e) => setFaixa({ ...faixa, de: e.target.value })}
                  placeholder="101"
                  inputMode="numeric"
                  className="w-24"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faixa-ate" className="text-xs">Até</Label>
                <Input
                  id="faixa-ate"
                  value={faixa.ate}
                  onChange={(e) => setFaixa({ ...faixa, ate: e.target.value })}
                  placeholder="120"
                  inputMode="numeric"
                  className="w-24"
                />
              </div>
              <Button type="button" variant="outline" onClick={adicionarFaixa} disabled={expandirFaixa(faixa).length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar à lista
              </Button>
              {faixaInvalida && (
                <p className="w-full text-xs text-amber-700">
                  Faixa inválida. O primeiro número tem que ser menor que o segundo, e o lote não
                  passa de {MAXIMO_POR_LOTE} equipamentos.
                </p>
              )}
            </div>

            <Textarea
              id="lote-localizacoes"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={8}
              placeholder={"Quarto 101\nQuarto 102\nRecepção\nRestaurante\nAcademia"}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Dá para colar direto de uma planilha. Linha em branco é ignorada, e repetir a mesma
              localização cria dois equipamentos, que é o certo quando o salão tem dois splits.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lote-prefixo-numero">Prefixo do número do equipamento</Label>
              <Input
                id="lote-prefixo-numero"
                value={prefixoNumero}
                onChange={(e) => setPrefixoNumero(e.target.value)}
                placeholder="AC-"
              />
              <p className="text-xs text-muted-foreground">
                A numeração continua de onde este cliente parou, começando em{" "}
                <span className="font-mono">{previa[0]?.numero_equipamento || "—"}</span>.
              </p>
            </div>
          </div>

          {previa.length > 0 && (
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                <p className="text-sm font-medium">
                  {previa.length} equipamento{previa.length !== 1 ? "s" : ""} para cadastrar
                </p>
                {cliente && <p className="text-sm text-muted-foreground">{cliente.nome}</p>}
              </div>
              <div className="max-h-56 overflow-y-auto divide-y">
                {previa.map((equipamento, indice) => (
                  <div key={indice} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="font-mono text-muted-foreground w-24 shrink-0">
                      {equipamento.numero_equipamento}
                    </span>
                    <span className="truncate">{equipamento.localizacao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {erros.length > 0 && localizacoes.length > 0 && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <ul className="text-sm text-amber-800 space-y-0.5">
                {erros.map((erro) => <li key={erro}>{erro}</li>)}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button
              type="submit"
              disabled={erros.length > 0 || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading
                ? "Cadastrando..."
                : `Cadastrar ${previa.length || ""} equipamento${previa.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
