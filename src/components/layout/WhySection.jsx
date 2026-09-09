import { useState } from "react";
import stockImage from "../../assets/benefit-stock.png";
import securityImage from "../../assets/benefit-security.png";
import deliveryImage from "../../assets/benefit-delivery.png";
import "../../styles/whySection.css";

const benefits = [
  { id: "stock", title: "Estoque", accent: "inteligente", description: "Encontre os medicamentos que faltam e dê mais movimento ao seu estoque.", image: stockImage },
  { id: "security", title: "Plataforma", accent: "segura", description: "Conecte sua farmácia a fornecedores e parceiros em um só lugar.", image: securityImage },
  { id: "delivery", title: "Distribuição", accent: "rápida", description: "Da solicitação à entrega, acompanhe cada etapa do seu pedido.", image: deliveryImage },
];

export default function WhySection() {
  const [activeCard, setActiveCard] = useState(null);
  return (
    <section className="lp-section lp-why" id="catalogo">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 className="lp-section-title">
            <span className="chevron-left" aria-hidden="true">▶</span>
            {" "}Por que <span className="green">escolher</span> a <span className="green">Inter</span>medi?{" "}
            <span className="chevron-right" aria-hidden="true">◀</span>
          </h2>
          <p className="lp-section-sub">Encontre os medicamentos que sua farmácia precisa em nosso catálogo completo e atualizado.</p>
        </div>
        <div className="benefits-grid">
          {benefits.map((benefit) => (
            <article
              className={`benefit-card benefit-card--${benefit.id}${activeCard === benefit.id ? " is-open" : ""}`}
              key={benefit.id}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setActiveCard(benefit.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") {
                  setActiveCard((current) => current === benefit.id ? null : current);
                }
              }}
            >
              <div className="benefit-copy">
                <h3>
                  <button
                    type="button"
                    className="benefit-trigger"
                    aria-expanded={activeCard === benefit.id}
                    aria-controls={`benefit-detail-${benefit.id}`}
                    onClick={(event) => {
                      if (event.nativeEvent.pointerType === "touch") {
                        setActiveCard((current) => current === benefit.id ? null : benefit.id);
                      } else {
                        setActiveCard(benefit.id);
                      }
                    }}
                    onFocus={(event) => {
                      if (event.currentTarget.matches(":focus-visible")) setActiveCard(benefit.id);
                    }}
                    onBlur={() => setActiveCard((current) => current === benefit.id ? null : current)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setActiveCard(null);
                    }}
                  >
                    {benefit.title}<span>{benefit.accent}</span>
                  </button>
                </h3>
                <p id={`benefit-detail-${benefit.id}`} aria-hidden={activeCard !== benefit.id}>{benefit.description}</p>
              </div>
              <div className="benefit-stage" aria-hidden="true" />
              <img className="benefit-art" src={benefit.image} alt="" width="1254" height="1254" loading="lazy" decoding="async" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
