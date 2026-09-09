import { Link } from "react-router-dom";
import "../../styles/partnerAudience.css";

const audiences = [
  {
    id: "business",
    label: "PARA QUEM ABASTECE",
    title: <>Farmácias &amp;<br />distribuidores</>,
    description: "Mais conexões para movimentar seu estoque e simplificar o dia a dia da sua operação.",
    benefits: ["Gestão de estoque", "Compras simplificadas", "Fornecedores confiáveis", "Relatórios inteligentes"],
  },
  {
    id: "consumer",
    label: "PARA QUEM PRECISA",
    title: <>Consumidores</>,
    description: "Mais facilidade para encontrar medicamentos e se aproximar das farmácias da sua região.",
    benefits: ["Busca de medicamentos", "Comparação de preços", "Localização das farmácias", "Disponibilidade em tempo real"],
  },
];

export default function PartnersSection() {
  return (
    <section className="lp-section lp-partners" id="parceiros">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 className="lp-section-title">
            <span className="chevron-left" aria-hidden="true">▶</span>
            {" "}Parceiros de <span className="green">Confiança</span>{" "}
            <span className="chevron-right" aria-hidden="true">◀</span>
          </h2>
          <p className="lp-section-sub">Conectamos farmácias, distribuidores e laboratórios parceiros para garantir qualidade, segurança e eficiência na distribuição de medicamentos.</p>
        </div>
        <div className="audience-grid">
          {audiences.map((audience) => (
            <article className={`audience-card audience-card--${audience.id}`} key={audience.id}>
              <div className="audience-topline">
                <span>{audience.label}</span>
                <span className="audience-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {audience.id === "business" ? <><path d="M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0M9 21v-6h6v6" /></> : <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><path d="M12 6v8M8 10h8" /></>}
                  </svg>
                </span>
              </div>
              <h3>{audience.title}</h3>
              <p className="audience-description">{audience.description}</p>
              <ul className="audience-benefits">
                {audience.benefits.map((benefit) => (
                  <li key={benefit}><span className="audience-check" aria-hidden="true">✓</span>{benefit}</li>
                ))}
              </ul>
              <div className="audience-bottom">
                {audience.id === "business" ? <Link to="/login">Conecte sua farmácia</Link> : <a href="#mapa">Ver conexões no mapa</a>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
