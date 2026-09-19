import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/adminDashboard.css";

/*
 * Tela apenas visual (front). Nenhuma chamada de API, nenhuma persistência.
 * Todos os números abaixo são fixtures para o pessoal do back plugar depois.
 */

const quickActions = [
  { label: "Solicitar lote", icon: "pill", tone: "dark" },
  { label: "Transferência", icon: "truck" },
  { label: "Cadastrar gerente", icon: "users", to: "/admin/gerentes" },
  { label: "Cadastrar remédio", icon: "pill" },
];

const quickRequests = [
  "Farmácia Central",
  "Farmácia Jardim",
  "Farmácia São Pedro",
  "Farmácia Vila Nova",
];

const networkIndicators = [
  {
    icon: "pill",
    label: "Medicamentos em falta",
    value: "42",
    delta: "12%",
    trend: "up",
    note: "em relação à semana anterior",
  },
  {
    icon: "pharmacy",
    label: "Unidades em alerta",
    value: "5",
    delta: "3%",
    trend: "up",
    note: "do total de 12 unidades",
  },
  {
    icon: "truck",
    label: "Ordens em andamento",
    value: "8",
    delta: "20%",
    trend: "down",
    note: "em relação à semana anterior",
  },
  {
    icon: "users",
    label: "Pacientes atendidos (mês)",
    value: "12.842",
    delta: "18%",
    trend: "up",
    note: "em relação ao mês anterior",
  },
];

const unitRanking = [
  {
    name: "Farmácia Central",
    status: "Crítico",
    tone: "red",
    rate: "92%",
    color: "#e2544c",
    spark: [42, 38, 47, 44, 52, 58, 55, 63, 69, 74],
  },
  {
    name: "Farmácia Jardim",
    status: "Alto",
    tone: "yellow",
    rate: "78%",
    color: "#e0a52b",
    spark: [30, 34, 31, 38, 41, 39, 46, 50, 54, 61],
  },
  {
    name: "Farmácia Vila Nova",
    status: "Normal",
    tone: "green",
    rate: "65%",
    color: "#27a45e",
    spark: [24, 27, 26, 31, 34, 33, 38, 41, 45, 49],
  },
  {
    name: "Farmácia São Pedro",
    status: "Normal",
    tone: "blue",
    rate: "58%",
    color: "#3d8ede",
    spark: [20, 22, 25, 24, 28, 31, 30, 35, 38, 42],
  },
  {
    name: "Farmácia Três Rios",
    status: "Abaixo",
    tone: "blue",
    rate: "42%",
    color: "#68b1ec",
    spark: [14, 16, 15, 19, 21, 20, 24, 26, 29, 32],
  },
];

const priorityMatrix = [
  {
    region: "Centro",
    medicine: "Paracetamol 500mg",
    population: "24.570",
    urgency: "Crítica",
    tone: "red",
  },
  {
    region: "Zona Leste",
    medicine: "Amoxicilina 500mg",
    population: "18.320",
    urgency: "Alta",
    tone: "yellow",
  },
  {
    region: "Zona Norte",
    medicine: "Dipirona 500mg",
    population: "12.840",
    urgency: "Alta",
    tone: "yellow",
  },
  {
    region: "Zona Oeste",
    medicine: "Losartana 50mg",
    population: "9.760",
    urgency: "Média",
    tone: "yellow",
  },
  {
    region: "Zona Sul",
    medicine: "Ibuprofeno 600mg",
    population: "7.430",
    urgency: "Baixa",
    tone: "green",
  },
];

const recentOrders = [
  {
    date: "17/09 14:21",
    type: "Compra",
    unit: "Farmácia Central",
    medicine: "Paracetamol 500mg",
    amount: "1.000",
    status: "Em andamento",
    tone: "green",
  },
  {
    date: "17/09 12:03",
    type: "Transferência",
    unit: "Farmácia Jardim",
    medicine: "Amoxicilina 500mg",
    amount: "500",
    status: "Enviado",
    tone: "blue",
  },
  {
    date: "16/09 16:45",
    type: "Compra",
    unit: "Farmácia Vila Nova",
    medicine: "Dipirona 500mg",
    amount: "800",
    status: "Pendente",
    tone: "yellow",
  },
  {
    date: "16/09 10:17",
    type: "Transferência",
    unit: "Farmácia São Pedro",
    medicine: "Losartana 50mg",
    amount: "300",
    status: "Concluída",
    tone: "neutral",
  },
];

const demandMonths = [
  "Out",
  "Nov",
  "Dez",
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
];
const realConsumption = [
  4200, 3600, 3400, 5200, 6800, 6600, 7000, 8200, 8600, 9200, 10500, 11800,
];
const forecastConsumption = [
  4600, 4000, 3800, 6100, 7900, 7300, 7900, 9300, 9500, 10300, 11500, 12600,
];

function DashIcon({ name, size = 18 }) {
  const paths = {
    pill: (
      <>
        <path d="m9 4-5 5a6.4 6.4 0 0 0 9 9l5-5a6.4 6.4 0 0 0-9-9Z" />
        <path d="m7 7 9 9" />
      </>
    ),
    truck: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="17" cy="18" r="1.8" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-1.5a6 6 0 0 1 12 0V20M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v1" />
      </>
    ),
    pharmacy: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M10 21v-5h4v5M12 6v6m-3-3h6" />
      </>
    ),
    home: (
      <>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
        <path d="M12 8v5m-2.5-2.5h5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5m16 14H4" />
        <path d="M8 16V11m4 5V7m4 9v-6" />
      </>
    ),
    donut: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </>
    ),
    spark: <path d="m13 2-9 12h7l-1 8 9-12h-7z" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4m8-4v4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    camera: (
      <>
        <rect x="3" y="6" width="18" height="14" rx="3" />
        <circle cx="12" cy="13" r="3.5" />
        <path d="M8 6l1.5-2h5L16 6" />
      </>
    ),
    plus: <path d="M12 6v12M6 12h12" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    up: <path d="M12 19V5m-6 6 6-6 6 6" />,
    down: <path d="M12 5v14m6-6-6 6-6-6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function sparkPath(values, width, height, pad = 3) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (width - pad * 2) / (values.length - 1);
  return values
    .map((value, index) => {
      const x = pad + index * step;
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const middle = (current.x + next.x) / 2;
    d += ` C${middle.toFixed(1)} ${current.y.toFixed(1)} ${middle.toFixed(1)} ${next.y.toFixed(1)} ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return d;
}

function Sparkline({ values, color }) {
  return (
    <svg
      className="adm-spark"
      viewBox="0 0 96 30"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={sparkPath(values, 96, 30)}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DemandChart() {
  const width = 360;
  const height = 150;
  const padLeft = 30;
  const padRight = 6;
  const padTop = 10;
  const padBottom = 22;
  const maxValue = 15000;

  const toPoints = (series) =>
    series.map((value, index) => ({
      x:
        padLeft +
        (index * (width - padLeft - padRight)) / (series.length - 1),
      y:
        padTop +
        (1 - value / maxValue) * (height - padTop - padBottom),
    }));

  const realPoints = toPoints(realConsumption);
  const forecastPoints = toPoints(forecastConsumption);
  const realLine = smoothPath(realPoints);
  const areaPath = `${realLine} L${(width - padRight).toFixed(1)} ${(height - padBottom).toFixed(1)} L${padLeft.toFixed(1)} ${(height - padBottom).toFixed(1)} Z`;

  return (
    <svg
      className="adm-demand-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Consumo real comparado à demanda prevista nos últimos 12 meses"
    >
      <defs>
        <linearGradient id="adm-demand-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2aa45f" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2aa45f" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 5000, 10000, 15000].map((tick) => {
        const y =
          padTop + (1 - tick / maxValue) * (height - padTop - padBottom);
        return (
          <g key={tick}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="#e8efea"
              strokeWidth="1"
            />
            <text x={padLeft - 6} y={y + 3} className="adm-axis" textAnchor="end">
              {tick ? `${tick / 1000}k` : "0"}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#adm-demand-fill)" />
      <path
        d={smoothPath(forecastPoints)}
        fill="none"
        stroke="#7fbf9b"
        strokeWidth="1.8"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <path
        d={realLine}
        fill="none"
        stroke="#1f9455"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {demandMonths.map((month, index) => (
        <text
          key={month}
          x={realPoints[index].x}
          y={height - 6}
          className="adm-axis"
          textAnchor="middle"
        >
          {month}
        </text>
      ))}
    </svg>
  );
}

function StockDonut({ percent = 68 }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;

  return (
    <svg
      className="adm-donut"
      viewBox="0 0 140 140"
      role="img"
      aria-label={`${percent}% da demanda atendida`}
    >
      <defs>
        <linearGradient id="adm-donut-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0f7a41" />
          <stop offset="60%" stopColor="#25a55f" />
          <stop offset="100%" stopColor="#55c184" />
        </linearGradient>
      </defs>
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="#e7ecea"
        strokeWidth="18"
      />
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="url(#adm-donut-grad)"
        strokeWidth="18"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="68" className="adm-donut-value" textAnchor="middle">
        {percent}%
      </text>
      <text x="70" y="84" className="adm-donut-caption" textAnchor="middle">
        da demanda
      </text>
      <text x="70" y="96" className="adm-donut-caption" textAnchor="middle">
        atendida
      </text>
    </svg>
  );
}

function CardHead({ icon, title, description, action }) {
  return (
    <header className="adm-card-head">
      <span className="adm-card-icon">
        <DashIcon name={icon} size={19} />
      </span>
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export default function AdminDashboard() {
  useEffect(() => {
    document.title = "Dashboard | Intermedi";
  }, []);

  const now = useMemo(() => new Date(), []);
  const currentDate = now.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentTime = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="adm-dash">
      {/* Cabeçalho + ações rápidas */}
      <section className="adm-dash-grid adm-dash-grid-hero">
        <article className="adm-hero">
          <div className="adm-hero-meta">
            <span className="adm-chip adm-chip-dark">BEM-VINDO, ADMIN</span>
            <div className="adm-hero-when">
              <span>
                <DashIcon name="calendar" size={15} /> {currentDate}
              </span>
              <span>
                <DashIcon name="clock" size={15} /> {currentTime}
              </span>
            </div>
          </div>
          <h1>Visão geral da plataforma</h1>
          <div className="adm-hero-bottom">
            <p>
              Acompanhe o desempenho, antecipe demandas e mantenha a rede sempre
              abastecida. Tudo em um só lugar.
            </p>
            <span className="adm-chip adm-chip-live">Sistema operacional</span>
          </div>
        </article>

        <article className="adm-card adm-quick">
          <header className="adm-card-head adm-card-head-tight">
            <span className="adm-card-icon">
              <DashIcon name="spark" size={18} />
            </span>
            <div>
              <h2>Ações rápidas</h2>
            </div>
          </header>
          <div className="adm-quick-grid">
            {quickActions.map((action) =>
              action.to ? (
                <Link
                  key={action.label}
                  to={action.to}
                  className={`adm-quick-item${action.tone === "dark" ? " is-dark" : ""}`}
                >
                  <DashIcon name={action.icon} size={17} />
                  <span>{action.label}</span>
                  <i aria-hidden="true">
                    <DashIcon name="arrow" size={14} />
                  </i>
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className={`adm-quick-item${action.tone === "dark" ? " is-dark" : ""}`}
                >
                  <DashIcon name={action.icon} size={17} />
                  <span>{action.label}</span>
                  <i aria-hidden="true">
                    <DashIcon name="arrow" size={14} />
                  </i>
                </button>
              ),
            )}
          </div>
        </article>
      </section>

      {/* Estoque, solicitações e indicadores */}
      <section className="adm-dash-grid adm-dash-grid-a">
        <article className="adm-card">
          <CardHead
            icon="donut"
            title="Procura vs. Estoque"
            description="Demanda real x estoque disponível"
          />
          <div className="adm-stock">
            <StockDonut percent={68} />
            <dl className="adm-stock-legend">
              <div>
                <dt>
                  <span className="adm-dot is-green" /> Estoque disponível
                </dt>
                <dd>
                  R$ 68.430 <small>(68%)</small>
                </dd>
              </div>
              <div>
                <dt>
                  <span className="adm-dot is-grey" /> Déficit de estoque
                </dt>
                <dd>
                  R$ 31.570 <small>(32%)</small>
                </dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="adm-card">
          <CardHead
            icon="home"
            title="Solicitações rápidas"
            description="Peça lotes para a farmácia necessária."
          />
          <ul className="adm-request-list">
            {quickRequests.map((pharmacy) => (
              <li key={pharmacy}>
                <span className="adm-request-icon">
                  <DashIcon name="home" size={16} />
                </span>
                <span className="adm-request-name">{pharmacy}</span>
                <button type="button" className="adm-mini-primary">
                  Solicitar lote
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="adm-card">
          <CardHead icon="pill" title="Indicadores da rede" />
          <div className="adm-kpi-grid">
            {networkIndicators.map((indicator) => (
              <div className="adm-kpi" key={indicator.label}>
                <span className="adm-kpi-icon">
                  <DashIcon name={indicator.icon} size={19} />
                </span>
                <div className="adm-kpi-body">
                  <p className="adm-kpi-label">{indicator.label}</p>
                  <p className="adm-kpi-value">
                    <strong>{indicator.value}</strong>
                    <span
                      className={`adm-delta is-${indicator.trend === "up" ? "up" : "down"}`}
                    >
                      <DashIcon
                        name={indicator.trend === "up" ? "up" : "down"}
                        size={12}
                      />
                      {indicator.delta}
                    </span>
                  </p>
                  <p className="adm-kpi-note">{indicator.note}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Ranking, tendência e matriz */}
      <section className="adm-dash-grid adm-dash-grid-b">
        <article className="adm-card">
          <CardHead
            icon="users"
            title="Ranking de unidades"
            description="Status e desempenho das unidades de saúde"
          />
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Unidade</th>
                  <th scope="col">Status</th>
                  <th scope="col">Taxa de consulta</th>
                  <th scope="col">Demanda (Dez → Jan)</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {unitRanking.map((row, index) => (
                  <tr key={row.name}>
                    <td className="adm-rank">{index + 1}</td>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>
                      <span className={`adm-badge is-${row.tone}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="adm-num">{row.rate}</td>
                    <td>
                      <div className="adm-spark-cell">
                        <Sparkline values={row.spark} color={row.color} />
                        <div className="adm-spark-axis">
                          <span>Dez</span>
                          <span>Jan</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button type="button" className="adm-link">
                        Ver detalhes <DashIcon name="arrow" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="adm-card-foot">
            <button type="button" className="adm-link">
              Ver todas as unidades <DashIcon name="arrow" size={13} />
            </button>
          </footer>
        </article>

        <article className="adm-card">
          <CardHead
            icon="chart"
            title="Tendência e previsão de demanda"
            description="Consumo real x demanda prevista"
          />
          <div className="adm-chart-legend">
            <span>
              <i className="adm-legend-line" /> Consumo real
            </span>
            <span>
              <i className="adm-legend-line is-dashed" /> Demanda prevista
            </span>
          </div>
          <div className="adm-chart-holder">
            <DemandChart />
          </div>
          <div className="adm-forecast">
            <span className="adm-forecast-icon">
              <DashIcon name="spark" size={18} />
            </span>
            <div>
              <p className="adm-forecast-label">Previsão de aumento</p>
              <strong>+32%</strong>
              <p className="adm-forecast-note">
                na demanda de analgésicos para os próximos 15 dias.
              </p>
            </div>
            <button type="button" className="adm-ghost">
              Ver detalhes <DashIcon name="arrow" size={13} />
            </button>
          </div>
        </article>

        <article className="adm-card">
          <CardHead
            icon="grid"
            title="Matriz de priorização"
            description="Regiões críticas e medicamentos em falta"
          />
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Região</th>
                  <th scope="col">Medicamento</th>
                  <th scope="col">População</th>
                  <th scope="col">Urgência</th>
                </tr>
              </thead>
              <tbody>
                {priorityMatrix.map((row) => (
                  <tr key={row.region}>
                    <td>
                      <strong>{row.region}</strong>
                    </td>
                    <td>{row.medicine}</td>
                    <td className="adm-num">{row.population}</td>
                    <td>
                      <span className={`adm-badge is-${row.tone}`}>
                        {row.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="adm-card-foot">
            <button type="button" className="adm-link">
              Ver todos os registros <DashIcon name="arrow" size={13} />
            </button>
          </footer>
        </article>
      </section>

      {/* Ordens recentes + CTA */}
      <section className="adm-dash-grid adm-dash-grid-c">
        <article className="adm-card">
          <CardHead
            icon="camera"
            title="Ordens recentes"
            description="Histórico de solicitações e transferências"
          />
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Unidade</th>
                  <th scope="col">Medicamento</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={`${order.date}-${order.medicine}`}>
                    <td className="adm-num">{order.date}</td>
                    <td>{order.type}</td>
                    <td>{order.unit}</td>
                    <td>
                      {order.medicine}{" "}
                      <span className="adm-amount">{order.amount}</span>
                    </td>
                    <td>
                      <span className={`adm-badge is-${order.tone}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="adm-cancel">
                        ✕ Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="adm-card-foot">
            <button type="button" className="adm-link">
              Ver todo o histórico <DashIcon name="arrow" size={13} />
            </button>
          </footer>
        </article>

        <article className="adm-card adm-cta">
          <span className="adm-cta-icon">
            <DashIcon name="plus" size={22} />
          </span>
          <h2>Nova ordem</h2>
          <p>
            Solicite medicamentos, transfira estoque entre unidades ou faça uma
            nova compra.
          </p>
          <button type="button" className="adm-cta-button">
            Criar ordem <DashIcon name="arrow" size={14} />
          </button>
        </article>
      </section>
    </div>
  );
}
