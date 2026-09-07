import React from "react";
import pilula from "../../assets/pilula.png";
import mancha from "../../assets/mancha.png";
import fundoCruz from "../../assets/fundoCruz.png";
import logoI from "../../assets/logoI.png";

function HeroSection() {
  return (
    <section className="lp-hero" id="inicio">
      {/* Background decorativo da cruz no fundo esquerdo */}
      <img src={fundoCruz} alt="" className="lp-bg-cruz-back" aria-hidden />

      <div className="lp-hero-inner">
        {/* LEFT */}
        <div className="lp-hero-content">
          <h1 className="lp-hero-title">
            <span className="green">Inter</span>ligando<br />
            <strong>
              med
              <img src={logoI} alt="I" className="lp-hero-logo-i" />
              camentos
            </strong>
          </h1>
          <div className="lp-hero-actions">
            <button className="btn-hero-primary">Explorar catálogo</button>
            <button className="btn-hero-outline">Saiba mais</button>
          </div>
        </div>

        {/* RIGHT — visual */}
        <div className="lp-hero-visual">
          <div className="lp-hero-img-wrap">
            {/* Mancha verde de fundo */}
            <img src={mancha} alt="" className="lp-hero-mancha" aria-hidden />

            {/* Pílula principal */}
            <img src={pilula} alt="Pílula Intermedi" className="lp-hero-pilula" />

            {/* FLOATING CARD 1: Medicamento (Fica em cima/esquerda da pílula) */}
            <div className="lp-float-card card-medicamento">
              <div className="lp-float-icon-wrapper">
                <i className='bx bx-capsule' />
              </div>
              <span>Medicamento</span>
            </div>

            {/* FLOATING CARD 2: Conexão (Fica embaixo/direita da pílula) */}
            <div className="lp-float-card card-conexao">
              <div className="lp-float-icon-wrapper">
                <i className="bx bx-share-alt" />
              </div>
              <span>Conexão</span>

              {/* Símbolos de + (cruzes verdes) flutuando no fundo direito */}
              <img src={fundoCruz} className="lp-bg-cruz-back" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
