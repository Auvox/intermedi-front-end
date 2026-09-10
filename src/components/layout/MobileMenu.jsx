import { NavLink } from "react-router-dom";

function MobileMenu({ menuOpen, setMenuOpen, activeSection }) {
  return (
    <div id="mobile-menu" className={`lp-mobile-menu${menuOpen ? " open" : ""}`} inert={!menuOpen}>
      {[["#inicio", "Início"], ["#catalogo", "Benefícios"], ["#como-funciona", "Como funciona"], ["#parceiros", "Parceiros"]].map(([href, label]) => (
        <a key={href} href={href} aria-current={activeSection === href ? "location" : undefined} onClick={() => setMenuOpen(false)}>{label}</a>
      ))}
      <NavLink to="/login" className="btn-nav-primary" onClick={() => setMenuOpen(false)}>Entrar</NavLink>
    </div>
  );
}

export default MobileMenu;


