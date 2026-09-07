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

const FEED_MSGS = [
  (a, b, m) => `Match: ${a} → ${b} (${m})`,
  (a, b, m) => `${a} enviando ${m} para ${b}`,
  (a, b, m) => `Chamado resolvido: ${m} em ${b}`,
];

export default function MapSection() {
  const [matchCount, setMatchCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [medCount, setMedCount] = useState(0);
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

  // Contador animado (Dashboard numérico)
  useEffect(() => {
    const targets = [
      { set: setMatchCount, val: 3842, dur: 1400 },
      { set: setActiveCount, val: 874, dur: 1000 },
      { set: setMedCount, val: 127, dur: 800 },
    ];
    const timers = targets.map(({ set, val, dur }) => {
      const step = val / (dur / 16);
      let cur = 0;
      const id = setInterval(() => {
        cur = Math.min(cur + step, val);
        set(Math.round(cur));
        if (cur >= val) clearInterval(id);
      }, 16);
      return id;
    });
    return () => timers.forEach(clearInterval);
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
      const msgFn = FEED_MSGS[Math.floor(Math.random() * FEED_MSGS.length)];

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
        setMatchCount((c) => c + 1);

        setFeed((prev) =>
          [
            { id: ++idRef.current, text: msgFn(a.name, b.name, med) },
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
            <span className="map-badge-dot" />
            AO VIVO
          </div>
          <h2 className="map-section-title">
            Matches acontecendo <span className="green">agora</span> em São
            Paulo
          </h2>
          <p className="map-section-subtitle">
            Veja em tempo real as conexões entre farmácias acontecendo pelo estado.
          </p>
        </div>

        <div className="map-wrapper reveal">
          {/* COLUNA DA ESQUERDA: Agrupa o Mapa e a Legenda logo abaixo dele */}
          <div className="map-main-content">
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
          <aside className="map-sidebar">
            <div className="map-stat-pill">
              <div className="map-stat-pill-value">
                {matchCount.toLocaleString("pt-BR")}
              </div>
              <div className="map-stat-pill-label">Matches hoje em SP</div>
            </div>
            <div className="map-stat-pill">
              <div className="map-stat-pill-value">
                {activeCount.toLocaleString("pt-BR")}
              </div>
              <div className="map-stat-pill-label">Farmácias ativas agora</div>
            </div>
            <div className="map-stat-pill">
              <div className="map-stat-pill-value">{medCount}</div>
              <div className="map-stat-pill-label">
                Medicamentos em trânsito
              </div>
            </div>
          </aside>

          {/* PARTE INFERIOR: Feed ocupando toda a largura */}
          <div className="map-feed">
            <div className="map-feed-title">Atividade recente</div>
            <div className="map-feed-list">
              {feed.map((item) => (
                <div key={item.id} className="map-feed-item">
                  <span className="map-feed-dot" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
