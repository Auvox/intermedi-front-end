import React from "react";
import logoIntermedi from "../../assets/logoIntermedi.png";
import { NavLink } from "react-router-dom";

function Nav({ scrolled, menuOpen, setMenuOpen }) {
  return (
    <nav className={`lp-nav${scrolled ? " scrolled" : ""}`}>
      <a href="#" className="lp-logo">
        <img src={logoIntermedi} alt="Intermedi" className="lp-logo-img" />
      </a>

      <ul className="lp-nav-links">
        <li className="active"><a href="#inicio">Inicio</a></li>
        <li><a href="#como-funciona">Como funciona</a></li>
        <li><a href="#catalogo">Catálogo <i className="bx bx-chevron-down" /></a></li>
        <li><a href="#parceiros">Parceiros</a></li>
      </ul>

      <div className="lp-nav-actions">
        <NavLink to="/login">
          <button className="btn-nav-primary">Entrar</button>
        </NavLink>
        
      </div>

      <button className="lp-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
        <span /><span /><span />
      </button>
    </nav>
  );
}

export default Nav;
