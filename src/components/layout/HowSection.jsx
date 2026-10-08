import { useEffect, useRef, useState } from "react";
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
  const [selected, setSelected] = useState(null);
  const [route, setRoute] = useState({ width: 1000, height: 400, d: "", stops: [] });
  const container = useRef(null);
  const path = useRef(null);
  const car = useRef(null);
  const stops = useRef([]);
  const progress = useRef(0);
  const frame = useRef(null);

  useEffect(() => {
    const measure = () => {
      const bounds = container.current.getBoundingClientRect();
      const points = stops.current.map(stop => {
        const rect = stop.getBoundingClientRect();
        return { x: rect.left - bounds.left + rect.width / 2, y: rect.top - bounds.top + rect.height / 2 };
      });
      const vertical = window.matchMedia("(max-width: 760px)").matches;
      let d = vertical ? `M${points[0].x} ${points[0].y - 26}` : `M24 ${points[0].y}`;
      const start = vertical ? { x: points[0].x, y: points[0].y - 26 } : { x: 24, y: points[0].y };
      let previous = start;
      for (const point of points) {
        if (vertical) d += `L${point.x} ${point.y}`;
        else {
          const middle = (previous.x + point.x) / 2;
          d += `C${middle} ${previous.y} ${middle} ${point.y} ${point.x} ${point.y}`;
        }
        previous = point;
      }
      if (!vertical) d += `H${bounds.width - 24}`;
      setRoute({ width: bounds.width, height: bounds.height, d, stops: points });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container.current);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selected === null || !route.d) return;
    const road = path.current;
    const length = road.getTotalLength();
    const destination = route.stops[selected];
    let target = 0;
    let nearest = Infinity;
    for (let distance = 0; distance <= length; distance += 1) {
      const point = road.getPointAtLength(distance);
      const delta = Math.hypot(point.x - destination.x, point.y - destination.y);
      if (delta < nearest) { nearest = delta; target = distance; }
    }
    const from = Math.min(progress.current, length);
    const direction = target >= from ? 1 : -1;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-motion") || document.body.classList.contains("a11y-motion");
    const duration = reduced ? 0 : Math.max(550, Math.abs(target - from) * 2.4);
    let start;
    const tick = time => {
      start ??= time;
      const fraction = duration ? Math.min((time - start) / duration, 1) : 1;
      const eased = fraction * fraction * (3 - 2 * fraction);
      const distance = from + (target - from) * eased;
      progress.current = distance;
      const point = road.getPointAtLength(distance);
      const before = road.getPointAtLength(Math.max(0, distance - 2));
      const after = road.getPointAtLength(Math.min(length, distance + 2));
      const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
      car.current.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle}) scale(${direction} 1)`);
      if (fraction < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [selected, route]);

  return (
    <section className="lp-section lp-how" id="como-funciona">
      <div className="lp-section-inner">
        <div className="lp-section-head">
          <h2 className="lp-section-title">
            <span className="chevron-left" aria-hidden="true">▶</span>
            {" "}Como a <span className="green">Inter</span>medi funciona{" "}
            <span className="chevron-right" aria-hidden="true">◀</span>
          </h2>
          <p className="lp-section-sub">Da primeira busca até a sua farmácia. Selecione uma etapa e percorra o caminho.</p>
        </div>

        <div className="journey" ref={container}>
          <svg className="journey-route" viewBox={`0 0 ${route.width} ${route.height}`} fill="none" aria-hidden="true">
            <path ref={path} className="journey-road" d={route.d} />
            <path className="journey-road-line" d={route.d} />
          </svg>
          <svg className="journey-car-layer" viewBox={`0 0 ${route.width} ${route.height}`} fill="none" aria-hidden="true">
            <g ref={car} style={{ visibility: selected === null ? "hidden" : "visible" }}>
              <rect x="-23" y="-11" width="48" height="26" rx="9" fill="#173e2b" opacity=".12" />
              <g fill="#236845">
                <rect x="-16" y="-14" width="8" height="5" rx="2" />
                <rect x="-16" y="9" width="8" height="5" rx="2" />
                <rect x="10" y="-14" width="8" height="5" rx="2" />
                <rect x="10" y="9" width="8" height="5" rx="2" />
              </g>
              <rect x="-24" y="-11" width="48" height="22" rx="7" fill="#fff" stroke="#236845" strokeWidth="1.5" />
              <path d="M5-10v20M13-8h5q3 8 0 16h-5q2-8 0-16Z" fill="#bce5d1" stroke="#236845" strokeWidth="1.2" strokeLinejoin="round" />
              <rect x="-20" y="-8" width="21" height="16" rx="3" fill="#eaf6ef" />
              <path d="M-10-4v8M-14 0h8" stroke="#236845" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M22-7v3M22 4v3" stroke="#82ad8c" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
          <ol className="journey-steps" aria-label="Etapas do pedido">
            {howSteps.map((step, index) => (
              <li className={`journey-step${selected === index ? " is-selected" : ""}`} key={step.icon}>
                <button className="journey-step-button" type="button" onPointerEnter={event => { if (event.pointerType !== "touch") setSelected(index); }} onFocus={() => setSelected(index)} onClick={() => setSelected(index)} aria-pressed={selected === index} aria-label={`Etapa ${index + 1}: ${step.title}. ${step.description}`}>
                <span className="journey-copy">
                  <span className="journey-number">0{index + 1}</span>
                  <span className="journey-title">{step.title}</span>
                  <span className="journey-description">{step.description}</span>
                </span>
                <span className="journey-stem" aria-hidden="true" />
                <span ref={element => { stops.current[index] = element; }} className="journey-stop"><StepIcon name={step.icon} /></span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default HowSection;
