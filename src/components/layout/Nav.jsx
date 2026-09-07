import React from "react";
import logoIntermedi from "../../assets/logoIntermedi.png";
import { NavLink } from "react-router-dom";

function Nav({ scrolled, menuOpen, setMenuOpen, activeSection }) {
  return (
    <nav className={`lp-nav${scrolled ? " scrolled" : ""}`} aria-label="Navegação principal">
      <a href="#inicio" className="lp-logo" aria-label="Intermedi — início">
        <img src={logoIntermedi} alt="Intermedi" className="lp-logo-img" />
      </a>

      <ul className="lp-nav-links">
        {[["#inicio", "Início"], ["#como-funciona", "Como funciona"], ["#catalogo", "Catálogo"], ["#parceiros", "Parceiros"]].map(([href, label]) => (
          <li key={href} className={activeSection === href ? "active" : undefined}>
            <a href={href} aria-current={activeSection === href ? "location" : undefined}>{label}</a>
          </li>
        ))}
      </ul>

      <div className="lp-nav-actions">
        <NavLink to="/login" className="btn-nav-primary">
          Entrar <span aria-hidden="true">↗</span>
        </NavLink>
        
      </div>

      <button className="lp-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" aria-expanded={menuOpen} aria-controls="mobile-menu">
        <span /><span /><span />
      </button>
    </nav>
  );
}

export default Nav;
