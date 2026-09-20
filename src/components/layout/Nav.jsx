import logoIntermedi from "../../assets/logoIntermedi.png";
import { NavLink } from "react-router-dom";
import { useLayoutEffect, useRef } from "react";

function Nav({ scrolled, menuOpen, setMenuOpen, activeSection }) {
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
        <img src={logoIntermedi} alt="Intermedi" className="lp-logo-img" />
      </a>

      <ul className="lp-nav-links" ref={linksRef}>
        {[["#inicio", "Início"], ["#catalogo", "Benefícios"], ["#como-funciona", "Como funciona"], ["#parceiros", "Parceiros"]].map(([href, label]) => (
          <li key={href} className={activeSection === href ? "active" : undefined}>
            <a href={href} aria-current={activeSection === href ? "location" : undefined}>{label}</a>
          </li>
        ))}
      </ul>

      <div className="lp-nav-actions">
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


