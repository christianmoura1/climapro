import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, AlertCircle, Building2 } from "lucide-react";

export default function NovaEmpresaForm({ onSubmit, onCancel, isLoading, error }) {
  const [formData, setFormData] = useState({
    nome: "",
    slug_empresa: "",
    cnpj: "",
    telefone: "",
    email_contato: "",
    endereco: "",
    plano: "free",
    usuario_principal_email: "",
    status: "ativa"
  });

  const handleNomeChange = (nome) => {
    setFormData({
      ...formData,
      nome,
      // Gerar slug automaticamente a partir do nome
      slug_empresa: nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]+/g, "-") // Substitui caracteres especiais por hífen
        .replace(/^-+|-+$/g, "") // Remove hífens do início e fim
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Definir limite de chamados baseado no plano
    const limites = {
      free: 5,
      intermediario: 999999,
      avancado: 999999
    };

    onSubmit({
      ...formData,
      limite_chamados_mes: limites[formData.plano]
    });
  };

  return (
    <Card className="mb-8 shadow-lg border-none">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Cadastrar Nova Empresa
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message || "Erro ao criar empresa. Tente novamente."}
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Importante:</strong> O slug serve apenas para identificação interna. 
              Todos os usuários acessam pelo mesmo domínio (geradordepmoc.com.br), 
              mas os dados ficam isolados por empresa.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: Gelax Refrigeração"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Identificador Único * (slug)</Label>
              <Input
                value={formData.slug_empresa}
                onChange={(e) => setFormData({...formData, slug_empresa: e.target.value})}
                placeholder="Ex: gelax"
                required
              />
              <p className="text-xs text-muted-foreground">
                Usado apenas para identificação interna (ex: "gelax")
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email de Contato</Label>
              <Input
                type="email"
                value={formData.email_contato}
                onChange={(e) => setFormData({...formData, email_contato: e.target.value})}
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Email do Usuário Principal</Label>
              <Input
                type="email"
                value={formData.usuario_principal_email}
                onChange={(e) => setFormData({...formData, usuario_principal_email: e.target.value})}
                placeholder="usuario@empresa.com"
              />
              <p className="text-xs text-muted-foreground">
                Este usuário terá acesso administrativo à empresa
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={formData.endereco}
              onChange={(e) => setFormData({...formData, endereco: e.target.value})}
              placeholder="Rua, número, bairro, cidade - UF"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano Inicial</Label>
              <Select
                value={formData.plano}
                onValueChange={(value) => setFormData({...formData, plano: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (até 5 chamados/mês)</SelectItem>
                  <SelectItem value="intermediario">Intermediário (R$ 59,90/mês)</SelectItem>
                  <SelectItem value="avancado">Avançado (R$ 99,90/mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status Inicial</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t pt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Criando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Criar Empresa
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}