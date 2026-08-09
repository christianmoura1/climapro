import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import { PageLoading } from "@/components/ui/page-loading";
import RequerModulo from "@/components/ui/requer-modulo";
import { MODULO_POR_PAGINA } from "@/lib/planos";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Páginas alcançáveis sem sessão. O /Login precisa estar aqui: ele também é
// servido pelo PrivateApplication, então sem a exceção o redirecionamento de
// "não autenticado" apontaria para si mesmo em loop.
const PAGINAS_SEM_LOGIN = new Set(["/Login", "/LandingPage", "/"]);

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

function AuthenticatedApp() {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { pathname } = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
    if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  // Sem sessão, manda para o login. Faltava este ramo: o AuthContext zera o
  // usuário ao sair ou ao expirar a sessão, mas não define authError, então o
  // app seguia desenhando as telas de quem não estava mais logado.
  if (!isAuthenticated && !PAGINAS_SEM_LOGIN.has(pathname)) {
    navigateToLogin();
    return null;
  }

  return (
    <React.Suspense fallback={<PageLoading />}>
      <Routes>
        <Route
          path="/"
          element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          }
        />
        {Object.entries(Pages).map(([path, Page]) => {
          // Módulos fechados pelo plano param aqui. Antes, modulos_ativos só
          // filtrava o menu lateral: digitar /Estoque na barra de endereço
          // abria a tela em qualquer plano.
          const modulo = MODULO_POR_PAGINA[path];
          const pagina = modulo
            ? <RequerModulo modulo={modulo}><Page /></RequerModulo>
            : <Page />;

          return (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  {pagina}
                </LayoutWrapper>
              }
            />
          );
        })}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </React.Suspense>
  );
}

export default function PrivateApplication() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <AuthenticatedApp />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
