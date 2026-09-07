import React from "react";
import { useReveal } from "../../hooks/useReveal";

/* ─── WHY CARDS DATA ─── */
const whyCards = [
  {
    icon: "bx bx-package",
    title: <><strong>Estoque</strong> <span className="green">Inteligente</span></>,
    desc: "Medicamentos e produtos disponíveis com atualização em tempo real.",
  },
  {
    icon: "bx bx-shield-quarter",
    title: <><strong>Plataforma</strong> <span className="green">Segura</span></>,
    desc: "Transações protegidas e fornecedores verificados para maior tranquilidade.",
  },
  {
    icon: "bx bx-package",
    title: <><strong>Distribuição</strong> <span className="green">Rápida</span></>,
    desc: "Entregas otimizadas para garantir velocidade e eficiência operacional.",
  },
];

function WhySection() {
  const whyRef = useReveal();

  return (
    <section className="lp-section lp-why" id="catalogo">
      {/* O ref foi movido para cá, englobando todo o conteúdo da seção */}
      <div className="lp-section-inner" ref={whyRef}>

        {/* Mantém a classe reveal para o cabeçalho ser animado também */}
        <div className="lp-section-head reveal">
          <h2 className="lp-section-title">
            <span className="chevron-left">▶</span>
            {" "}Por que <span className="green">escolher</span> a <span className="green">Inter</span>medi ?{" "}
            <span className="chevron-right">◀</span>
          </h2>
          <p className="lp-section-sub">
            Encontre os medicamentos que sua farmácia precisa em nosso<br />
            catalogo completo e atualizado.
          </p>
        </div>

        <div className="lp-why-cards">
          {whyCards.map((card, i) => (
            <div className={`lp-why-card reveal reveal-delay-${i + 1}`} key={i}>
              <div className="lp-why-card-left">
                <h3>{card.title}</h3>
                <div className="lp-why-underline" />
                <p>{card.desc}</p>
              </div>
              <div className="lp-why-icon">
                <i className={card.icon} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhySection;
