
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Snowflake } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[CLIMAPRO-BOOT] Welcome page - iniciando verificação de usuário');
    
    const checkUserAndRedirect = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        console.log('[CLIMAPRO-BOOT] Autenticado:', isAuth);
        
        if (!isAuth) {
          navigate(createPageUrl("InitialChoice"));
          return;
        }

        const user = await base44.auth.me();
        console.log('[CLIMAPRO-BOOT] Usuário:', user.email, '| Tipo:', user.tipo_usuario);

        // Verificar se veio com parâmetro de ação
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        console.log('[CLIMAPRO-BOOT] Action param:', action);

        // ADMIN GLOBAL
        if (user.email === "christianmoura2014@gmail.com") {
          await base44.auth.updateMe({
            tipo_usuario: 'admin_global'
          });
          console.log('[CLIMAPRO-BOOT] Redirecionando admin global...');
          navigate(createPageUrl("AdminPanel"));
          return;
        }

        // Se já tem tipo_usuario definido
        if (user.tipo_usuario) {
          // Se tem ação criar_empresa mas já é técnico/cliente, bloquear
          if (action === 'criar_empresa' && (user.tipo_usuario === 'tecnico' || user.tipo_usuario === 'cliente')) {
            alert(`❌ ${user.tipo_usuario === 'tecnico' ? 'Técnicos' : 'Clientes'} não podem criar empresas.\n\nVocê será redirecionado para seu painel.`);
            navigate(user.tipo_usuario === 'tecnico' ? createPageUrl("TecnicoDashboard") : createPageUrl("ClienteDashboard"));
            return;
          }
          
          if (user.tipo_usuario === 'tecnico') {
            // Verificar se o técnico existe e está ativo
            const tecnicos = await base44.entities.Tecnico.list();
            const tecnico = tecnicos.find(t => t.email === user.email && t.status === 'ativo');
            
            if (!tecnico) {
              alert("❌ Técnico não encontrado ou inativo. Entre em contato com o administrador.");
              base44.auth.logout();
              navigate(createPageUrl("InitialChoice"));
              return;
            }
            
            navigate(createPageUrl("TecnicoDashboard"));
          } else if (user.tipo_usuario === 'cliente') {
            // Verificar se o cliente existe e tem acesso ao portal
            const clientes = await base44.entities.Cliente.list();
            const cliente = clientes.find(c => c.email === user.email && c.tem_acesso_portal);
            
            if (!cliente) {
              alert("❌ Cliente não encontrado ou sem acesso ao portal. Entre em contato com a empresa.");
              base44.auth.logout();
              navigate(createPageUrl("InitialChoice"));
              return;
            }
            
            navigate(createPageUrl("ClienteDashboard"));
          } else if (user.tipo_usuario === 'admin_empresa') {
            // Se tem ação criar_empresa e é admin, ir para setup
            if (action === 'criar_empresa' && !user.empresa_id) {
              navigate(createPageUrl("SetupInicial"));
            } else if (!user.empresa_id) {
              navigate(createPageUrl("SetupInicial"));
            } else {
              navigate(createPageUrl("Dashboard"));
            }
          } else {
            navigate(createPageUrl("Dashboard"));
          }
          // Marcar como inicializado
          window.__climapro_initialized = true;
          console.log('[CLIMAPRO-BOOT] Welcome page - redirecionamento concluído (tipo_usuario existente)');
          return;
        }

        // Se não tem tipo_usuario, tentar identificar
        const clientes = await base44.entities.Cliente.list();
        const tecnicos = await base44.entities.Tecnico.list();

        const cliente = clientes.find(function(c) {
          return c.email === user.email && c.tem_acesso_portal;
        });
        
        const tecnico = tecnicos.find(function(t) {
          return t.email === user.email && t.status === 'ativo';
        });

        if (cliente) {
          console.log('[CLIMAPRO-BOOT] Identificado como cliente');
          await base44.auth.updateMe({
            tipo_usuario: 'cliente',
            empresa_id: cliente.empresa_id
          });
          navigate(createPageUrl("ClienteDashboard"));
        } else if (tecnico) {
          console.log('[CLIMAPRO-BOOT] Identificado como técnico');
          await base44.auth.updateMe({
            tipo_usuario: 'tecnico',
            empresa_id: tecnico.empresa_id,
            tecnico_id: tecnico.id
          });
          navigate(createPageUrl("TecnicoDashboard"));
        } else {
          // Usuário não é cliente nem técnico - pode ser um novo admin de empresa
          console.log('[CLIMAPRO-BOOT] Novo usuário - não é cliente nem técnico');
          
          // Se veio com action criar_empresa, é um novo admin querendo criar empresa
          if (action === 'criar_empresa') {
            await base44.auth.updateMe({
              tipo_usuario: 'admin_empresa'
            });
            navigate(createPageUrl("SetupInicial"));
          } else {
            // Usuário não encontrado e não veio do fluxo de criação
            alert("❌ Usuário não encontrado no sistema.\n\nSe você é técnico ou cliente, entre em contato com o administrador.\n\nSe deseja criar uma nova empresa, volte e clique em 'Criar Nova Empresa'.");
            base44.auth.logout();
            navigate(createPageUrl("InitialChoice"));
          }
        }
        
        // Marcar como inicializado
        window.__climapro_initialized = true;
        console.log('[CLIMAPRO-BOOT] Welcome page - redirecionamento concluído');
        
      } catch (err) {
        console.error("[CLIMAPRO-BOOT] Erro ao verificar usuário:", err);
        setError("Erro ao carregar. Tentando novamente...");
        setTimeout(function() {
          navigate(createPageUrl("InitialChoice"));
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [navigate]);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #EBF4FF 0%, #E9D5FF 100%)'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Snowflake style={{ width: '32px', height: '32px', color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            ClimaPro
          </h2>
          <p style={{ color: '#EF4444', marginTop: '16px' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #EBF4FF 0%, #E9D5FF 100%)'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Snowflake style={{ width: '32px', height: '32px', color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            ClimaPro
          </h2>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#2563EB',
            borderRadius: '50%',
            margin: '16px auto 0',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#6B7280', marginTop: '16px' }}>Configurando seu acesso...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return null;
}
