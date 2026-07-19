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
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Chamados from './pages/Chamados';
import Clientes from './pages/Clientes';
import PMOC from './pages/PMOC';
import Financeiro from './pages/Financeiro';
import Welcome from './pages/Welcome';
import AdminPanel from './pages/AdminPanel';
import SetupInicial from './pages/SetupInicial';
import Planos from './pages/Planos';
import Equipamentos from './pages/Equipamentos';
import TecnicoDashboard from './pages/TecnicoDashboard';
import GerenciarTecnicos from './pages/GerenciarTecnicos';
import ClienteDashboard from './pages/ClienteDashboard';
import CompanySettings from './pages/CompanySettings';
import NotasFiscais from './pages/NotasFiscais';
import LegacyFallback from './pages/LegacyFallback';
import ValorTecnicos from './pages/ValorTecnicos';
import Agenda from './pages/Agenda';
import PontoEletronico from './pages/PontoEletronico';
import EquipamentoDetalhes from './pages/EquipamentoDetalhes';
import AlterarSenha from './pages/AlterarSenha';
import InitialChoice from './pages/InitialChoice';
import Login from './pages/Login';
import __Layout from './Layout.jsx';


export const PAGES = {
    "LandingPage": LandingPage,
    "Dashboard": Dashboard,
    "Chamados": Chamados,
    "Clientes": Clientes,
    "PMOC": PMOC,
    "Financeiro": Financeiro,
    "Welcome": Welcome,
    "AdminPanel": AdminPanel,
    "SetupInicial": SetupInicial,
    "Planos": Planos,
    "Equipamentos": Equipamentos,
    "TecnicoDashboard": TecnicoDashboard,
    "GerenciarTecnicos": GerenciarTecnicos,
    "ClienteDashboard": ClienteDashboard,
    "CompanySettings": CompanySettings,
    "NotasFiscais": NotasFiscais,
    "LegacyFallback": LegacyFallback,
    "ValorTecnicos": ValorTecnicos,
    "Agenda": Agenda,
    "PontoEletronico": PontoEletronico,
    "EquipamentoDetalhes": EquipamentoDetalhes,
    "AlterarSenha": AlterarSenha,
    "InitialChoice": InitialChoice,
    "Login": Login,
}

export const pagesConfig = {
    mainPage: "InitialChoice",
    Pages: PAGES,
    Layout: __Layout,
};