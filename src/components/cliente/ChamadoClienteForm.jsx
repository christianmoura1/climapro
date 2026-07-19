import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Upload, Cpu } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";

export default function ChamadoClienteForm({ equipamentos = [], onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    local: "",
    equipamento_id: "",
    tipo_problema: "manutencao_corretiva",
    prioridade: "media",
    fotos_anexos: []
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [estabelecimentoSelecionado, setEstabelecimentoSelecionado] = useState("");

  // Obter lista única de estabelecimentos dos equipamentos
  const estabelecimentos = [...new Set(equipamentos.filter(e => e.estabelecimento_nome).map(e => e.estabelecimento_nome))];
  const temEstabelecimentos = estabelecimentos.length > 0;

  // Filtrar equipamentos pelo estabelecimento selecionado
  const equipamentosFiltrados = temEstabelecimentos && estabelecimentoSelecionado
    ? equipamentos.filter(e => e.estabelecimento_nome === estabelecimentoSelecionado)
    : equipamentos;

  const handleEstabelecimentoChange = (nome) => {
    setEstabelecimentoSelecionado(nome);
    // Limpar equipamento selecionado ao trocar estabelecimento
    setFormData(prev => ({ ...prev, equipamento_id: "", local: "" }));
  };

  // Quando selecionar um equipamento, preencher o local automaticamente
  const handleEquipamentoChange = (equipamentoId) => {
    const equipamento = equipamentos.find(e => e.id === equipamentoId);
    setFormData({
      ...formData,
      equipamento_id: equipamentoId,
      local: equipamento?.localizacao || ""
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const newPhotos = [...(formData.fotos_anexos || []), result.file_url];
      setFormData({ ...formData, fotos_anexos: newPhotos });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index) => {
    const newPhotos = formData.fotos_anexos.filter((_, i) => i !== index);
    setFormData({ ...formData, fotos_anexos: newPhotos });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const equipamentoSelecionado = equipamentos.find(e => e.id === formData.equipamento_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título do Problema *</Label>
        <Input
          value={formData.titulo}
          onChange={(e) => setFormData({...formData, titulo: e.target.value})}
          placeholder="Ex: Ar condicionado não está gelando"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição Detalhada *</Label>
        <Textarea
          value={formData.descricao}
          onChange={(e) => setFormData({...formData, descricao: e.target.value})}
          placeholder="Descreva o problema com o máximo de detalhes possível..."
          rows={4}
          required
        />
      </div>

      {/* Seleção de Estabelecimento + Equipamento */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-muted-foreground" />
          <Label>Equipamento com Problema *</Label>
        </div>
        {equipamentos.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Você ainda não possui equipamentos cadastrados.
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Entre em contato com a empresa para cadastrar seus equipamentos.
            </p>
          </div>
        ) : (
          <>
            {/* Seleção de Estabelecimento */}
            {temEstabelecimentos && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">1. Selecione o Estabelecimento</Label>
                <div className="flex flex-wrap gap-2">
                  {estabelecimentos.map((nome) => (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => handleEstabelecimentoChange(nome)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        estabelecimentoSelecionado === nome
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      📍 {nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Seleção de Equipamento */}
            {(!temEstabelecimentos || estabelecimentoSelecionado) && (
              <div className="space-y-1">
                {temEstabelecimentos && <Label className="text-xs text-muted-foreground">2. Selecione o Equipamento</Label>}
                <select
                  value={formData.equipamento_id}
                  onChange={(e) => handleEquipamentoChange(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione o equipamento</option>
                  {equipamentosFiltrados.map((equipamento) => (
                    <option key={equipamento.id} value={equipamento.id}>
                      {equipamento.numero_equipamento || `${equipamento.tipo} ${equipamento.marca} ${equipamento.modelo}`} - {equipamento.localizacao}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {temEstabelecimentos && !estabelecimentoSelecionado && (
              <p className="text-xs text-muted-foreground italic">👆 Selecione um estabelecimento para ver os equipamentos disponíveis.</p>
            )}

            {/* Mostrar detalhes do equipamento selecionado */}
            {equipamentoSelecionado && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      {equipamentoSelecionado.marca} {equipamentoSelecionado.modelo}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {equipamentoSelecionado.tipo.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {equipamentoSelecionado.capacidade}
                      </Badge>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      📍 {equipamentoSelecionado.localizacao}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Local (agora preenchido automaticamente) */}
      <div className="space-y-2">
        <Label>Local do Equipamento</Label>
        <Input
          value={formData.local}
          onChange={(e) => setFormData({...formData, local: e.target.value})}
          placeholder="Preencha automaticamente ao selecionar equipamento"
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          💡 Preenchido automaticamente ao selecionar o equipamento
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Problema</Label>
          <Select
            value={formData.tipo_problema}
            onValueChange={(value) => setFormData({...formData, tipo_problema: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manutencao_corretiva">Manutenção Corretiva</SelectItem>
              <SelectItem value="emergencia">Emergência</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Urgência</Label>
          <Select
            value={formData.prioridade}
            onValueChange={(value) => setFormData({...formData, prioridade: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fotos do Problema (Opcional)</Label>
        <div className="border-2 border-dashed border-border rounded-lg p-4">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
            className="hidden"
            id="photo-upload-cliente"
          />
          <label
            htmlFor="photo-upload-cliente"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              {uploadingPhoto ? 'Fazendo upload...' : 'Clique para adicionar fotos'}
            </span>
          </label>
        </div>

        {formData.fotos_anexos.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3">
            {formData.fotos_anexos.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border-2 border-border"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="bg-blue-600 hover:bg-blue-700" 
          disabled={isLoading || equipamentos.length === 0}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enviando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Abrir Chamado
            </>
          )}
        </Button>
      </div>
    </form>
  );
}