
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeft, Plus, Ban, CheckCircle, UserCog, DollarSign } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { useEmpresa } from "@/hooks/useEmpresa";


export default function GerenciarTecnicosPage() {
  const { atingiuLimite } = useEmpresa();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState(null); // New state for editing
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    especialidade: "ambos",
    tem_acesso_sistema: false,
    senha: "",
    confirmar_senha: ""
  });

  const [showAdicionarSaldoDialog, setShowAdicionarSaldoDialog] = useState(false);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState(null);
  const [creditoForm, setCreditoForm] = useState({
    valor: "",
    descricao: "",
    tipo: "adiantamento"
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      
      // Apenas admin_empresa pode acessar
      if (currentUser.tipo_usuario === 'tecnico') {
        navigate(createPageUrl("TecnicoDashboard"));
        return;
      }
      
      setUser(currentUser);
    };
    loadUser();
  }, [navigate]);

  // Query to fetch company details for email content
  const { data: empresa } = useQuery({
    queryKey: ['empresa', user?.empresa_id],
    queryFn: async () => {
      const empresas = await base44.entities.Empresa.list();
      return empresas.find(e => e.id === user.empresa_id);
    },
    enabled: !!user?.empresa_id,
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos', user?.empresa_id],
    queryFn: async () => {
      if (!user) return [];
      if ((user.role === 'admin' && !user.empresa_id)) {
        return base44.entities.Tecnico.list();
      }
      return base44.entities.Tecnico.filter({ empresa_id: user.empresa_id });
    },
    enabled: !!user
  });

  const createTecnicoMutation = useMutation({
    mutationFn: async (data) => {
      if (!empresa) {
        throw new Error("Detalhes da empresa não disponíveis. Tente novamente.");
      }

      // Limite do plano. A verificação fica aqui, no caminho por onde todo
      // cadastro passa, e não só no botão — esconder o botão não impede nada.
      if (atingiuLimite('limite_tecnicos', tecnicos.length)) {
        throw new Error(
          `Seu plano permite ${empresa.limite_tecnicos} técnico(s) e você já cadastrou ${tecnicos.length}. `
          + `Suba de plano ou contrate um técnico adicional em Planos.`
        );
      }

      // Criar técnico
      const tecnico = await base44.entities.Tecnico.create({
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        especialidade: data.especialidade,
        empresa_id: user.empresa_id,
        status: 'ativo',
        total_atendimentos: 0
      });
      
      if (data.tem_acesso_sistema) {
        try {
          await base44.integrations.Core.GerenciarAcessoTecnico({
            tecnico_id: tecnico.id,
            password: data.senha
          });
        } catch (error) {
          await base44.entities.Tecnico.delete(tecnico.id).catch(() => undefined);
          throw new Error(`Não foi possível criar o acesso do técnico: ${error.message}`);
        }
      }

      return { tecnico, temAcesso: data.tem_acesso_sistema };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['tecnicos']);
      setShowForm(false);
      setEditingTecnico(null); // Reset editing state
      setFormData({ 
        nome: "", 
        email: "", 
        telefone: "", 
        cpf: "", 
        especialidade: "ambos",
        tem_acesso_sistema: false,
        senha: "",
        confirmar_senha: ""
      });
      
      if (data.temAcesso) {
        toast({
          description: `Técnico criado com acesso ao sistema. Login: ${data.tecnico.email}`,
          variant: "success"
        });
      } else {
        toast({ description: "Técnico criado com sucesso!", variant: "default" });
      }
    },
    onError: (error) => {
      console.error("Erro ao criar técnico:", error);
      toast({ description: `Erro ao criar técnico: ${error.message}`, variant: "destructive" });
    }
  });

  const updateTecnicoMutation = useMutation({
    mutationFn: async ({ id, data, senha }) => {
      const tecnico = await base44.entities.Tecnico.update(id, data);
      if (senha) {
        await base44.integrations.Core.GerenciarAcessoTecnico({
          tecnico_id: id,
          password: senha
        });
      }
      return { tecnico, senhaAtualizada: !!senha };
    },
    onSuccess: ({ senhaAtualizada }) => {
      queryClient.invalidateQueries(['tecnicos']);
      setShowForm(false);
      setEditingTecnico(null);
      setFormData({
        nome: "",
        email: "",
        telefone: "",
        cpf: "",
        especialidade: "ambos",
        tem_acesso_sistema: false,
        senha: "",
        confirmar_senha: ""
      });
      toast({
        description: senhaAtualizada
          ? "Técnico e senha de acesso atualizados com sucesso!"
          : "Técnico atualizado com sucesso!",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar técnico:", error);
      toast({ description: `Erro ao atualizar técnico: ${error.message}`, variant: "destructive" });
    }
  });

  const deleteTecnicoMutation = useMutation({
    mutationFn: (id) => base44.entities.Tecnico.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tecnicos']);
      toast({ description: "Técnico excluído com sucesso!", variant: "default" });
    },
    onError: (error) => {
      console.error("Erro ao excluir técnico:", error);
      toast({ description: `Erro ao excluir técnico: ${error.message}`, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Tecnico.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tecnicos']);
    }
  });

  const adicionarSaldoMutation = useMutation({
    mutationFn: async ({ tecnicoId, data }) => {
      const credito = await base44.entities.CreditoTecnico.create({
        empresa_id: user.empresa_id,
        tecnico_id: tecnicoId,
        valor: parseFloat(data.valor),
        descricao: data.descricao,
        tipo: data.tipo,
        status: 'pendente',
        data_envio: new Date().toISOString(),
        origem: 'empresa',
        enviado_por_email: user.email
      });

      return { credito, tecnicoId };
    },
    onSuccess: async ({ credito, tecnicoId }) => {
      queryClient.invalidateQueries(['tecnicos']);
      setShowAdicionarSaldoDialog(false);
      setTecnicoSelecionado(null);
      setCreditoForm({
        valor: "",
        descricao: "",
        tipo: "adiantamento"
      });

      // Enviar notificações
      try {
        const tecnico = tecnicos.find(t => t.id === tecnicoId);
        
        // Email
        if (tecnico?.email) {
          await base44.integrations.Core.SendEmail({
            to: tecnico.email,
            subject: "💰 Novo Crédito Pendente - ClimaPro",
            body: `Olá ${tecnico.nome},

A empresa enviou um novo crédito para você!

💰 DETALHES DO CRÉDITO:

Valor: R$ ${parseFloat(credito.valor).toFixed(2)}
Tipo: ${credito.tipo}
Descrição: ${credito.descricao}
Data: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}

⚠️ IMPORTANTE: Este valor só será creditado após sua aprovação!

📱 Acesse seu painel para aprovar ou rejeitar:
https://geradordepmoc.com.br/TecnicoDashboard

Aba: Controle Financeiro → Créditos Pendentes

Atenciosamente,
${empresa?.nome || 'ClimaPro'}`
          });
        }

        // WhatsApp
        if (tecnico?.telefone) {
          const telefone = tecnico.telefone.replace(/\D/g, '');
          const mensagem = `💰 *NOVO CRÉDITO PENDENTE*

A empresa ${empresa?.nome || 'ClimaPro'} enviou um crédito de:

💵 R$ ${parseFloat(credito.valor).toFixed(2)}

📝 Motivo: ${credito.descricao}

⚠️ *AÇÃO NECESSÁRIA:*
Acesse seu painel para aprovar ou rejeitar:
https://geradordepmoc.com.br/TecnicoDashboard

O valor só será creditado após sua aprovação!`;

          const whatsappUrl = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
          window.open(whatsappUrl, '_blank');
        }
      } catch (error) {
        console.error("Erro ao enviar notificações:", error);
      }

      alert(`✅ Crédito enviado com sucesso!

💰 Valor: R$ ${parseFloat(credito.valor).toFixed(2)}
👤 Técnico: ${tecnicos.find(t => t.id === tecnicoId)?.nome}

${tecnicos.find(t => t.id === tecnicoId)?.telefone ? '📱 WhatsApp foi aberto com a mensagem pronta.' : '📧 Notificação enviada por email.'}`);
    },
    onError: (error) => {
      console.error("Erro ao adicionar saldo:", error);
      toast({ description: `❌ Erro ao enviar crédito: ${error.message}`, variant: "destructive" });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const deveConfigurarSenha = editingTecnico ? !!formData.senha : formData.tem_acesso_sistema;
    if (deveConfigurarSenha && formData.senha.length < 8) {
      toast({ description: "A senha deve ter pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (deveConfigurarSenha && formData.senha !== formData.confirmar_senha) {
      toast({ description: "A confirmação da senha não confere.", variant: "destructive" });
      return;
    }

    if (editingTecnico) {
      updateTecnicoMutation.mutate({
        id: editingTecnico.id,
        data: {
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          especialidade: formData.especialidade
        },
        senha: formData.senha
      });
    } else {
      createTecnicoMutation.mutate(formData);
    }
  };

  const handleEdit = (tecnico) => {
    setEditingTecnico(tecnico);
    setFormData({
      nome: tecnico.nome,
      email: tecnico.email,
      telefone: tecnico.telefone,
      cpf: "", // CPF is not usually editable after creation
      especialidade: tecnico.especialidade,
      tem_acesso_sistema: false,
      senha: "",
      confirmar_senha: ""
    });
    setShowForm(true);
  };

  const handleDelete = (tecnico) => {
    if (confirm(`Tem certeza que deseja excluir o técnico ${tecnico.nome}?`)) {
      deleteTecnicoMutation.mutate(tecnico.id);
    }
  };

  const handleAdicionarSaldo = (tecnico) => {
    setTecnicoSelecionado(tecnico);
    setCreditoForm({
      valor: "",
      descricao: "",
      tipo: "adiantamento"
    });
    setShowAdicionarSaldoDialog(true);
  };

  const handleSubmitCredito = (e) => {
    e.preventDefault();
    
    if (!creditoForm.valor || parseFloat(creditoForm.valor) <= 0) {
      toast({ description: "⚠️ Por favor, informe um valor válido.", variant: "warning" });
      return;
    }

    if (!creditoForm.descricao) {
      toast({ description: "⚠️ Por favor, informe uma descrição/motivo.", variant: "warning" });
      return;
    }

    adicionarSaldoMutation.mutate({
      tecnicoId: tecnicoSelecionado.id,
      data: creditoForm
    });
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gerenciar Técnicos</h1>
              <p className="text-muted-foreground mt-1">Cadastre e gerencie técnicos da equipe</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingTecnico(null); // Clear editing state when opening for new
              setFormData({ 
                nome: "", 
                email: "", 
                telefone: "", 
                cpf: "", 
                especialidade: "ambos",
                tem_acesso_sistema: false,
                senha: "",
                confirmar_senha: ""
              });
              setShowForm(!showForm);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Técnico
          </Button>
        </div>

        {/* Formulário */}
        {showForm && (
          <Card className="mb-8 shadow-lg border-none">
            <CardHeader>
              <CardTitle>{editingTecnico ? 'Editar Técnico' : 'Cadastrar Novo Técnico'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      required
                    />
                  </div>

                  {!editingTecnico && ( // Only show CPF field for new creation
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="especialidade">Especialidade</Label>
                    <select
                      id="especialidade"
                      className="w-full rounded-md border border-border p-2 text-sm h-10 bg-background"
                      value={formData.especialidade}
                      onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
                    >
                      <option value="refrigeracao">Refrigeração</option>
                      <option value="climatizacao">Climatização</option>
                      <option value="ambos">Ambos</option>
                    </select>
                  </div>
                </div>

                {!editingTecnico && ( // Only show "access system" checkbox for new creation
                  <div className="border-t pt-4">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                      <Checkbox
                        id="tem_acesso_sistema"
                        checked={formData.tem_acesso_sistema}
                        onCheckedChange={(checked) => setFormData({
                          ...formData, 
                          tem_acesso_sistema: !!checked
                        })}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="tem_acesso_sistema"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          O técnico vai ter acesso ao sistema?
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          O técnico poderá fazer login com o email cadastrado acima para acessar seus chamados, PMOCs e registrar gastos.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(editingTecnico || formData.tem_acesso_sistema) && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {editingTecnico ? "Criar ou alterar senha de acesso" : "Senha inicial de acesso"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {editingTecnico
                          ? "Preencha somente quando quiser criar o acesso ou definir uma nova senha. A senha atual nunca é exibida."
                          : "O técnico entrará com o e-mail cadastrado e esta senha."}
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="senha">{editingTecnico ? "Nova senha" : "Senha"} *</Label>
                        <Input
                          id="senha"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={formData.senha}
                          onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                          placeholder="Mínimo de 8 caracteres"
                          required={!editingTecnico}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmar_senha">Confirmar senha *</Label>
                        <Input
                          id="confirmar_senha"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={formData.confirmar_senha}
                          onChange={(e) => setFormData({ ...formData, confirmar_senha: e.target.value })}
                          placeholder="Digite a senha novamente"
                          required={!editingTecnico || !!formData.senha}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingTecnico(null); // Reset editing state
                      setFormData({ 
                        nome: "", 
                        email: "", 
                        telefone: "", 
                        cpf: "", 
                        especialidade: "ambos",
                        tem_acesso_sistema: false,
                        senha: "",
                        confirmar_senha: ""
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <UserCog className="w-4 h-4 mr-2" />
                    {editingTecnico ? 'Atualizar Técnico' : 'Criar Técnico'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}

        {/* Lista de Técnicos */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>Técnicos Cadastrados ({tecnicos.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {tecnicos.length === 0 ? (
              <EmptyState
                icon={UserCog}
                title="Nenhum técnico cadastrado"
                description="Cadastre sua equipe técnica para começar a atribuir chamados e PMOCs."
              />
            ) : (
              <div className="divide-y">
                {tecnicos.map((tecnico) => (
                  <div key={tecnico.id} className="p-4 hover:bg-muted">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-foreground">{tecnico.nome}</h4>
                        <p className="text-sm text-muted-foreground">{tecnico.email}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tecnico.telefone} • {tecnico.especialidade}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tecnico.total_atendimentos} atendimentos realizados
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge className={
                          tecnico.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }>
                          {tecnico.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdicionarSaldo(tecnico)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Adicionar Saldo
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(tecnico)}
                        >
                          <UserCog className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        {tecnico.status === 'ativo' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: tecnico.id, status: 'inativo' })}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Desativar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: tecnico.id, status: 'ativo' })}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Ativar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(tecnico)}
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Adicionar Saldo */}
      <Dialog open={showAdicionarSaldoDialog} onOpenChange={setShowAdicionarSaldoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>💰 Adicionar Saldo para Técnico</DialogTitle>
            {tecnicoSelecionado && (
              <p className="text-sm text-muted-foreground mt-2">
                Enviando crédito para: <strong>{tecnicoSelecionado.nome}</strong>
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmitCredito}>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  ℹ️ O técnico precisará aprovar este crédito antes de ele ser adicionado ao saldo disponível.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Crédito *</Label>
                <select
                  value={creditoForm.tipo}
                  onChange={(e) => setCreditoForm({...creditoForm, tipo: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="adiantamento">Adiantamento</option>
                  <option value="reembolso">Reembolso</option>
                  <option value="orcamento">Orçamento de Campo</option>
                  <option value="bonus">Bônus</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={creditoForm.valor}
                  onChange={(e) => setCreditoForm({...creditoForm, valor: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição / Motivo *</Label>
                <Textarea
                  value={creditoForm.descricao}
                  onChange={(e) => setCreditoForm({...creditoForm, descricao: e.target.value})}
                  placeholder="Ex: Adiantamento para viagem, reembolso de combustível, orçamento de manutenção..."
                  rows={3}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAdicionarSaldoDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700"
                disabled={adicionarSaldoMutation.isPending}
              >
                {adicionarSaldoMutation.isPending ? 'Enviando...' : 'Enviar Crédito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
