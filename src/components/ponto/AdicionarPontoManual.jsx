import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

const tiposConfig = {
  entrada: { label: "Entrada", icon: "🟢" },
  saida_almoco: { label: "Saída Almoço", icon: "🍽️" },
  retorno: { label: "Retorno", icon: "🟡" },
  saida_final: { label: "Saída Final", icon: "🔴" }
};

export default function AdicionarPontoManual({ isOpen, onClose, tecnicos, empresaId }) {
  const [tecnicoId, setTecnicoId] = useState("");
  const [tipoPonto, setTipoPonto] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const queryClient = useQueryClient();

  const adicionarPontoMutation = useMutation({
    mutationFn: async () => {
      if (!tecnicoId || !tipoPonto || !dataHora) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      // Formatar data com offset de Brasília
      const dataObj = new Date(dataHora);
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const hora = String(dataObj.getHours()).padStart(2, '0');
      const minuto = String(dataObj.getMinutes()).padStart(2, '0');
      const segundo = String(dataObj.getSeconds()).padStart(2, '0');
      const dataComOffset = `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}-03:00`;

      await base44.entities.PontoEletronico.create({
        empresa_id: empresaId,
        tecnico_id: tecnicoId,
        tipo_registro: tipoPonto,
        data_hora: dataComOffset,
        latitude: -23.5505, // Coordenada padrão (São Paulo)
        longitude: -46.6333,
        endereco: "Registro manual pela empresa",
        observacoes: `Registro manual. ${observacoes || ''}`,
        status: 'aprovado_manual'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pontos']);
      toast({ description: "✅ Ponto adicionado com sucesso!", variant: "success" });
      resetForm();
      onClose();
    },
    onError: (error) => {
      console.error("Erro ao adicionar ponto:", error);
      toast({ description: `❌ ${error.message || 'Erro ao adicionar ponto'}`, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setTecnicoId("");
    setTipoPonto("");
    setDataHora("");
    setObservacoes("");
  };

  const handleSubmit = () => {
    adicionarPontoMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Ponto Manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="tecnico">Técnico *</Label>
            <Select value={tecnicoId} onValueChange={setTecnicoId}>
              <SelectTrigger id="tecnico">
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
              <SelectContent>
                {tecnicos.map((tecnico) => (
                  <SelectItem key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tipo">Tipo de Ponto *</Label>
            <Select value={tipoPonto} onValueChange={setTipoPonto}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tiposConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dataHora">Data e Hora *</Label>
            <Input
              id="dataHora"
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Motivo do registro manual..."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ Este ponto será marcado como "registro manual pela empresa"
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={adicionarPontoMutation.isPending || !tecnicoId || !tipoPonto || !dataHora}
          >
            {adicionarPontoMutation.isPending ? "Adicionando..." : "Adicionar Ponto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}