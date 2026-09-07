import React from "react";
import { useReveal } from "../../hooks/useReveal";

/* ─── HOW STEPS DATA ─── */
const howSteps = [
  { icon: "bx bx-search", title: "Busca" },
  { icon: "bx bx-building-house", title: "Fornecedor" },
  { icon: "bx bx-clipboard", title: "Pedido" },
  { icon: "bx bxs-package", title: "Entrega" },
];

function HowSection() {
  const howRef = useReveal();

  return (
    <section className="lp-section lp-how" id="como-funciona">
      <div className="lp-section-inner" ref={howRef}>

        <div className="lp-section-head reveal">
          <h2 className="lp-section-title">
            <span className="chevron-left">▶</span>
            {" "}Como a <span className="green">Inter</span><span className="green">medi</span> funciona{" "}
            <span className="chevron-right">◀</span>
          </h2>
          <p className="lp-section-sub">
            Encontre, solicite e acompanhe medicamentos em uma plataforma integrada, segura e eficiente.
          </p>
        </div>

        {/* CONTAINER ESSENCIAL PARA O ALINHAMENTO DO GRID */}
        <div className="lp-how-container reveal">

          {/* TRACK DAS BOLINHAS */}
          <div className="lp-how-track">
            {howSteps.map((step, i) => (
              <div className="lp-how-step" key={i}>
                <div className="lp-how-circle">
                  <i className={step.icon} />
                </div>
                {/* A div da seta agora fica vazia para o CSS desenhar a linha e o triângulo */}
                {i < howSteps.length - 1 && (
                  <div className="lp-how-arrow" />
                )}
              </div>
            ))}
          </div>

          {/* LABELS SIMÉTRICAS */}
          <div className="lp-how-labels">
            {howSteps.map((step, i) => (
              <div className="lp-how-label" key={i}>
                <span>{step.title}</span>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}

export default HowSection;
