import React from "react";
import Pill3D from "./Pill3D";
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
          <p className="lp-hero-sub">O medicamento que sua farmácia procura pode estar mais perto do que você imagina. Encontre produtos e conecte-se a fornecedores em um só lugar.</p>
          <div className="lp-hero-actions">
            <a className="btn-hero-primary" href="#catalogo">Explorar catálogo <span aria-hidden="true">↗</span></a>
            <a className="btn-hero-outline" href="#como-funciona">Como funciona <span aria-hidden="true">→</span></a>
          </div>
          <ul className="hero-benefits" aria-label="Recursos da Intermedi">
            <li>Encontre medicamentos</li>
            <li>Conecte farmácias</li>
            <li>Simplifique pedidos</li>
          </ul>
        </div>

        {/* RIGHT — visual */}
        <div className="lp-hero-visual">
          <div className="lp-hero-img-wrap">
            {/* Mancha verde de fundo */}
            <img src={mancha} alt="" className="lp-hero-mancha" aria-hidden />

            {/* Pílula principal */}
            <Pill3D />

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
