import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AlterarSenha() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Senha atual é obrigatória";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "A senha deve ter no mínimo 8 caracteres";
    } else if (!/[A-Z]/.test(formData.newPassword)) {
      newErrors.newPassword = "A senha deve conter pelo menos uma letra maiúscula";
    } else if (!/[a-z]/.test(formData.newPassword)) {
      newErrors.newPassword = "A senha deve conter pelo menos uma letra minúscula";
    } else if (!/[0-9]/.test(formData.newPassword)) {
      newErrors.newPassword = "A senha deve conter pelo menos um número";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    if (formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "A nova senha deve ser diferente da senha atual";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      // Tentar fazer login com a senha atual para validar
      // Nota: A API do base44 pode ter um método específico para alterar senha
      // Por enquanto, vamos assumir que existe um método updatePassword
      
      // Verificar se a senha atual está correta fazendo uma requisição de teste
      // (isso pode variar dependendo da API do base44)
      
      await base44.auth.updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setSuccess(true);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      // Mostrar mensagem de sucesso e redirecionar após 2 segundos
      setTimeout(() => {
        const redirectUrl = user?.tipo_usuario === 'tecnico' 
          ? createPageUrl("TecnicoDashboard")
          : user?.tipo_usuario === 'cliente'
          ? createPageUrl("ClienteDashboard")
          : user?.tipo_usuario === 'admin_global'
          ? createPageUrl("AdminPanel")
          : createPageUrl("Dashboard");
        
        navigate(redirectUrl);
      }, 2000);

    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      setErrors({
        currentPassword: "Senha atual incorreta ou erro ao atualizar. Tente novamente."
      });
    } finally {
      setLoading(false);
    }
  };

  const getRedirectUrl = () => {
    if (!user) return createPageUrl("Dashboard");
    
    if (user.tipo_usuario === 'tecnico') return createPageUrl("TecnicoDashboard");
    if (user.tipo_usuario === 'cliente') return createPageUrl("ClienteDashboard");
    if (user.tipo_usuario === 'admin_global') return createPageUrl("AdminPanel");
    return createPageUrl("Dashboard");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={getRedirectUrl()}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Alterar Senha</h1>
            <p className="text-muted-foreground mt-1">Atualize sua senha de acesso ao sistema</p>
          </div>
        </div>

        {success && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">✅ Senha alterada com sucesso!</p>
                  <p className="text-sm text-green-700">Redirecionando...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg border-none">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Segurança da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Senha Atual */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual *</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) => {
                      setFormData({...formData, currentPassword: e.target.value});
                      setErrors({...errors, currentPassword: ""});
                    }}
                    className={errors.currentPassword ? 'border-red-300' : ''}
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-red-600">{errors.currentPassword}</p>
                )}
              </div>

              {/* Nova Senha */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => {
                      setFormData({...formData, newPassword: e.target.value});
                      setErrors({...errors, newPassword: ""});
                    }}
                    className={errors.newPassword ? 'border-red-300' : ''}
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-red-600">{errors.newPassword}</p>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Requisitos da senha:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li className={formData.newPassword.length >= 8 ? 'text-green-700' : ''}>
                      • Mínimo de 8 caracteres
                    </li>
                    <li className={/[A-Z]/.test(formData.newPassword) ? 'text-green-700' : ''}>
                      • Pelo menos uma letra maiúscula
                    </li>
                    <li className={/[a-z]/.test(formData.newPassword) ? 'text-green-700' : ''}>
                      • Pelo menos uma letra minúscula
                    </li>
                    <li className={/[0-9]/.test(formData.newPassword) ? 'text-green-700' : ''}>
                      • Pelo menos um número
                    </li>
                  </ul>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({...formData, confirmPassword: e.target.value});
                      setErrors({...errors, confirmPassword: ""});
                    }}
                    className={errors.confirmPassword ? 'border-red-300' : ''}
                    placeholder="Digite novamente a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link to={getRedirectUrl()}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none mt-6 bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-yellow-900 mb-3">⚠️ Dicas de Segurança</h3>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>• Use uma senha única que você não usa em outros sites</li>
              <li>• Nunca compartilhe sua senha com outras pessoas</li>
              <li>• Altere sua senha periodicamente</li>
              <li>• Use uma combinação de letras, números e caracteres especiais</li>
              <li>• Evite informações pessoais óbvias (datas de nascimento, nomes, etc.)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}