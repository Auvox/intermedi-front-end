import { useEffect, useState } from "react";
import Pill3D from "./Pill3D";
import mancha from "../../assets/mancha.png";
import fundoCruz from "../../assets/fundoCruz.png";
import logoI from "../../assets/logoI.png";

const signaturePhrases = [
  "Faltou um medicamento? Encontre quem tem.",
  "Sua próxima parceria começa com uma busca.",
  "Conecte sua unidade a novos fornecedores.",
  "Do medicamento ao contato, em um só lugar.",
];

function HeroSection({ paused = false }) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let interval;
    const update = () => {
      window.clearInterval(interval);
      if (!paused && !motion.matches) {
        interval = window.setInterval(() => {
          setPhraseIndex(index => (index + 1) % signaturePhrases.length);
        }, 4500);
      }
    };
    update();
    motion.addEventListener("change", update);
    return () => {
      window.clearInterval(interval);
      motion.removeEventListener("change", update);
    };
  }, [paused]);

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
              <span className="a11y-image-letter">i</span>
              camentos
            </strong>
          </h1>
          <p className="lp-hero-sub">O medicamento que sua farmácia procura pode estar mais perto do que você imagina. Encontre produtos e conecte-se a fornecedores em um só lugar.</p>
          <div className="lp-hero-actions">
            <a className="btn-hero-primary" href="#catalogo">Conhecer benefícios</a>
            <a className="btn-hero-outline" href="#como-funciona">Como funciona</a>
          </div>
          <p className="hero-signature">
            <strong>De farmácia para farmácia.</strong>
            <span className="hero-signature-phrases">
              {signaturePhrases.map((phrase, index) => (
                <span
                  key={phrase}
                  className={`hero-signature-phrase${index === phraseIndex ? " is-active" : ""}`}
                  aria-hidden={index !== phraseIndex}
                >
                  {phrase}
                </span>
              ))}
            </span>
          </p>
        </div>

        {/* RIGHT — visual */}
        <div className="lp-hero-visual">
          <div className="lp-hero-img-wrap">
            {/* Mancha verde de fundo */}
            <img src={mancha} alt="" className="lp-hero-mancha" aria-hidden />

            {/* Pílula principal */}
            <Pill3D paused={paused} />

            {/* Mensagens fixas ao redor da pílula. */}
            <div className="lp-float-card card-medicamento">
              <div className="lp-float-icon-wrapper">
                <i className='bx bx-capsule' />
              </div>
              <span>Medicamento</span>
            </div>

            <div className="lp-float-card card-conexao">
              <div className="lp-float-icon-wrapper">
                <i className="bx bx-share-alt" />
              </div>
              <span>Conexão</span>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;

