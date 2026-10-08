import susLogo from "../../assets/sus.svg";
import farmaciaLogo from "../../assets/farmacia-popular.png";
import "../../styles/partnerAudience.css";

const partners = [
  { id: "sus", name: "SUS", category: "Sistema Único de Saúde", logo: susLogo, title: "Saúde para todos.", description: "Uma rede pública que acompanha o cuidado, da atenção básica aos serviços especializados.", tags: ["Saúde pública", "Cuidado integral"], url: "https://www.gov.br/saude/pt-br/sus", link: "Conheça o SUS" },
  { id: "popular", name: "Farmácia Popular", category: "Programa do Ministério da Saúde", logo: farmaciaLogo, title: "O cuidado mais perto.", description: "Acesso a medicamentos essenciais por meio das farmácias participantes do programa.", tags: ["Medicamentos essenciais", "Farmácias participantes"], url: "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular", link: "Conheça o programa" },
];

export default function PartnersSection() {
  return (
    <section className="lp-section lp-partners" id="parceiros" aria-labelledby="partners-title">
      <div className="lp-section-inner">
        <header className="lp-section-head">
          <h2 className="lp-section-title" id="partners-title">Parceiros de <span className="green">Confiança</span></h2>
          <p className="lp-section-sub">Conheça as iniciativas que aproximam a saúde e os medicamentos de quem precisa.</p>
        </header>
        <div className="partner-grid">
          {partners.map(partner => (
            <article className={`partner-card partner-card--${partner.id}`} key={partner.id}>
              <div className="partner-brand-panel">
                <span className="partner-category">{partner.category}</span>
                <div className="partner-brand">
                  <img src={partner.logo} alt={`Marca ${partner.name}`} loading="lazy" decoding="async" />
                  {partner.id === "popular" && <span className="partner-wordmark">Farmácia<br /><strong>Popular</strong></span>}
                </div>
                <span className="partner-brand-caption">{partner.name}</span>
              </div>
              <div className="partner-body">
                <h3>{partner.title}</h3>
                <p>{partner.description}</p>
                <ul className="partner-tags" aria-label={`Áreas de atuação: ${partner.name}`}>
                  {partner.tags.map(tag => <li key={tag}>{tag}</li>)}
                </ul>
                <a className="partner-link" href={partner.url} target="_blank" rel="noopener noreferrer">
                  <span>{partner.link}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
