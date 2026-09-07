import "../../styles/howSection.css";

const howSteps = [
  { title: "Busca", description: "Encontre o medicamento que sua farmácia precisa.", icon: "search" },
  { title: "Fornecedor", description: "Conecte-se a quem tem o produto disponível.", icon: "store" },
  { title: "Pedido", description: "Solicite os itens e organize sua compra em um só lugar.", icon: "order" },
  { title: "Entrega", description: "Acompanhe o pedido até ele chegar à sua farmácia.", icon: "box" },
];

function StepIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>}
      {name === "store" && <><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10c0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0 0 3 4.5 3 4.5 0M9 20v-6h6v6" /></>}
      {name === "order" && <><path d="M8 5H5v16h14V5h-3M9 12h6M9 16h4" /><rect x="8" y="3" width="8" height="4" rx="1" /></>}
      {name === "box" && <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v10l9 5 9-5V8M12 13v10M7.5 5.5l9 5V15" /></>}
    </svg>
  );
}

function HowSection() {
  return (
    <section className="lp-section lp-how" id="como-funciona">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 className="lp-section-title">
            <span className="chevron-left" aria-hidden="true">▶</span>
            {" "}Como a <span className="green">Inter</span>medi funciona{" "}
            <span className="chevron-right" aria-hidden="true">◀</span>
          </h2>
          <p className="lp-section-sub">Encontre, solicite e acompanhe medicamentos em uma plataforma integrada, segura e eficiente.</p>
        </div>

        <div className="journey">
          <svg className="journey-route" viewBox="0 0 1000 360" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path className="journey-road" d="M30 220H125C250 220 250 120 375 120S500 220 625 220 750 120 875 120H970" />
            <path className="journey-road-line" d="M30 220H125C250 220 250 120 375 120S500 220 625 220 750 120 875 120H970" />
            <circle cx="30" cy="220" r="4" fill="#76b68c" />
            <path d="m963 115 6 5-6 5" stroke="#398555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <ol className="journey-steps" aria-label="Etapas do pedido">
            {howSteps.map((step, index) => (
              <li className="journey-step" key={step.icon}>
                <div className="journey-copy">
                  <span className="journey-number">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                <span className="journey-stem" aria-hidden="true" />
                <span className="journey-stop"><StepIcon name={step.icon} /></span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default HowSection;
