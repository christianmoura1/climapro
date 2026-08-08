
import React from "react";
import { LogoMark } from "@/components/ui/logo";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  DollarSign,
  FileText,
  LogOut,
  Menu,
  Cpu,
  UserCog,
  Settings,
  Shield,
  Clock,
  Lock, // Added Lock icon for password change
  FileSignature
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import CompatibilityCheck from "@/components/CompatibilityCheck";
import BootDiagnostics from "@/components/BootDiagnostics";
import ErrorBoundary from "@/components/ErrorBoundary";
import StatusConexao from "@/components/ui/status-conexao";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    modulo: null // Sempre visível
  },
  {
    title: "Chamados",
    url: createPageUrl("Chamados"),
    icon: ClipboardList,
    modulo: "chamados"
  },
  {
    title: "Orçamentos",
    url: createPageUrl("Orcamentos"),
    icon: FileSignature,
    modulo: "chamados"
  },
  {
    title: "Clientes",
    url: createPageUrl("Clientes"),
    icon: Users,
    modulo: "clientes"
  },
  {
    title: "Equipamentos",
    url: createPageUrl("Equipamentos"),
    icon: Cpu,
    modulo: "equipamentos"
  },
  {
    title: "Técnicos",
    url: createPageUrl("GerenciarTecnicos"),
    icon: UserCog,
    modulo: "tecnicos"
  },
  {
    title: "Agenda",
    url: createPageUrl("Agenda"),
    icon: Calendar,
    modulo: "agenda"
  },
  {
    title: "Ponto Eletrônico",
    url: createPageUrl("PontoEletronico"),
    icon: Clock,
    modulo: "ponto_eletronico"
  },
  {
    title: "PMOC",
    url: createPageUrl("PMOC"),
    icon: Calendar,
    modulo: "pmoc"
  },
  {
    title: "Financeiro",
    url: createPageUrl("Financeiro"),
    icon: DollarSign,
    modulo: "financeiro"
  },
  {
    title: "Notas Fiscais",
    url: createPageUrl("NotasFiscais"),
    icon: FileText,
    modulo: "notas_fiscais"
  },
  {
    title: "Planos",
    url: createPageUrl("Planos"),
    icon: FileText,
    modulo: null // Sempre visível
  },
  {
    title: "Configurações da Empresa",
    url: createPageUrl("CompanySettings"),
    icon: Settings,
    modulo: null // Sempre visível
  },
];

const adminGlobalNavigation = [
  {
    title: "Painel Admin Global",
    url: createPageUrl("AdminPanel"),
    icon: Shield,
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [isAdminGlobal, setIsAdminGlobal] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [modulosAtivos, setModulosAtivos] = React.useState({});

  // Páginas que não precisam de autenticação
  const noAuthPages = ["LandingPage", "Welcome", "SetupInicial", "TecnicoDashboard", "ClienteDashboard", "InitialChoice", "AlterarSenha", "Login"];
  const shouldLoadAuth = !noAuthPages.includes(currentPageName);

  React.useEffect(function() {
    // Se não precisa de autenticação, não tenta carregar usuário
    if (!shouldLoadAuth) {
      setLoading(false);
      return;
    }

    const loadUser = async function() {
      setLoading(true);
      try {
        // Primeiro verificar se está autenticado
        const isAuth = await base44.auth.isAuthenticated();
        
        if (!isAuth) {
          console.log("[Layout] Usuário não autenticado, redirecionando para login...");
          base44.auth.redirectToLogin();
          return;
        }

        const currentUser = await base44.auth.me();
        console.log("[Layout] Usuário carregado:", currentUser.email);
        setUser(currentUser);
        
        // Verificar se é admin global
        const isAdmin = currentUser.role === 'admin';
        setIsAdminGlobal(isAdmin);
        
        // Se for admin global e estiver tentando acessar páginas restritas, redirecionar
        // "AlterarSenha" is explicitly allowed for admin global, so it's kept in the exception list.
        if (isAdmin && !["LandingPage", "Welcome", "AdminPanel", "AlterarSenha"].includes(currentPageName)) {
          navigate(createPageUrl("AdminPanel"));
          return;
        }

        // Carregar módulos ativos da empresa
        if (!isAdmin && currentUser.empresa_id) {
          const empresas = await base44.entities.Empresa.list();
          const minhaEmpresa = empresas.find(function(e) { return e.id === currentUser.empresa_id; });
          
          if (minhaEmpresa && minhaEmpresa.modulos_ativos) {
            setModulosAtivos(minhaEmpresa.modulos_ativos);
          } else {
            // Padrão: todos ativos exceto financeiro e notas fiscais
            setModulosAtivos({
              chamados: true,
              clientes: true,
              equipamentos: true,
              tecnicos: true,
              agenda: true,
              ponto_eletronico: true,
              pmoc: true,
              financeiro: false,
              notas_fiscais: false
            });
          }
        }
      } catch (error) {
        console.error("[Layout] Erro ao carregar usuário:", error);
        
        // Se erro de autenticação, redirecionar para login
        if (error.message && (
          error.message.includes("Authentication required") || 
          error.message.includes("not authenticated") ||
          error.message.includes("No active session") ||
          error.message.includes("status code 401") // Common for unauthorized
        )) {
          console.log("[Layout] Erro de autenticação detectado, redirecionando para login...");
          base44.auth.redirectToLogin();
        } else {
          // Para outros erros inesperados, também redirecionar para evitar stuck state
          console.error("[Layout] Erro inesperado ao carregar usuário:", error);
          alert("Ocorreu um erro ao carregar os dados. Você será redirecionado para fazer login novamente.");
          base44.auth.redirectToLogin();
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [currentPageName, navigate, shouldLoadAuth]);

  // Effect for reloading modules periodically
  React.useEffect(function() {
    // Only run if authentication is required and user is loaded and not admin global
    if (!shouldLoadAuth || !user || isAdminGlobal || !user.empresa_id) {
      return;
    }

    var interval = setInterval(function() {
      // Verificar se ainda está autenticado antes de tentar recarregar
      base44.auth.isAuthenticated().then(function(isAuth) {
        if (!isAuth) {
          console.log('[Layout] Usuário não está mais autenticado, cancelando reload de módulos');
          if (interval) {
            clearInterval(interval);
          }
          return;
        }

        // Tentar recarregar módulos com tratamento de erro silencioso
        base44.entities.Empresa.list().then(function(empresas) {
          var minhaEmpresa = empresas.find(function(e) { return e.id === user.empresa_id; });
          if (minhaEmpresa && minhaEmpresa.modulos_ativos) {
            setModulosAtivos(minhaEmpresa.modulos_ativos);
          }
        }).catch(function(error) {
          // Log silencioso - não mostrar erro ao usuário para não poluir
          console.debug('[Layout] Erro silencioso ao recarregar módulos (será tentado novamente):', error.message);
        });
      }).catch(function(error) {
        console.debug('[Layout] Erro ao verificar autenticação:', error.message);
      });
    }, 60000); // Aumentado para 60 segundos para reduzir carga

    return function() {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user, isAdminGlobal, shouldLoadAuth]);

  const handleLogout = function() {
    base44.auth.logout();
  };

  // Páginas que não devem mostrar sidebar nem CompatibilityCheck
  const noSidebarPages = ["LandingPage", "Welcome", "SetupInicial", "TecnicoDashboard", "ClienteDashboard", "InitialChoice", "AlterarSenha", "Login"];
  if (noSidebarPages.includes(currentPageName)) {
    return (
      <BootDiagnostics>
        <CompatibilityCheck>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </CompatibilityCheck>
      </BootDiagnostics>
    );
  }

  // Mostrar loading enquanto carrega (apenas para páginas autenticadas)
  if (shouldLoadAuth && loading) {
    return (
      <BootDiagnostics>
        <CompatibilityCheck>
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          </div>
        </CompatibilityCheck>
      </BootDiagnostics>
    );
  }

  // Se for admin global, mostrar layout simplificado
  if (isAdminGlobal) {
    return (
      <BootDiagnostics>
        <CompatibilityCheck>
          <ErrorBoundary>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
              {/* Header Admin Global */}
              <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 text-lg">ClimaPro Admin</h2>
                        <p className="text-xs text-gray-500">Painel Administrativo Global</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      {user && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">
                              {user.full_name && user.full_name[0] ? user.full_name[0].toUpperCase() : 'A'}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 text-sm">
                              {user.full_name || 'Admin Global'}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      )}
                      <Link to={createPageUrl("AlterarSenha")}>
                        <Button variant="outline">
                          <Lock className="w-4 h-4 mr-2" />
                          Alterar Senha
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                      </Button>
                    </div>
                  </div>
                </div>
              </header>

              {/* Content */}
              <main>
                {children}
              </main>
            </div>
          </ErrorBoundary>
        </CompatibilityCheck>
      </BootDiagnostics>
    );
  }

  // Filtrar itens de navegação baseado nos módulos ativos
  const navigationItemsFiltered = navigationItems.filter(function(item) {
    // Se não tem módulo associado, sempre mostrar
    if (item.modulo === null) return true;
    // Verificar se o módulo está ativo
    return modulosAtivos[item.modulo] === true;
  });

  // Layout normal para usuários comuns
  return (
    <BootDiagnostics>
      <CompatibilityCheck>
        <ErrorBoundary>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <Sidebar className="border-r border-gray-200 bg-white">
                <SidebarHeader className="border-b border-gray-200 p-4">
                  <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
                    <LogoMark className="w-10 h-10" />
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">ClimaPro</h2>
                      <p className="text-xs text-gray-500">CRM Operacional</p>
                    </div>
                  </Link>
                </SidebarHeader>
                
                <SidebarContent className="p-2">
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                      Menu Principal
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {navigationItemsFiltered.map(function(item) {
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton 
                                asChild 
                                className={'hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-lg mb-1 ' + (
                                  location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                                )}
                              >
                                <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                                  <item.icon className="w-5 h-5" />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="border-t border-gray-200 p-4">
                  {user && (
                    <div className="mb-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {user.full_name && user.full_name[0] ? user.full_name[0].toUpperCase() : 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {user.full_name || 'Usuário'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Link to={createPageUrl("AlterarSenha")} className="block mb-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </Button>
                  </Link>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </SidebarFooter>
              </Sidebar>

              <main className="flex-1 flex flex-col overflow-hidden">
                <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
                  <SidebarTrigger className="h-11 w-11 rounded-lg hover:bg-gray-100" aria-label="Abrir menu principal">
                    <Menu className="w-6 h-6" />
                  </SidebarTrigger>
                </header>

                <div className="flex-1 overflow-auto">
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </div>
              </main>

              <StatusConexao />
            </div>
          </SidebarProvider>
        </ErrorBoundary>
      </CompatibilityCheck>
    </BootDiagnostics>
  );
}
