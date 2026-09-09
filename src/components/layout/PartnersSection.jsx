import { Link } from "react-router-dom";
import "../../styles/partnerAudience.css";

function AudienceIcon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'store' ? <path d="M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0M9 21v-6h6v6" /> : name === 'pin' ? <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><path d="M12 6v8M8 10h8" /></> : <path d="M5 12h14m-6-6 6 6-6 6" />}
  </svg>;
}

function NetworkArt() {
  return <div className="audience-art audience-network" aria-hidden="true">
    <div className="network-orbit network-orbit--outer" /><div className="network-orbit" />
    <svg className="network-lines" viewBox="0 0 440 210"><path d="M75 55 220 105 365 60M95 165 220 105 350 166" /></svg>
    <span className="network-node node-one"><AudienceIcon name="store" /></span>
    <span className="network-node node-two"><AudienceIcon name="store" /></span>
    <span className="network-node node-three">+</span>
    <span className="network-node node-four">+</span>
    <div className="network-center"><span>intermedi<span className="network-dot">.</span></span><small>O cuidado conecta.</small></div>
    <span className="art-caption network-caption"><i /> Uma rede. Mais possibilidades.</span>
  </div>;
}

function NeighborhoodArt() {
  return <div className="audience-art audience-neighborhood" aria-hidden="true">
    <div className="neighborhood-map"><div className="map-block block-one" /><div className="map-block block-two" /><div className="map-block block-three" /><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /></div>
    <span className="neighborhood-radius" /><span className="neighborhood-location"><i /></span>
    <span className="neighborhood-pin pin-one"><AudienceIcon name="store" /></span><span className="neighborhood-pin pin-two"><AudienceIcon name="store" /></span>
    <div className="neighborhood-label"><span className="neighborhood-label-icon"><AudienceIcon name="pin" /></span><div><strong>O cuidado está por perto.</strong><small>Encontre sua próxima conexão.</small></div></div>
  </div>;
}

const audiences = [
  { id: 'business', title: <>Sua farmácia.<br /><em>Novas possibilidades.</em></>, name: 'Farmácias & distribuidores', description: 'Conecte sua operação a uma rede que aproxima fornecedores, organiza o estoque e faz o cuidado chegar mais longe.', benefits: ['Gestão de estoque', 'Compras simplificadas', 'Fornecedores confiáveis', 'Relatórios inteligentes'] },
  { id: 'consumer', title: <>Sua saúde.<br /><em>Mais perto de você.</em></>, name: 'Consumidores', description: 'Menos procura, mais cuidado. Encontre medicamentos e conheça as farmácias que fazem parte da sua região.', benefits: ['Busca de medicamentos', 'Comparação de preços', 'Farmácias na sua região', 'Consulta de disponibilidade'] },
];

export default function PartnersSection() {
  return <section className="lp-section lp-partners" id="parceiros" aria-labelledby="audience-title">
    <div className="lp-section-inner">
      <header className="lp-section-head">
        <h2 className="lp-section-title" id="audience-title">
          <span className="chevron-left" aria-hidden="true">▶</span>{" "}
          Parceiros de <span className="green">Confiança</span>{" "}
          <span className="chevron-right" aria-hidden="true">◀</span>
        </h2>
        <p className="lp-section-sub">Conectamos farmácias, distribuidores e laboratórios parceiros para garantir qualidade, segurança e eficiência na distribuição de medicamentos.</p>
      </header>
      <div className="audience-grid">{audiences.map((audience) => <article className={`audience-card audience-card--${audience.id}`} key={audience.id}>
        <div className="audience-copy"><p className="audience-name">{audience.name}</p><h3>{audience.title}</h3><p className="audience-description">{audience.description}</p></div>
        {audience.id === 'business' ? <NetworkArt /> : <NeighborhoodArt />}
        <ul className="audience-benefits">{audience.benefits.map((benefit) => <li key={benefit}><span className="audience-check" aria-hidden="true">✓</span>{benefit}</li>)}</ul>
        <div className="audience-bottom">{audience.id === 'business' ? <Link to="/login">Conecte sua farmácia <AudienceIcon name="arrow" /></Link> : <a href="#mapa">Explore as farmácias <AudienceIcon name="arrow" /></a>}</div>
      </article>)}</div>
    </div>
  </section>;
}

