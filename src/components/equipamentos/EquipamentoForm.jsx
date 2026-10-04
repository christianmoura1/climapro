import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, X, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { SelectBuscavel } from "@/components/ui/select-buscavel";
import { BotaoUpload } from "@/components/ui/botao-upload";

const MAX_FOTOS = 4;

export default function EquipamentoForm({ equipamento, clientes, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(equipamento || {
    cliente_id: "",
    numero_equipamento: "",
    tipo: "ar_condicionado",
    marca: "",
    modelo: "",
    capacidade: "",
    localizacao: "",
    estabelecimento_nome: "",
    data_instalacao: "",
    numero_serie: "",
    fotos_urls: [],
    observacoes: "",
    periodicidade_pmoc: "",
    pmoc_ativo: false
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [estabelecimentosDoCliente, setEstabelecimentosDoCliente] = useState([]);

  // Busca os estabelecimentos do cliente selecionado — tenta via lista local, senão busca via SDK
  useEffect(() => {
    if (!formData.cliente_id) {
      setEstabelecimentosDoCliente([]);
      return;
    }
    const clienteLocal = clientes.find(c => c.id === formData.cliente_id);
    if (clienteLocal?.estabelecimentos?.length > 0) {
      setEstabelecimentosDoCliente(clienteLocal.estabelecimentos);
    } else {
      // Busca direto no banco para garantir dados completos (útil na edição)
      base44.entities.Cliente.filter({ id: formData.cliente_id }).then((result) => {
        const c = result[0];
        setEstabelecimentosDoCliente(c?.estabelecimentos || []);
      }).catch(() => setEstabelecimentosDoCliente([]));
    }
  }, [formData.cliente_id, clientes]);

  const handleClienteChange = (clienteId) => {
    setFormData({ ...formData, cliente_id: clienteId, estabelecimento_nome: "" });
  };

  const handleEstabelecimentoChange = (nomeEst) => {
    const est = estabelecimentosDoCliente.find(e => e.nome === nomeEst);
    setFormData({
      ...formData,
      estabelecimento_nome: nomeEst,
      localizacao: est?.endereco ? est.endereco : formData.localizacao
    });
  };

  // Equipamento antigo tem só `foto_url`; o novo tem o array. A tela trabalha
  // sempre com o array e o gatilho no banco mantém `foto_url` igual à primeira.
  const fotos = formData.fotos_urls?.length
    ? formData.fotos_urls
    : (formData.foto_url ? [formData.foto_url] : []);

  const handlePhotoUpload = async (arquivos) => {
    const lista = Array.isArray(arquivos) ? arquivos : [arquivos];
    const vagas = MAX_FOTOS - fotos.length;
    if (vagas <= 0) return;

    if (lista.length > vagas) {
      toast({
        description: `Dá para anexar ${MAX_FOTOS} fotos no total. Vou subir as ${vagas} primeiras.`,
        variant: "default",
      });
    }

    setUploadingPhoto(true);
    try {
      // Sequencial: o upload vai para o Storage do Supabase e disparar quatro
      // de uma vez no 4G do celular do técnico costuma dar timeout.
      const novas = [];
      for (const arquivo of lista.slice(0, vagas)) {
        const result = await base44.integrations.Core.UploadFile({ file: arquivo });
        novas.push(result.file_url);
      }
      setFormData((atual) => ({ ...atual, fotos_urls: [...fotos, ...novas] }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({ description: 'Erro ao fazer upload. Tente novamente.', variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removerFoto = (indice) => {
    setFormData((atual) => ({ ...atual, fotos_urls: fotos.filter((_, i) => i !== indice) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // foto_url vai explícito junto do array. Sem isso, apagar todas as fotos
    // não funcionaria: o payload ainda levaria o foto_url antigo da linha, e o
    // gatilho do banco ressuscitaria a foto a partir dele.
    onSubmit({ ...formData, fotos_urls: fotos, foto_url: fotos[0] || null });
  };

  return (
    <Card className="mb-8 shadow-lg border-none">
      <CardHeader>
        <CardTitle>{equipamento ? 'Editar Equipamento' : 'Novo Equipamento'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipamento-cliente">Cliente *</Label>
              <SelectBuscavel
                id="equipamento-cliente"
                itens={clientes.map((c) => ({ valor: c.id, rotulo: c.nome, secundario: c.endereco }))}
                valor={formData.cliente_id}
                onChange={handleClienteChange}
                placeholder="Selecione um cliente"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero-equipamento">Número do equipamento *</Label>
              <Input
                id="numero-equipamento"
                value={formData.numero_equipamento}
                onChange={(e) => setFormData({...formData, numero_equipamento: e.target.value})}
                placeholder="Ex: EQ-001"
                required
              />
            </div>
          </div>

          {/* Estabelecimento do cliente */}
          {formData.cliente_id && (
            <div className="space-y-2">
              <Label htmlFor="equipamento-estabelecimento">Estabelecimento</Label>
              {estabelecimentosDoCliente.length > 0 ? (
                <select
                  id="equipamento-estabelecimento"
                  value={formData.estabelecimento_nome || ""}
                  onChange={(e) => handleEstabelecimentoChange(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">— Selecione o estabelecimento (opcional) —</option>
                  {estabelecimentosDoCliente.map((est, idx) => (
                    <option key={idx} value={est.nome}>
                      {est.nome}{est.endereco ? ` — ${est.endereco}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground italic">Este cliente não possui estabelecimentos cadastrados. Cadastre na aba Clientes.</p>
              )}
              {formData.estabelecimento_nome && (
                <p className="text-xs text-indigo-600 font-medium">
                  📍 Vinculado a: <strong>{formData.estabelecimento_nome}</strong>
                </p>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo-equipamento">Tipo de equipamento *</Label>
              <select
                value={formData.tipo}
                id="tipo-equipamento"
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="ar_condicionado">Ar Condicionado</option>
                <option value="camara_fria">Câmara Fria</option>
                <option value="geladeira">Geladeira</option>
                <option value="freezer">Freezer</option>
                <option value="chiller">Chiller</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marca-equipamento">Marca *</Label>
              <Input
                id="marca-equipamento"
                value={formData.marca}
                onChange={(e) => setFormData({...formData, marca: e.target.value})}
                placeholder="Ex: Carrier"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo-equipamento">Modelo</Label>
              <Input
                id="modelo-equipamento"
                value={formData.modelo || ""}
                onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                placeholder="Ex: 42BQA018515LS"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacidade-equipamento">Capacidade</Label>
              <Input
                id="capacidade-equipamento"
                value={formData.capacidade}
                onChange={(e) => setFormData({...formData, capacidade: e.target.value})}
                placeholder="Ex: 18.000 BTUs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="localizacao-equipamento">Localização</Label>
              <Input
                id="localizacao-equipamento"
                value={formData.localizacao}
                onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                placeholder="Ex: Sala 203"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data-instalacao-equipamento">Data de instalação</Label>
              <Input
                id="data-instalacao-equipamento"
                type="date"
                value={formData.data_instalacao}
                onChange={(e) => setFormData({...formData, data_instalacao: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serie-equipamento">Número de série</Label>
              <Input
                id="serie-equipamento"
                value={formData.numero_serie}
                onChange={(e) => setFormData({...formData, numero_serie: e.target.value})}
                placeholder="Ex: ABC123XYZ"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="space-y-1">
              <Label htmlFor="pmoc-ativo">Incluir no PMOC</Label>
              <p id="pmoc-ativo-ajuda" className="text-xs text-muted-foreground">
                Todo equipamento no PMOC recebe checagem mensal básica (filtros, inspeção, drenos).
                A periodicidade do ciclo profundo (troca de gás, teste elétrico completo, etc.) se
                define depois, no Plano Anual de cada cliente — não precisa escolher aqui.
              </p>
            </div>
            <Switch
              id="pmoc-ativo"
              checked={!!formData.pmoc_ativo}
              aria-describedby="pmoc-ativo-ajuda"
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  pmoc_ativo: checked,
                  periodicidade_pmoc: checked ? (formData.periodicidade_pmoc || 'mensal') : formData.periodicidade_pmoc,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="foto-upload">Fotos do equipamento</Label>
            <div className="flex flex-wrap items-center gap-3">
              <BotaoUpload
                id="foto-upload"
                onArquivos={handlePhotoUpload}
                multiple
                disabled={uploadingPhoto || fotos.length >= MAX_FOTOS}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingPhoto ? 'Enviando...' : fotos.length ? 'Adicionar foto' : 'Selecionar fotos'}
              </BotaoUpload>

              {fotos.map((url, indice) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt={`Foto ${indice + 1} do equipamento`}
                    className="w-20 h-20 object-cover rounded border-2 border-border"
                  />
                  {indice === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 rounded-b bg-black/60 text-[10px] text-white text-center">
                      principal
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removerFoto(indice)}
                    aria-label={`Remover foto ${indice + 1}`}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Até {MAX_FOTOS} fotos. A primeira é a que aparece na lista e no portal do cliente.
              {fotos.length > 0 && ` ${fotos.length} de ${MAX_FOTOS}.`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes-equipamento">Observações</Label>
            <Textarea
              id="observacoes-equipamento"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Informações adicionais sobre o equipamento"
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}