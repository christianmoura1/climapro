import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isActive = true;
    let pendingAuthChange = null;

    checkAppState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // O estado inicial já é carregado por checkAppState(). Processá-lo aqui
      // também iniciava duas leituras concorrentes do perfil no primeiro acesso.
      if (event === 'INITIAL_SESSION') return;

      // O Supabase recomenda não aguardar novas chamadas do próprio cliente
      // dentro deste callback. Adiamos a leitura para evitar deadlock no login.
      if (pendingAuthChange) clearTimeout(pendingAuthChange);
      pendingAuthChange = setTimeout(() => {
        if (!isActive) return;

        if (session) {
          void loadUser();
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        }
      }, 0);
    });

    return () => {
      isActive = false;
      if (pendingAuthChange) clearTimeout(pendingAuthChange);
      subscription.unsubscribe();
    };
  }, []);

  const loadUser = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('Falha ao carregar perfil do usuário:', error);
      setUser(null);
      setIsAuthenticated(false);
      // Sessão válida no Supabase Auth mas sem linha correspondente em `profiles`
      setAuthError({ type: 'user_not_registered', message: 'Perfil não encontrado para este usuário.' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await loadUser();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Erro inesperado ao verificar sessão:', error);
      setAuthError({ type: 'unknown', message: error.message || 'Erro ao carregar a aplicação' });
      setIsLoadingAuth(false);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(shouldRedirect ? window.location.href : undefined);
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
