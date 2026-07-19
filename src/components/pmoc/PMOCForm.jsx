import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus, Trash2, CheckSquare, AlertCircle } from "lucide-react";

// Checklists padrão por periodicidade
const CHECKLISTS_PADRAO = {
  mensal: [
    { descricao: "Limpeza de filtros", concluido: false },
    { descricao: "Verificação de gás refrigerante", concluido: false },
    { descricao: "Inspeção elétrica", concluido: false },
    { descricao: "Verificação de drenos", concluido: false },
    { descricao: "Teste de funcionamento", concluido: false }
  ],
  bimestral: [
    { descricao: "Limpeza de filtros", concluido: false },
    { descricao: "Verificação de gás refrigerante", concluido: false },
    { descricao: "Inspeção elétrica", concluido: false },
    { descricao: "Verificação de drenos", concluido: false },
    { descricao: "Medição de amperagem", concluido: false },
    { descricao: "Teste de funcionamento", concluido: false }
  ],
  trimestral: [
    { descricao: "Limpeza de filtros", concluido: false },
    { descricao: "Verificação de gás refrigerante", concluido: false },
    { descricao: "Inspeção elétrica completa", concluido: false },
    { descricao: "Verificação de drenos", concluido: false },
    { descricao: "Medição de amperagem", concluido: false },
    { descricao: "Verificação de pressões do sistema", concluido: false },
    { descricao: "Limpeza de condensador", concluido: false },
    { descricao: "Teste de funcionamento", concluido: false }
  ],
  semestral: [
    { descricao: "Limpeza completa de filtros", concluido: false },
    { descricao: "Verificação e carga de gás refrigerante", concluido: false },
    { descricao: "Inspeção elétrica detalhada", concluido: false },
    { descricao: "Limpeza completa de drenos", concluido: false },
    { descricao: "Medição de amperagem e tensão", concluido: false },
    { descricao: "Verificação de pressões do sistema", concluido: false },
    { descricao: "Limpeza de evaporadora e condensadora", concluido: false },
    { descricao: "Lubrificação de motores", concluido: false },
    { descricao: "Verificação de isolamento térmico", concluido: false },
    { descricao: "Teste completo de funcionamento", concluido: false }
  ],
  anual: [
    { descricao: "Limpeza completa de todos os componentes", concluido: false },
    { descricao: "Verificação e carga de gás refrigerante", concluido: false },
    { descricao: "Inspeção elétrica completa com teste de isolação", concluido: false },
    { descricao: "Limpeza e desinfecção de drenos", concluido: false },
    { descricao: "Medição de amperagem, tensão e resistência", concluido: false },
    { descricao: "Verificação completa de pressões", concluido: false },
    { descricao: "Limpeza profunda de evaporadora e condensadora", concluido: false },
    { descricao: "Lubrificação de todos os componentes móveis", concluido: false },
    { descricao: "Verificação completa de isolamento térmico", concluido: false },
    { descricao: "Teste de vazamentos", concluido: false },
    { descricao: "Verificação de dispositivos de segurança", concluido: false },
    { descricao: "Emissão de laudo técnico", concluido: false },
    { descricao: "Teste completo de funcionamento", concluido: false }
  ]
};

export default function PMOCForm({ pmoc, clientes, tecnicos, equipamentos, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(pmoc || {
    cliente_id: "",
    tecnico_responsavel_id: "",
    equipamentos_ids: [],
    periodicidade: "mensal",
    data_inicio: new Date().toISOString().split('T')[0],
    status: "aguardando_execucao",
    atividades: CHECKLISTS_PADRAO.mensal,
    observacoes: ""
  });

  const [checklistAlterado, setChecklistAlterado] = useState(false);

  // Atualizar checklist quando periodicidade mudar
  useEffect(() => {
    if (!pmoc && !checklistAlterado) {
      // Só atualiza automaticamente se não estiver editando e o checklist não foi alterado manualmente
      const checklistPadrao = CHECKLISTS_PADRAO[formData.periodicidade] || CHECKLISTS_PADRAO.mensal;
      setFormData(prev => ({
        ...prev,
        atividades: [...checklistPadrao]
      }));
    }
  }, [formData.periodicidade, pmoc, checklistAlterado]);

  const handlePeriodicidadeChange = (novaPeriodicidade) => {
    if (checklistAlterado) {
      const confirmar = window.confirm(
        "⚠️ Você fez alterações no checklist.\n\nAo mudar a periodicidade, o checklist será substituído pelo padrão.\n\nDeseja continuar?"
      );
      if (!confirmar) return;
    }

    const checklistPadrao = CHECKLISTS_PADRAO[novaPeriodicidade] || CHECKLISTS_PADRAO.mensal;
    setFormData({
      ...formData,
      periodicidade: novaPeriodicidade,
      atividades: [...checklistPadrao]
    });
    setChecklistAlterado(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addAtividade = () => {
    setFormData({
      ...formData,
      atividades: [...formData.atividades, { descricao: "", concluido: false }]
    });
    setChecklistAlterado(true);
  };

  const updateAtividade = (index, field, value) => {
    const newAtividades = [...formData.atividades];
    newAtividades[index][field] = value;
    setFormData({ ...formData, atividades: newAtividades });
    setChecklistAlterado(true);
  };

  const removeAtividade = (index) => {
    const newAtividades = formData.atividades.filter((_, i) => i !== index);
    setFormData({ ...formData, atividades: newAtividades });
    setChecklistAlterado(true);
  };

  const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id);
  const equipamentosCliente = equipamentos.filter(e => e.cliente_id === formData.cliente_id);

  const handleEquipamentoToggle = (equipamentoId) => {
    const equipamentosAtuais = Array.isArray(formData.equipamentos_ids) ? formData.equipamentos_ids : [];
    
    if (equipamentosAtuais.includes(equipamentoId)) {
      setFormData({
        ...formData,
        equipamentos_ids: equipamentosAtuais.filter(id => id !== equipamentoId)
      });
    } else {
      setFormData({
        ...formData,
        equipamentos_ids: [...equipamentosAtuais, equipamentoId]
      });
    }
  };

  const handleSelecionarTodos = (e) => {
    e.preventDefault();
    
    const equipamentosAtuais = Array.isArray(formData.equipamentos_ids) ? formData.equipamentos_ids : [];
    const todosIds = equipamentosCliente.map(eq => eq.id);
    const todosJaSelecionados = todosIds.length > 0 && todosIds.every(id => equipamentosAtuais.includes(id));
    
    setFormData({ 
      ...formData, 
      equipamentos_ids: todosJaSelecionados ? [] : todosIds 
    });
  };

  const restaurarChecklistPadrao = () => {
    if (window.confirm("⚠️ Deseja restaurar o checklist padrão?\n\nTodas as alterações feitas serão perdidas.")) {
      const checklistPadrao = CHECKLISTS_PADRAO[formData.periodicidade] || CHECKLISTS_PADRAO.mensal;
      setFormData({
        ...formData,
        atividades: [...checklistPadrao]
      });
      setChecklistAlterado(false);
    }
  };

  return (
    <Card className="mb-8 shadow-lg border-none">
      <CardHeader>
        <CardTitle>{pmoc ? 'Editar PMOC' : 'Novo PMOC'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Cliente e Técnico */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <select
                value={formData.cliente_id}
                onChange={(e) => setFormData({...formData, cliente_id: e.target.value, equipamentos_ids: []})}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione o cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {clienteSelecionado && (
                <p className="text-sm text-muted-foreground">
                  {clienteSelecionado.endereco}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Técnico Responsável</Label>
              <select
                value={formData.tecnico_responsavel_id}
                onChange={(e) => setFormData({...formData, tecnico_responsavel_id: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione o técnico</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome} - {tecnico.especialidade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seleção de Equipamentos */}
          {formData.cliente_id && equipamentosCliente.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base">Equipamentos *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelecionarTodos}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {(Array.isArray(formData.equipamentos_ids) ? formData.equipamentos_ids : []).length === equipamentosCliente.length 
                    ? 'Desmarcar Todos' 
                    : 'Selecionar Todos'}
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-3 bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
                {equipamentosCliente.map((equipamento) => {
                  const equipamentosAtuais = Array.isArray(formData.equipamentos_ids) ? formData.equipamentos_ids : [];
                  const isSelected = equipamentosAtuais.includes(equipamento.id);
                  
                  return (
                    <div
                      key={equipamento.id}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-white border-2 border-border hover:border-blue-300'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleEquipamentoToggle(equipamento.id)}
                        className="mt-1"
                      />
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleEquipamentoToggle(equipamento.id)}
                      >
                        <p className="font-semibold text-sm text-foreground truncate">
                          {equipamento.numero_equipamento}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {equipamento.marca} {equipamento.modelo}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {equipamento.tipo.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                {(Array.isArray(formData.equipamentos_ids) ? formData.equipamentos_ids : []).length} equipamento(s) selecionado(s)
              </p>
            </div>
          )}

          {formData.cliente_id && equipamentosCliente.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Este cliente não possui equipamentos cadastrados. Cadastre equipamentos antes de criar o PMOC.
              </p>
            </div>
          )}

          {/* Periodicidade e Data */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Periodicidade *</Label>
              <select
                value={formData.periodicidade}
                onChange={(e) => handlePeriodicidadeChange(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="mensal">Mensal</option>
                <option value="bimestral">Bimestral</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Data de Início *</Label>
              <Input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="aguardando_execucao">Aguardando execução</option>
                <option value="em_execucao">Em execução</option>
                <option value="pausado">Pausado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Checklist de Atividades */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-base">Checklist de Manutenção ({formData.periodicidade})</Label>
                {checklistAlterado && (
                  <div className="flex items-center gap-2 mt-1">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-orange-600">Checklist personalizado</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {checklistAlterado && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={restaurarChecklistPadrao}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    Restaurar Padrão
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addAtividade}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Atividade
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 bg-muted p-4 rounded-lg">
              {formData.atividades.map((atividade, index) => (
                <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                  <Checkbox
                    checked={atividade.concluido}
                    onCheckedChange={(checked) => updateAtividade(index, 'concluido', checked)}
                  />
                  <Input
                    value={atividade.descricao}
                    onChange={(e) => updateAtividade(index, 'descricao', e.target.value)}
                    placeholder="Descrição da atividade"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAtividade(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {formData.atividades.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p>Nenhuma atividade no checklist</p>
                  <p className="text-sm mt-1">Clique em "Adicionar Atividade" para começar</p>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Informações adicionais sobre o PMOC..."
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" />
            Salvar PMOC
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}