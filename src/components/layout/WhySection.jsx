import stockImage from "../../assets/benefit-stock.png";
import securityImage from "../../assets/benefit-security.png";
import deliveryImage from "../../assets/benefit-delivery.png";
import "../../styles/whySection.css";

const benefits = [
  { id: "stock", title: "Estoque", accent: "inteligente", description: "Encontre os medicamentos que faltam e dê mais movimento ao seu estoque.", image: stockImage, href: "#mapa", link: "Explore a rede" },
  { id: "security", title: "Plataforma", accent: "segura", description: "Conecte sua farmácia a fornecedores e parceiros em um só lugar.", image: securityImage, href: "#parceiros", link: "Conheça os parceiros" },
  { id: "delivery", title: "Distribuição", accent: "rápida", description: "Da solicitação à entrega, acompanhe cada etapa do seu pedido.", image: deliveryImage, href: "#como-funciona", link: "Veja como funciona" },
];

export default function WhySection() {
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
            <article className={`benefit-card benefit-card--${benefit.id}`} key={benefit.id}>
              <div className="benefit-copy">
                <h3>{benefit.title}<span>{benefit.accent}</span></h3>
                <p>{benefit.description}</p>
              </div>
              <img className="benefit-art" src={benefit.image} alt="" width="1254" height="1254" loading="lazy" decoding="async" />
              <a className="benefit-link" href={benefit.href}><span aria-hidden="true">↗</span>{benefit.link}</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
