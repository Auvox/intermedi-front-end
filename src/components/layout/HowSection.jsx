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

// Veículos para o visitante escolher; só ilustração. Desenhados de cima, de
// frente para +x, no mesmo tamanho do carrinho da rota.
const vehicles = [
  { id: "van", name: "Van", color: "#16804a", tint: "#e3f3e8" },
  { id: "caminhao", name: "Caminhão", color: "#2563eb", tint: "#dbe7fd" },
  { id: "carro", name: "Carro", color: "#dc2626", tint: "#fde2e2" },
  { id: "moto", name: "Moto", color: "#ea580c", tint: "#ffedd5" },
];
const VEHICLE_KEY = "intermedi:veiculo";

function Vehicle({ id, color, tint }) {
  const tyre = "#1d1d1f";
  if (id === "caminhao") return (
    <>
      <rect x="-31" y="-11" width="60" height="26" rx="6" fill="#173e2b" opacity=".12" />
      <g fill={tyre}>
        <rect x="-25" y="-15" width="8" height="4" rx="2" /><rect x="-14" y="-15" width="8" height="4" rx="2" /><rect x="14" y="-15" width="8" height="4" rx="2" />
        <rect x="-25" y="11" width="8" height="4" rx="2" /><rect x="-14" y="11" width="8" height="4" rx="2" /><rect x="14" y="11" width="8" height="4" rx="2" />
      </g>
      <rect x="-30" y="-12" width="38" height="24" rx="3" fill="#fff" stroke={color} strokeWidth="1.5" />
      <rect x="-26" y="-8" width="30" height="16" rx="2" fill={tint} />
      <rect x="10" y="-11" width="16" height="22" rx="5" fill={color} />
      <rect x="19" y="-8" width="4" height="16" rx="1.5" fill={tint} />
    </>
  );
  if (id === "carro") return (
    <>
      <rect x="-21" y="-9" width="46" height="24" rx="10" fill="#173e2b" opacity=".12" />
      <g fill={tyre}>
        <rect x="-16" y="-13" width="8" height="4" rx="2" /><rect x="9" y="-13" width="8" height="4" rx="2" />
        <rect x="-16" y="9" width="8" height="4" rx="2" /><rect x="9" y="9" width="8" height="4" rx="2" />
      </g>
      <rect x="-22" y="-11" width="44" height="22" rx="9" fill={color} />
      <rect x="-9" y="-8" width="15" height="16" rx="4" fill={tint} />
      <rect x="8" y="-8" width="5" height="16" rx="2" fill="#fff" opacity=".85" />
      <rect x="-15" y="-7" width="4" height="14" rx="2" fill="#fff" opacity=".7" />
    </>
  );
  if (id === "moto") return (
    <>
      <rect x="-23" y="-6" width="46" height="16" rx="8" fill="#173e2b" opacity=".12" />
      <rect x="-21" y="-2.5" width="10" height="5" rx="2.5" fill={tyre} />
      <rect x="12" y="-2.5" width="10" height="5" rx="2.5" fill={tyre} />
      <rect x="-23" y="-8" width="11" height="16" rx="2" fill="#fff" stroke={color} strokeWidth="1.5" />
      <rect x="-12" y="-4" width="24" height="8" rx="4" fill={color} />
      <path d="M10-9v18" stroke={tyre} strokeWidth="2" strokeLinecap="round" />
      <circle cx="-2" r="6" fill={tint} stroke={color} strokeWidth="1.5" />
    </>
  );
  return (
    <>
      <rect x="-23" y="-11" width="48" height="26" rx="9" fill="#173e2b" opacity=".12" />
      <g fill={color}>
        <rect x="-16" y="-14" width="8" height="5" rx="2" /><rect x="-16" y="9" width="8" height="5" rx="2" />
        <rect x="10" y="-14" width="8" height="5" rx="2" /><rect x="10" y="9" width="8" height="5" rx="2" />
      </g>
      <rect x="-24" y="-11" width="48" height="22" rx="7" fill="#fff" stroke={color} strokeWidth="1.5" />
      <path d="M5-10v20M13-8h5q3 8 0 16h-5q2-8 0-16Z" fill={tint} stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="-20" y="-8" width="21" height="16" rx="3" fill={tint} />
      <path d="M-10-4v8M-14 0h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
}

function readVehicle() {
  try {
    const saved = window.localStorage.getItem(VEHICLE_KEY);
    return vehicles.some(v => v.id === saved) ? saved : "van";
  } catch {
    return "van";
  }
}

function HowSection() {
  const [selected, setSelected] = useState(null);
  const [vehicleId, setVehicleId] = useState(readVehicle);
  const vehicle = vehicles.find(v => v.id === vehicleId);
  const pickers = useRef([]);
  const chooseVehicle = id => {
    setVehicleId(id);
    setSelected(current => current ?? 0);
    try { window.localStorage.setItem(VEHICLE_KEY, id); } catch { /* sem armazenamento: só não lembra */ }
  };
  // grupo de opções: as setas trocam de veículo, como num rádio
  const onPickerKey = (event, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + vehicles.length) % vehicles.length;
    chooseVehicle(vehicles[next].id);
    pickers.current[next]?.focus();
  };
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
    // o maior veículo (66 de comprimento) cabe atrás do marcador em qualquer tela
    const fit = Math.min(1, (stops.current[selected]?.offsetWidth ?? 72) / 66);
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
      car.current.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle}) scale(${direction * fit} ${fit})`);
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

        <div className="how-layout">
        <div className="how-controls">
        <div className="vehicle-picker" role="radiogroup" aria-label="Escolha o veículo da entrega">
          {vehicles.map((v, index) => (
            <button
              key={v.id}
              ref={element => { pickers.current[index] = element; }}
              type="button"
              role="radio"
              aria-checked={v.id === vehicleId}
              aria-label={v.name}
              title={v.name}
              tabIndex={v.id === vehicleId ? 0 : -1}
              className={`vehicle-option${v.id === vehicleId ? " is-chosen" : ""}`}
              style={{ "--vehicle": v.color, "--vehicle-tint": v.tint }}
              onClick={() => chooseVehicle(v.id)}
              onKeyDown={event => onPickerKey(event, index)}
            >
              <svg viewBox="-34 -18 68 36" aria-hidden="true"><Vehicle {...v} /></svg>
            </button>
          ))}
        </div>
        <p className="how-hint">
          <span className="how-hint-mouse">Passe o mouse sobre as etapas</span>
          <span className="how-hint-toque">Toque nas etapas</span>
        </p>
        </div>

        <div className="journey" ref={container}>
          <svg className="journey-route" viewBox={`0 0 ${route.width} ${route.height}`} fill="none" aria-hidden="true">
            <path ref={path} className="journey-road" d={route.d} />
            <path className="journey-road-line" d={route.d} />
          </svg>
          <svg className="journey-car-layer" viewBox={`0 0 ${route.width} ${route.height}`} fill="none" aria-hidden="true">
            <g ref={car} style={{ visibility: selected === null ? "hidden" : "visible" }}>
              <Vehicle {...vehicle} />
            </g>
          </svg>
          <ol className="journey-steps" aria-label="Etapas do pedido">
            {howSteps.map((step, index) => (
              <li className={`journey-step${selected === index ? " is-selected" : ""}`} key={step.icon}>
                <button className="journey-step-button" type="button" onPointerEnter={event => { if (event.pointerType !== "touch") setSelected(index); }} onFocus={() => setSelected(index)} onClick={() => setSelected(index)} aria-pressed={selected === index} aria-label={`Etapa ${index + 1}: ${step.title}. ${step.description}`}>
                <span className="journey-copy">
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
      </div>
    </section>
  );
}

export default HowSection;
