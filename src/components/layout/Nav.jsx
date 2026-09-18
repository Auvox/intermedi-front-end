import logoIntermedi from "../../assets/logoIntermedi.png";
import logoLight from "../../assets/logoFooter.png";
import { NavLink } from "react-router-dom";
import { useLayoutEffect, useRef } from "react";

function Nav({ scrolled, menuOpen, setMenuOpen, activeSection, theme, toggleTheme }) {
  const linksRef = useRef(null);
  useLayoutEffect(() => {
    const menu = linksRef.current;
    const updateHighlight = () => {
      const active = menu.querySelector('[aria-current="location"]');
      if (!active || !menu.offsetWidth) {
        menu.style.setProperty('--nav-highlight-opacity', '0');
        return;
      }
      const menuRect = menu.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      menu.style.setProperty('--nav-highlight-x', `${rect.left - menuRect.left}px`);
      menu.style.setProperty('--nav-highlight-y', `${rect.top - menuRect.top}px`);
      menu.style.setProperty('--nav-highlight-width', `${rect.width}px`);
      menu.style.setProperty('--nav-highlight-height', `${rect.height}px`);
      menu.style.setProperty('--nav-highlight-opacity', '1');
    };
    updateHighlight();
    const observer = new ResizeObserver(updateHighlight);
    observer.observe(menu);
    menu.querySelectorAll('a').forEach((link) => observer.observe(link));
    return () => observer.disconnect();
  }, [activeSection]);
  return (
    <nav className={`lp-nav${scrolled ? " scrolled" : ""}`} aria-label="Navegação principal">
      <a href="#inicio" className="lp-logo" aria-label="Intermedi — início">
        <img src={theme === "dark" ? logoLight : logoIntermedi} alt="Intermedi" className="lp-logo-img" />
      </a>

      <ul className="lp-nav-links" ref={linksRef}>
        {[["#inicio", "Início"], ["#catalogo", "Benefícios"], ["#como-funciona", "Como funciona"], ["#parceiros", "Parceiros"]].map(([href, label]) => (
          <li key={href} className={activeSection === href ? "active" : undefined}>
            <a href={href} aria-current={activeSection === href ? "location" : undefined}>{label}</a>
          </li>
        ))}
      </ul>

      <div className="lp-nav-actions">
        <button
          type="button"
          className="lp-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          title={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          <svg className="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </svg>
          <svg className="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.5 13a8.5 8.5 0 0 1-9.5-9.5A8.5 8.5 0 1 0 20.5 13Z" />
          </svg>
        </button>
        <NavLink to="/login" className="btn-nav-primary">
          Entrar
        </NavLink>
        
      </div>

      <button className="lp-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" aria-expanded={menuOpen} aria-controls="mobile-menu">
        <span /><span /><span />
      </button>
    </nav>
  );
}

export default Nav;


