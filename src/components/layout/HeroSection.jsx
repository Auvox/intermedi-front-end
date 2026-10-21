import Pill3D from "./Pill3D";
import logoI from "../../assets/logoI.png";

// Hero centralizado: nome, título grande, uma frase, duas ações e o produto.
function HeroSection({ paused = false }) {
  return (
    <section className="lp-hero" id="inicio">
      <div className="lp-hero-inner">
        <div className="lp-hero-content">
          <p className="lp-hero-eyebrow">
            <span>Inter</span>medi
          </p>
          <h1 className="lp-hero-title">
            <span className="green">Inter</span>ligando<br />
            <strong>
              med
              <img src={logoI} alt="I" className="lp-hero-logo-i" />
              <span className="a11y-image-letter">i</span>
              camentos.
            </strong>
          </h1>
          <p className="lp-hero-sub">
            O medicamento que sua farmácia procura pode estar mais perto do que você imagina.
          </p>
          <div className="lp-hero-actions">
            <a className="btn-hero-primary" href="#catalogo">Conhecer benefícios</a>
            <a className="btn-hero-outline" href="#como-funciona">Como funciona</a>
          </div>
          <ul className="hero-benefits" aria-label="Recursos da Intermedi">
            <li>Encontre medicamentos</li>
            <li>Conecte farmácias</li>
            <li>Simplifique pedidos</li>
          </ul>
        </div>

        <div className="lp-hero-visual">
          <div className="lp-hero-img-wrap">
            <Pill3D paused={paused} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
