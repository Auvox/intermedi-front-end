import React from "react";
import { useReveal } from "../../hooks/useReveal";

function PartnersSection() {
  const partRef = useReveal();

  return (
    <section className="lp-section lp-partners" id="parceiros">
      {/* Movemos o ref para o container inner para ativar toda a animação da seção */}
      <div className="lp-section-inner" ref={partRef}>

        <div className="lp-section-head reveal">
          <h2 className="lp-section-title">
            <span className="chevron-left">▶</span>
            {" "}Parceiros de <span className="green">Confiança</span>{" "}
            <span className="chevron-right">◀</span>
          </h2>
          <p className="lp-section-sub">
            Conectamos farmácias, distribuidores e laboratórios parceiros para garantir qualidade, segurança e
            eficiência na distribuição de medicamentos.
          </p>
        </div>

        <div className="lp-partners-grid">
          <div className="lp-partner-card lp-partner-card--green reveal reveal-delay-1">
            {/* decorative curves */}
            <div className="partner-deco deco-br" />
          </div>
          <div className="lp-partner-card lp-partner-card--white reveal reveal-delay-2">
            <div className="partner-deco deco-br" />
          </div>
        </div>

        <div className="lp-partners-lists">
          <div className="lp-partner-list-card reveal reveal-delay-3">
            <div className="lp-partner-list-title">Para <span className="green">Farmácias &amp; Distribuidores</span></div>
            <ul>
              {["Gestão de estoque", "Compras simplificadas", "Fornecedores confiáveis", "Relatorios inteligentes"].map(item => (
                <li key={item}><i className="bx bx-check" />{item}</li>
              ))}
            </ul>
          </div>

          <div className="lp-partner-list-card reveal reveal-delay-4">
            <div className="lp-partner-list-title">Para <span className="green">Consumidores</span></div>
            <ul>
              {["Busca de medicamentos", "Comparação de preços", "Localização das farmácias", "Disponibilidades em tempo real"].map(item => (
                <li key={item}><i className="bx bx-check" />{item}</li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </section>
  );
}

export default PartnersSection;
