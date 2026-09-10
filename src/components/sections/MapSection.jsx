import { useEffect, useRef, useState } from "react";
import "../../styles/mapSection.css";
import mapaSvg from "../../assets/mapa-svg.svg";

// Cidades paulistas com coordenadas calibradas milimetricamente para o mapa-svg.svg
// viewBox proporcional padrão: "0 0 800 480"
const CITIES = [
  { id: "sp", name: "São Paulo", x: 554, y: 352, label: "São Paulo" },
  { id: "camp", name: "Campinas", x: 512, y: 312, label: "Campinas" },
  { id: "rib", name: "Ribeirão Preto", x: 480, y: 184, label: "Rib. Preto" },
  {
    id: "sjc",
    name: "São José dos Campos",
    x: 574,
    y: 328,
    label: "SJ Campos",
  },
  { id: "sor", name: "Sorocaba", x: 472, y: 348, label: "Sorocaba" },

  { id: "bauru", name: "Bauru", x: 375, y: 260, label: "Bauru" }, // Ajustado y de 275 para 260
  { id: "mar", name: "Marília", x: 308, y: 272, label: "Marília" }, // Ajustado y de 286 para 272
  { id: "ara", name: "Araçatuba", x: 236, y: 212, label: "Araçatuba" },
  // AJUSTADO: x fixado em 180 (extremo oeste) e y em 276 (altura correta no bico do mapa)

  { id: "rpr", name: "São J. Rio Preto", x: 350, y: 162, label: "Rio Preto" },
  { id: "pir", name: "Piracicaba", x: 464, y: 298, label: "Piracicaba" },
  { id: "taub", name: "Taubaté", x: 605, y: 314, label: "Taubaté" },
  { id: "fran", name: "Franca", x: 520, y: 132, label: "Franca" },
  { id: "outu", name: "Ourinhos", x: 352, y: 325, label: "Ourinhos" }, // Ajustado y de 345 para 325
  { id: "votp", name: "Votuporanga", x: 298, y: 135, label: "Votuporanga" },
];

const MEDS = [
  "Amoxicilina 500mg",
  "Dipirona 1g",
  "Losartana 50mg",
  "Metformina 850mg",
  "Omeprazol 20mg",
  "Atorvastatina 40mg",
  "Levotiroxina 50mcg",
  "Azitromicina 500mg",
  "Ibuprofeno 600mg",
  "Sinvastatina 20mg",
];

const FEED_TYPES = [
  { id: "match", label: "Conexão encontrada", path: "M8 12h8m-3-3 3 3-3 3M9 5H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h3m6-14h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-3" },
  { id: "shipping", label: "Em transporte", path: "M3 6h11v12H3zM14 10h4l3 4v4h-7M7 18v1m11-1v1M3 10h7" },
  { id: "resolved", label: "Chamado resolvido", path: "m8 12 3 3 5-6M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" },
];

export default function MapSection() {
  const [activityCounts, setActivityCounts] = useState({ match: 0, shipping: 0, resolved: 0 });
  const [feed, setFeed] = useState([]);
  const [lines, setLines] = useState([]);
  const [pulses, setPulses] = useState([]);
  const [cities, setCities] = useState([]);

  const idRef = useRef(0);
  const citiesRef = useRef([]);
  const sectionRef = useRef(null);

  // Efeito de revelação ao rolar o scroll
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll(".reveal").forEach((c) =>
            c.classList.add("visible")
          );
          obs.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -50px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Inicialização e atribuição das cores das farmácias
  useEffect(() => {
    const assigned = CITIES.map((c) => {
      const isShort = Math.random() > 0.5;
      return {
        ...c,
        isShort,
        color: isShort ? "#f97316" : "#22c55e",
      };
    });
    citiesRef.current = assigned;
    setCities(assigned);
  }, []);

  // Controle de conexões e animações em tempo real (Sem Warnings)
  useEffect(() => {
    const activeIntervals = [];
    const activeTimeouts = [];
    let isMounted = true;

    const fireMatch = () => {
      if (!isMounted) return;

      const cc = citiesRef.current;
      if (!cc.length) return;

      const shorts = cc.filter((c) => c.isShort);
      const longs = cc.filter((c) => !c.isShort);
      if (!shorts.length || !longs.length) return;

      const a = shorts[Math.floor(Math.random() * shorts.length)];
      const b = longs[Math.floor(Math.random() * longs.length)];
      if (a.id === b.id) return;

      const med = MEDS[Math.floor(Math.random() * MEDS.length)];
      const activity = FEED_TYPES[Math.floor(Math.random() * FEED_TYPES.length)];

      const lid = ++idRef.current;
      const pid = ++idRef.current;

      // Animação de pulso na origem
      setPulses((prev) => [
        ...prev,
        { id: pid, cx: a.x, cy: a.y, r: 4, opacity: 0.8 },
      ]);

      const gp = setInterval(() => {
        if (!isMounted) return;
        setPulses((prev) =>
          prev
            .map((p) =>
              p.id === pid
                ? { ...p, r: p.r + 1.2, opacity: p.opacity - 0.05 }
                : p
            )
            .filter((p) => p.opacity > 0)
        );
      }, 30);
      activeIntervals.push(gp);

      const tGp = setTimeout(() => {
        clearInterval(gp);
        const index = activeIntervals.indexOf(gp);
        if (index > -1) activeIntervals.splice(index, 1);
      }, 600);
      activeTimeouts.push(tGp);

      // Trajetória da linha
      setLines((prev) => [
        ...prev,
        { id: lid, x1: a.x, y1: a.y, x2: a.x, y2: a.y, prog: 0 },
      ]);

      const al = setInterval(() => {
        if (!isMounted) return;
        setLines((prev) =>
          prev.map((l) => {
            if (l.id !== lid) return l;
            const prog = Math.min(l.prog + 0.025, 1);
            return {
              ...l,
              x2: a.x + (b.x - a.x) * prog,
              y2: a.y + (b.y - a.y) * prog,
              prog,
            };
          })
        );
      }, 20);
      activeIntervals.push(al);

      // Finalização do trajeto e inserção no feed
      const tAl = setTimeout(() => {
        clearInterval(al);
        const index = activeIntervals.indexOf(al);
        if (index > -1) activeIntervals.splice(index, 1);

        if (!isMounted) return;
        setLines((prev) => prev.filter((l) => l.id !== lid));
        setActivityCounts((counts) => ({ ...counts, [activity.id]: counts[activity.id] + 1 }));

        setFeed((prev) =>
          [
            { id: ++idRef.current, activity, medicine: med, origin: a.name, destination: b.name },
            ...prev,
          ].slice(0, 4)
        );
      }, 40 * 40 + 800);
      activeTimeouts.push(tAl);
    };

    const initialDelays = [800, 1600, 2800, 4000];
    initialDelays.forEach((d) => {
      const t = setTimeout(fireMatch, d);
      activeTimeouts.push(t);
    });

    const interval = setInterval(fireMatch, 3200);

    return () => {
      isMounted = false;
      clearInterval(interval);
      activeIntervals.forEach(clearInterval);
      activeTimeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <section className="section mapsection" id="mapa" ref={sectionRef}>
      <div className="section-container">
        {/* Header da Seção integrado ao estilo do Hero */}
        <div className="section-header reveal">
          <div className="map-badge">
            <svg className="map-badge-signal" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            AO VIVO
          </div>
          <h2 className="map-section-title">
            Matches acontecendo <span className="green">agora</span> em{" "}
            <span className="map-title-region">São Paulo</span>
          </h2>
          <p className="map-section-subtitle">
            Veja em tempo real as conexões entre farmácias acontecendo pelo estado.
          </p>
        </div>

        <div className="map-wrapper reveal">
          {/* COLUNA DA ESQUERDA: Agrupa o Mapa e a Legenda logo abaixo dele */}
          <div className="map-main-content">
            <div className="map-panel-heading">
              <span><span className="map-region-mark" aria-hidden="true">+</span> Uma rede que aproxima</span>
              <span className="map-region-label">São Paulo · SP</span>
            </div>
            <div className="map-svg-container">
              <img
                src={mapaSvg}
                alt="Mapa de São Paulo"
                className="sp-map-image"
              />

              <svg className="map-overlay" viewBox="0 0 800 480">
                {pulses.map((p) => (
                  <circle
                    key={p.id}
                    cx={p.cx}
                    cy={p.cy}
                    r={p.r}
                    fill="none"
                    stroke="#2e6ff2" /* Azul sutil para os pulsos */
                    strokeWidth="1.5"
                    opacity={p.opacity}
                  />
                ))}

                {lines.map((l) => (
                  <g key={l.id}>
                    <line
                      x1={l.x1}
                      y1={l.y1}
                      x2={l.x2}
                      y2={l.y2}
                      stroke="#2e6ff2"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                      opacity="0.7"
                    />
                    <circle cx={l.x2} cy={l.y2} r="3" fill="#2e6ff2" />
                  </g>
                ))}

                {cities.map((c) => (
                  <g key={c.id} transform={`translate(${c.x},${c.y})`}>
                    <circle r="9" fill={c.color} opacity="0.18" />
                    <circle
                      r="4.5"
                      fill={c.color}
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <text
                      x="8"
                      y="4"
                      fontSize="9"
                      fill="#1e293b"
                      fontFamily="DM Sans, sans-serif"
                      fontWeight="600"
                    >
                      {c.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Legenda reposicionada e limpa */}
            <div className="map-legend">
              <div className="map-legend-item">
                <span
                  className="map-legend-dot"
                  style={{ background: "#2ecc71" }}
                />
                Farmácia com sobra
              </div>
              <div className="map-legend-item">
                <span
                  className="map-legend-dot"
                  style={{ background: "#e67e22" }}
                />
                Farmácia com falta
              </div>
              <div className="map-legend-item">
                <span
                  className="map-legend-line"
                  style={{ background: "#2e6ff2" }}
                />
                Match em andamento
              </div>
            </div>
          </div>

          {/* COLUNA DA DIREITA: Painel Lateral com os Cards */}
          <aside className="map-sidebar" aria-label="Indicadores da rede">
            {FEED_TYPES.map((activity) => (
              <div key={activity.id} className={`map-stat-pill map-network-stat map-network-stat--${activity.id}`}>
                <div className="map-network-stat-top">
                  <span className="map-network-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={activity.path} /></svg></span>
                  <span className="map-network-category">{activity.label}</span>
                </div>
                <div className="map-stat-pill-value">{activityCounts[activity.id].toLocaleString("pt-BR")}</div>
                <div className="map-stat-pill-label">{activity.id === "match" ? "Conexões entre farmácias" : activity.id === "shipping" ? "Envios registrados" : "Chamados resolvidos"}</div>
                <p className="map-network-description">{activity.id === "match" ? "Disponibilidade e necessidade se encontram." : activity.id === "shipping" ? "Medicamentos a caminho de quem precisa." : "Mais uma necessidade atendida pela rede."}</p>
              </div>
            ))}
          </aside>

          {/* PARTE INFERIOR: Feed ocupando toda a largura */}
          <div className="map-feed">
            <div className="map-feed-heading">
              <div>
                <h3 className="map-feed-title">A rede em movimento</h3>
                <p className="map-feed-subtitle">Conexões que aproximam o cuidado de quem precisa.</p>
              </div>
            </div>
            <div className="map-feed-list">
              {feed.length === 0 && <p className="map-feed-empty">Preparando as conexões no mapa…</p>}
              {feed.map((item) => (
                <div key={item.id} className={`map-feed-item map-feed-item--${item.activity.id}`}>
                  <span className="map-feed-dot" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={item.activity.path} /></svg>
                  </span>
                  <div className="map-feed-detail">
                    <span className="map-feed-type">{item.activity.label}</span>
                    <strong className="map-feed-medicine">{item.medicine}</strong>
                    <span className="map-feed-route">{item.activity.id === "resolved" ? <>Atendimento em <b>{item.destination}</b></> : <><span>{item.origin}</span><span aria-label="para">→</span><span>{item.destination}</span></>}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
