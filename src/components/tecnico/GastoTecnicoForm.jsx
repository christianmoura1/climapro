import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, X, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

export default function GastoTecnicoForm({ user, tecnico, chamados, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    tipo_gasto: "combustivel",
    valor: "",
    data_gasto: new Date().toISOString().split('T')[0],
    descricao: "",
    chamado_id: "",
    comprovante_url: ""
  });

  const [uploadingComprovante, setUploadingComprovante] = useState(false);

  const handleComprovanteUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingComprovante(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, comprovante_url: result.file_url });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({ description: 'Erro ao fazer upload. Tente novamente.', variant: "destructive" });
    } finally {
      setUploadingComprovante(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      empresa_id: user.empresa_id,
      tecnico_id: tecnico.id,
      valor: parseFloat(formData.valor),
      status_aprovacao: 'pendente'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Gasto *</Label>
          <select
            value={formData.tipo_gasto}
            onChange={(e) => setFormData({...formData, tipo_gasto: e.target.value})}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="combustivel">Combustível</option>
            <option value="alimentacao">Alimentação</option>
            <option value="pedagio">Pedágio</option>
            <option value="estacionamento">Estacionamento</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Valor (R$) *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({...formData, valor: e.target.value})}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data *</Label>
          <Input
            type="date"
            value={formData.data_gasto}
            onChange={(e) => setFormData({...formData, data_gasto: e.target.value})}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Chamado Relacionado</Label>
          <select
            value={formData.chamado_id}
            onChange={(e) => setFormData({...formData, chamado_id: e.target.value})}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Selecione (opcional)</option>
            {chamados.map((chamado) => (
              <option key={chamado.id} value={chamado.id}>
                {chamado.numero_chamado} - {chamado.titulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={formData.descricao}
          onChange={(e) => setFormData({...formData, descricao: e.target.value})}
          placeholder="Detalhes do gasto..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Comprovante (Foto/PDF)</Label>
        <div className="border-2 border-dashed border-border rounded-lg p-4">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleComprovanteUpload}
            disabled={uploadingComprovante}
            className="hidden"
            id="comprovante-upload"
          />
          <label
            htmlFor="comprovante-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              {uploadingComprovante ? 'Fazendo upload...' : 
               formData.comprovante_url ? 'Comprovante anexado ✓' : 
               'Clique para anexar comprovante'}
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Registrar Gasto
            </>
          )}
        </Button>
      </div>
    </form>
  );
}