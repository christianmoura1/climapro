import React, { useState, useMemo } from "react";
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

  // Busca os estabelecimentos do cliente selecionado
  const estabelecimentosDoCliente = useMemo(() => {
    const cliente = clientes.find(c => c.id === formData.cliente_id);
    return cliente?.estabelecimentos || [];
  }, [formData.cliente_id, clientes]);

  const handleClienteChange = (clienteId) => {
    setFormData({ ...formData, cliente_id: clienteId, estabelecimento_nome: "" });
  };

  const handleEstabelecimentoChange = (nomeEst) => {
    const cliente = clientes.find(c => c.id === formData.cliente_id);
    const est = cliente?.estabelecimentos?.find(e => e.nome === nomeEst);
    // Preenche automaticamente a localização com o endereço do estabelecimento
    setFormData({
      ...formData,
      estabelecimento_nome: nomeEst,
      localizacao: est ? (formData.localizacao || est.endereco || nomeEst) : formData.localizacao
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
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <select
                value={formData.cliente_id}
                onChange={(e) => handleClienteChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="">Selecione o cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
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
          {estabelecimentosDoCliente.length > 0 && (
            <div className="space-y-2">
              <Label>Estabelecimento</Label>
              <select
                value={formData.estabelecimento_nome || ""}
                onChange={(e) => handleEstabelecimentoChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione o estabelecimento (opcional)</option>
                {estabelecimentosDoCliente.map((est, idx) => (
                  <option key={idx} value={est.nome}>
                    {est.nome}{est.endereco ? ` — ${est.endereco}` : ''}
                  </option>
                ))}
              </select>
              {formData.estabelecimento_nome && (
                <p className="text-xs text-gray-500">
                  📍 Estabelecimento selecionado: <strong>{formData.estabelecimento_nome}</strong>
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
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingPhoto ? 'Enviando...' : 'Selecionar Foto'}
              </label>
              {formData.foto_url && (
                <img
                  src={formData.foto_url}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded border-2 border-gray-200"
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