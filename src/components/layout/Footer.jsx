import React from "react";
import logoFooter from "../../assets/logoFooter.png";

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <img src={logoFooter} alt="Intermedi" className="lp-footer-logo" />
          <p>Interligando medicamentos</p>
          <div className="lp-footer-socials">
            <a href="#" aria-label="Instagram"><i className="bx bxl-instagram" /></a>
            <a href="#" aria-label="LinkedIn"><i className="bx bxl-linkedin" /></a>
            <a href="#" aria-label="Facebook"><i className="bx bxl-facebook" /></a>
          </div>
        </div>

        <div className="lp-footer-col">
          <h4>Links</h4>
          <ul>
            <li><a href="#inicio">• Inicio</a></li>
            <li><a href="#como-funciona">• Como funciona</a></li>
            <li><a href="#catalogo">• Catálogo</a></li>
            <li><a href="#parceiros">• Parceiros</a></li>
          </ul>
        </div>

        <div className="lp-footer-col">
          <h4>Contato</h4>
          <div className="footer-contact-item">
            <i className="bx bx-envelope" />
            <span>contatointermedi.com.br</span>
          </div>
          <div className="footer-contact-item">
            <i className="bx bx-phone" />
            <span>(11) 99999-9999</span>
          </div>
        </div>
      </div>

      <div className="lp-footer-bottom">
        <span>© 2026 Intermedi. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}

export default Footer;
