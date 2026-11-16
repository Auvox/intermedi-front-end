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
                {/* ícones do Boxicons (MIT) desenhados aqui: a fonte inteira pesava mais que a página */}
                <svg className="lp-float-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.999 20.133a4.969 4.969 0 0 0 3.536-1.465l7.134-7.133a5.007 5.007 0 0 0-.001-7.072C18.723 3.52 17.467 3 16.132 3s-2.591.52-3.534 1.464l-7.134 7.134a5.009 5.009 0 0 0 0 7.072 4.97 4.97 0 0 0 3.535 1.463zm5.013-14.255A2.979 2.979 0 0 1 16.132 5c.802 0 1.556.313 2.122.878a3.004 3.004 0 0 1 .001 4.243l-2.893 2.892L11.12 8.77l2.892-2.892zm-7.134 7.134 2.828-2.828 4.242 4.243-2.827 2.827c-1.133 1.133-3.11 1.132-4.243.001a3.005 3.005 0 0 1 0-4.243z" />
                </svg>
              </div>
              <span>Medicamento</span>
            </div>

            <div className="lp-float-card card-conexao">
              <div className="lp-float-icon-wrapper">
                <svg className="lp-float-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5.5 15a3.51 3.51 0 0 0 2.36-.93l6.26 3.58a3.06 3.06 0 0 0-.12.85 3.53 3.53 0 1 0 1.14-2.57l-6.26-3.58a2.74 2.74 0 0 0 .12-.76l6.15-3.52A3.49 3.49 0 1 0 14 5.5a3.35 3.35 0 0 0 .12.85L8.43 9.6A3.5 3.5 0 1 0 5.5 15zm12 2a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5zm0-13A1.5 1.5 0 1 1 16 5.5 1.5 1.5 0 0 1 17.5 4zm-12 6A1.5 1.5 0 1 1 4 11.5 1.5 1.5 0 0 1 5.5 10z" />
                </svg>
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

