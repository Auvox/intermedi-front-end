import React from "react";

function MobileMenu({ menuOpen, setMenuOpen }) {
  return (
    <div className={`lp-mobile-menu${menuOpen ? " open" : ""}`}>
      <a href="#inicio" onClick={() => setMenuOpen(false)}>Início</a>
      <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
      <a href="#catalogo" onClick={() => setMenuOpen(false)}>Catálogo</a>
      <a href="#parceiros" onClick={() => setMenuOpen(false)}>Parceiros</a>
      <button className="btn-nav-primary" style={{ marginTop: 8 }}>Entrar</button>
    </div>
  );
}

export default MobileMenu;
