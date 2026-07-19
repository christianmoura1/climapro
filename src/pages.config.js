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
import React from 'react';
import LandingPage from './pages/LandingPage';
import __Layout from './Layout.jsx';

// Code-splitting por página: cada rota vira um chunk próprio, então o
// visitante só baixa o código da página que está abrindo. A LandingPage
// (porta de entrada) permanece no bundle inicial para pintar instantâneo.
// O <React.Suspense> que cobre essas páginas está em App.jsx.
export const PAGES = {
    "LandingPage": LandingPage,
    "Dashboard": React.lazy(() => import('./pages/Dashboard')),
    "Chamados": React.lazy(() => import('./pages/Chamados')),
    "Clientes": React.lazy(() => import('./pages/Clientes')),
    "PMOC": React.lazy(() => import('./pages/PMOC')),
    "Financeiro": React.lazy(() => import('./pages/Financeiro')),
    "Welcome": React.lazy(() => import('./pages/Welcome')),
    "AdminPanel": React.lazy(() => import('./pages/AdminPanel')),
    "SetupInicial": React.lazy(() => import('./pages/SetupInicial')),
    "Planos": React.lazy(() => import('./pages/Planos')),
    "Equipamentos": React.lazy(() => import('./pages/Equipamentos')),
    "TecnicoDashboard": React.lazy(() => import('./pages/TecnicoDashboard')),
    "GerenciarTecnicos": React.lazy(() => import('./pages/GerenciarTecnicos')),
    "ClienteDashboard": React.lazy(() => import('./pages/ClienteDashboard')),
    "CompanySettings": React.lazy(() => import('./pages/CompanySettings')),
    "NotasFiscais": React.lazy(() => import('./pages/NotasFiscais')),
    "LegacyFallback": React.lazy(() => import('./pages/LegacyFallback')),
    "ValorTecnicos": React.lazy(() => import('./pages/ValorTecnicos')),
    "Agenda": React.lazy(() => import('./pages/Agenda')),
    "PontoEletronico": React.lazy(() => import('./pages/PontoEletronico')),
    "EquipamentoDetalhes": React.lazy(() => import('./pages/EquipamentoDetalhes')),
    "AlterarSenha": React.lazy(() => import('./pages/AlterarSenha')),
    "InitialChoice": React.lazy(() => import('./pages/InitialChoice')),
    "Login": React.lazy(() => import('./pages/Login')),
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};