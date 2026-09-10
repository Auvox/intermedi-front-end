import { Link } from "react-router-dom";
import logoFooter from "../../assets/logoFooter.png";
import "../../styles/footer.css";

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-panel">
        <div className="lp-footer-inner">
          <div className="lp-footer-intro">
            <div>
              <span className="lp-footer-eyebrow">CONEXÕES QUE CUIDAM</span>
              <h2>Mais perto de você.<br /><span>Mais acesso à saúde.</span></h2>
            </div>
            <div className="lp-footer-invitation">
              <p>Conecte-se a uma rede que aproxima pessoas, farmácias e medicamentos.</p>
              <Link to="/login" className="lp-footer-cta">Fazer parte da Intermedi</Link>
            </div>
          </div>
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <a href="#inicio" aria-label="Intermedi — início" className="lp-footer-brand-link"><img src={logoFooter} alt="Intermedi" className="lp-footer-logo" /></a>
              <p>Interligando medicamentos.<br />Aproximando quem precisa de quem cuida.</p>
              <span className="lp-footer-brand-note"><span aria-hidden="true">+</span> Juntos, o cuidado vai mais longe.</span>
            </div>
            <nav className="lp-footer-col" aria-label="Explore a Intermedi">
              <h3>Explore</h3>
              <ul>
                <li><a href="#inicio">Início</a></li>
                <li><a href="#catalogo">Benefícios</a></li>
                <li><a href="#como-funciona">Como funciona</a></li>
                <li><a href="#parceiros">Parceiros</a></li>
              </ul>
            </nav>
            <nav className="lp-footer-col" aria-label="Acesse a plataforma">
              <h3>Para você</h3>
              <ul>
                <li><a href="#mapa">Encontre farmácias</a></li>
                <li><a href="#parceiros">Farmácias e distribuidores</a></li>
                <li><Link to="/login">Acesse sua conta</Link></li>
              </ul>
            </nav>
            <a href="#mapa" className="lp-footer-map-link">
              <span className="lp-footer-map-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></span>
              <strong>O cuidado está<br />mais perto.</strong>
              <span>Explore nosso mapa</span>
            </a>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Intermedi. Todos os direitos reservados.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
