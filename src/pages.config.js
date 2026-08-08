/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
import { lazyWithRetry } from './lib/lazyWithRetry';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import LandingPage from './pages/LandingPage';
import __Layout from './Layout.jsx';
import { lazyWithRetry } from './lib/lazyWithRetry';

// Code-splitting por página: cada rota vira um chunk próprio, então o
// visitante só baixa o código da página que está abrindo. A LandingPage
// (porta de entrada) permanece no bundle inicial para pintar instantâneo.
// O <React.Suspense> que cobre essas páginas está em App.jsx.
export const PAGES = {
    "LandingPage": LandingPage,
    "Dashboard": lazyWithRetry(() => import('./pages/Dashboard')),
    "Chamados": lazyWithRetry(() => import('./pages/Chamados')),
    "Clientes": lazyWithRetry(() => import('./pages/Clientes')),
    "PMOC": lazyWithRetry(() => import('./pages/PMOC')),
    "Financeiro": lazyWithRetry(() => import('./pages/Financeiro')),
    "Welcome": lazyWithRetry(() => import('./pages/Welcome')),
    "AdminPanel": lazyWithRetry(() => import('./pages/AdminPanel')),
    "SetupInicial": lazyWithRetry(() => import('./pages/SetupInicial')),
    "Planos": lazyWithRetry(() => import('./pages/Planos')),
    "Equipamentos": lazyWithRetry(() => import('./pages/Equipamentos')),
    "TecnicoDashboard": lazyWithRetry(() => import('./pages/TecnicoDashboard')),
    "GerenciarTecnicos": lazyWithRetry(() => import('./pages/GerenciarTecnicos')),
    "ClienteDashboard": lazyWithRetry(() => import('./pages/ClienteDashboard')),
    "CompanySettings": lazyWithRetry(() => import('./pages/CompanySettings')),
    "NotasFiscais": lazyWithRetry(() => import('./pages/NotasFiscais')),
    "Orcamentos": lazyWithRetry(() => import('./pages/Orcamentos')),
    "LegacyFallback": lazyWithRetry(() => import('./pages/LegacyFallback')),
    "ValorTecnicos": lazyWithRetry(() => import('./pages/ValorTecnicos')),
    "Agenda": lazyWithRetry(() => import('./pages/Agenda')),
    "PontoEletronico": lazyWithRetry(() => import('./pages/PontoEletronico')),
    "EquipamentoDetalhes": lazyWithRetry(() => import('./pages/EquipamentoDetalhes')),
    "AlterarSenha": lazyWithRetry(() => import('./pages/AlterarSenha')),
    "InitialChoice": lazyWithRetry(() => import('./pages/InitialChoice')),
    "Login": lazyWithRetry(() => import('./pages/Login')),
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};