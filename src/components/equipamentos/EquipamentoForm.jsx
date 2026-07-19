import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, X, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

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
    foto_url: "",
    observacoes: ""
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [estabelecimentosDoCliente, setEstabelecimentosDoCliente] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState(() => {
    if (equipamento?.cliente_id) {
      // será preenchido no useEffect abaixo
      return "";
    }
    return "";
  });
  const [showSugestoes, setShowSugestoes] = useState(false);
  const buscaRef = useRef(null);

  // Preencher nome do cliente quando editando
  useEffect(() => {
    if (formData.cliente_id && clientes.length > 0) {
      const c = clientes.find(cl => cl.id === formData.cliente_id);
      if (c) setBuscaCliente(c.nome);
    }
  }, [clientes]);

  const clientesFiltrados = buscaCliente.trim().length === 0
    ? clientes
    : clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()));

  const handleSelecionarCliente = (cliente) => {
    handleClienteChange(cliente.id);
    setBuscaCliente(cliente.nome);
    setShowSugestoes(false);
  };

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, foto_url: result.file_url });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="mb-8 shadow-lg border-none">
      <CardHeader>
        <CardTitle>{equipamento ? 'Editar Equipamento' : 'Novo Equipamento'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2" ref={buscaRef}>
              <Label>Cliente *</Label>
              <div className="relative">
                <Input
                  value={buscaCliente}
                  onChange={(e) => {
                    setBuscaCliente(e.target.value);
                    setShowSugestoes(true);
                    if (!e.target.value) handleClienteChange("");
                  }}
                  onFocus={() => setShowSugestoes(true)}
                  onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
                  placeholder="Digite para buscar cliente..."
                  required={!formData.cliente_id}
                />
                {showSugestoes && clientesFiltrados.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.id}
                        className={`px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 ${formData.cliente_id === cliente.id ? 'bg-blue-100 font-semibold' : ''}`}
                        onMouseDown={() => handleSelecionarCliente(cliente)}
                      >
                        {cliente.nome}
                      </div>
                    ))}
                  </div>
                )}
                {showSugestoes && buscaCliente.trim().length > 0 && clientesFiltrados.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>
              {/* campo hidden para garantir validação */}
              <input type="hidden" value={formData.cliente_id} required />
            </div>

            <div className="space-y-2">
              <Label>Número do Equipamento *</Label>
              <Input
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
              <Label>Estabelecimento</Label>
              {estabelecimentosDoCliente.length > 0 ? (
                <select
                  value={formData.estabelecimento_nome || ""}
                  onChange={(e) => handleEstabelecimentoChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <Label>Tipo de Equipamento *</Label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <Label>Marca *</Label>
              <Input
                value={formData.marca}
                onChange={(e) => setFormData({...formData, marca: e.target.value})}
                placeholder="Ex: Carrier"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Modelo *</Label>
              <Input
                value={formData.modelo}
                onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                placeholder="Ex: 42BQA018515LS"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Capacidade</Label>
              <Input
                value={formData.capacidade}
                onChange={(e) => setFormData({...formData, capacidade: e.target.value})}
                placeholder="Ex: 18.000 BTUs"
              />
            </div>

            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                value={formData.localizacao}
                onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                placeholder="Ex: Sala 203"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Instalação</Label>
              <Input
                type="date"
                value={formData.data_instalacao}
                onChange={(e) => setFormData({...formData, data_instalacao: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Número de Série</Label>
              <Input
                value={formData.numero_serie}
                onChange={(e) => setFormData({...formData, numero_serie: e.target.value})}
                placeholder="Ex: ABC123XYZ"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foto do Equipamento</Label>
            <div className="flex gap-4 items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
                id="foto-upload"
              />
              <label
                htmlFor="foto-upload"
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-muted"
              >
                <Upload className="w-4 h-4" />
                {uploadingPhoto ? 'Enviando...' : 'Selecionar Foto'}
              </label>
              {formData.foto_url && (
                <img
                  src={formData.foto_url}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded border-2 border-border"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Informações adicionais sobre o equipamento"
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
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