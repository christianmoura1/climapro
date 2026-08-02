import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ChevronRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { getBreadcrumbs } from "@/marketing/site-config";
import SeoHead from "./SeoHead";

const navigation = [
  { label: "Sistema PMOC", href: "/solucoes/sistema-pmoc" },
  { label: "Ordem de serviço", href: "/solucoes/ordem-servico-ar-condicionado" },
  { label: "Para autônomos", href: "/para/tecnico-autonomo" },
  { label: "Recursos", href: "/recursos/guia-pmoc" },
];

export default function MarketingLayout({ page, children }) {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(page.path);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="marketing-site">
      <SeoHead page={page} />
      <a className="m-skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className="m-header">
        <div className="m-container m-header__inner">
          <Link to="/" aria-label="ClimaPro — página inicial" className="m-brand-link">
            <Logo subtitle="Operação de climatização" />
          </Link>

          <nav className="m-nav m-nav--desktop" aria-label="Navegação principal">
            {navigation.map((item) => (
              <Link key={item.href} to={item.href} className="m-nav__link">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="m-header__actions">
            <a className="m-text-link m-header__login" href="/Login">
              Entrar
            </a>
            <a className="m-button m-button--compact" href="/InitialChoice">
              Criar conta
              <ArrowRight aria-hidden="true" />
            </a>
            <button
              className="m-menu-button"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav id="menu-mobile" className="m-nav-mobile" aria-label="Navegação móvel">
            <div className="m-container">
              {navigation.map((item) => (
                <Link key={item.href} to={item.href} className="m-nav-mobile__link">
                  {item.label}
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
              <a className="m-nav-mobile__link" href="/Login">
                Entrar no sistema
                <ChevronRight aria-hidden="true" />
              </a>
            </div>
          </nav>
        ) : null}
      </header>

      <main id="conteudo">
        {page.path !== "/" ? (
          <nav className="m-container m-breadcrumbs" aria-label="Navegação estrutural">
            <ol>
              {breadcrumbs.map((item, index) => (
                <li key={item.path}>
                  {index < breadcrumbs.length - 1 ? (
                    <Link to={item.path}>{item.name}</Link>
                  ) : (
                    <span aria-current="page">{item.name}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <ChevronRight aria-hidden="true" /> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {children}
      </main>

      <footer className="m-footer">
        <div className="m-container m-footer__grid">
          <div className="m-footer__brand">
            <Logo dark subtitle="Operação de climatização" />
            <p>
              Chamados, PMOC, agenda e registros de campo para empresas e técnicos de
              climatização.
            </p>
          </div>
          <div>
            <p className="m-footer__title">Soluções</p>
            <Link to="/solucoes/sistema-pmoc">Sistema PMOC</Link>
            <Link to="/solucoes/ordem-servico-ar-condicionado">Ordem de serviço</Link>
            <Link to="/para/tecnico-autonomo">Para técnico autônomo</Link>
          </div>
          <div>
            <p className="m-footer__title">Recursos gratuitos</p>
            <Link to="/recursos/modelo-ordem-servico-ar-condicionado">Modelo de OS</Link>
            <Link to="/recursos/checklist-manutencao-preventiva-ar-condicionado">
              Checklist de preventiva
            </Link>
            <Link to="/recursos/guia-pmoc">Guia PMOC</Link>
            <Link to="/recursos/calculadora-preco-pmoc">Calculadora de preço</Link>
          </div>
          <div>
            <p className="m-footer__title">Conta</p>
            <a href="/InitialChoice">Criar conta gratuita</a>
            <a href="/Login">Entrar no sistema</a>
          </div>
          <div>
            <p className="m-footer__title">PMOC por região</p>
            <Link to="/pmoc/curitiba">Curitiba e região</Link>
            <Link to="/pmoc/sao-paulo">São Paulo e Grande SP</Link>
            <Link to="/pmoc/vitoria-vila-velha">Vitória e Vila Velha</Link>
          </div>
        </div>
        <div className="m-container m-footer__bottom">
          <span>© {new Date().getFullYear()} ClimaPro.</span>
          <span>Conteúdo em português do Brasil.</span>
        </div>
      </footer>
    </div>
  );
}
