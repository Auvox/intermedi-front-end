import PersonaIcon from "./PersonaIcon";
import { Link, NavLink } from "react-router-dom";
import logo from "../assets/logoIntermedi.png";
import "../styles/managerSidebar.css";

const links = [
  { path: "", label: "Visão geral", icon: "dashboard" },
  { path: "funcionarios", label: "Funcionários", icon: "team" },
  { path: "pacientes", label: "Pacientes", icon: "heart" },
  { path: "remedios", label: "Remédios", icon: "pill" },
  { path: "chamados", label: "Chamados", icon: "ticket" },
];

function SidebarIcon({ name }) {
  if (["heart", "team", "manager"].includes(name)) return <PersonaIcon role={name === "heart" ? "paciente" : name === "manager" ? "gerente" : "funcionario"} size={22} />;
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2" />
      </>
    ),
    heart: (
      <>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
        <path d="M6 12h3l2-3 2 6 2-3h3" />
      </>
    ),
    pill: (
      <>
        <path d="m9 4-5 5a6.4 6.4 0 0 0 9 9l5-5a6.4 6.4 0 0 0-9-9Z" />
        <path d="m7 7 9 9m-2-9 2 2" />
      </>
    ),
    ticket: (
      <>
        <path d="M4 5h16a1 1 0 0 1 1 1v4a2 2 0 0 0 0 4v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a2 2 0 0 0 0-4V6a1 1 0 0 1 1-1Z" />
        <path d="M15 5v3m0 3v2m0 3v3" />
      </>
    ),
    pharmacy: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M10 21v-5h4v5M12 6v6m-3-3h6" />
      </>
    ),
    truck: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="17" cy="18" r="1.8" />
      </>
    ),
    report: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 16v-4m4 4V8m4 8v-6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.9 12a7.9 7.9 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-2-1.2L15.1 3h-4l-.4 2.7a7.7 7.7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.9 7.9 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7.7 7.7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z" />
      </>
    ),
    arrow: <path d="m9 5 7 7-7 7" />,
  };
  return (
    <svg
      width="20"
      height="20"
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

export default function ManagerSidebar({
  unitName,
  external,
  employee = false,
  admin = false,
}) {
  // Itens marcados com `soon` ainda nao possuem rota/tela: aparecem no menu
  // seguindo a referencia, mas sem navegacao ate o back entregar.
  const adminLinks = [
    { path: "", label: "Dashboard", icon: "dashboard" },
    { path: "medicamentos", label: "Medicamentos", icon: "pill", soon: true },
    { path: "farmacias", label: "Unidades", icon: "pharmacy" },
    { path: "gerentes", label: "Gerentes", icon: "manager" },
    { path: "pacientes", label: "Pacientes", icon: "heart" },
    { path: "chamados", label: "Solicitações", icon: "ticket" },
    { path: "rotas", label: "Rotas e Distribuição", icon: "truck", soon: true },
    { path: "relatorios", label: "Relatórios", icon: "report", soon: true },
    { path: "configuracoes", label: "Configurações", icon: "settings", soon: true },
  ];
  const menuLinks = admin
    ? adminLinks
    : employee
      ? [links[2], links[1], { path: "servicos", label: "Serviços", icon: "ticket" }]
      : links;
  const basePath = admin ? "/admin" : employee ? "/funcionario" : "/gerente";
  const role = admin ? "admin" : employee ? "funcionário" : "gerente";
  return (
    <aside className="manager-sidebar">
      <div className="manager-sidebar-header">
        <Link to="/" className="manager-sidebar-brand">
          <img src={logo} alt="Intermedi — início" />
        </Link>
        <span className="manager-sidebar-role">
          <span /> Espaço do {role}
        </span>
      </div>

      <div className="manager-sidebar-menu">
        <p className="manager-sidebar-caption">PRINCIPAL</p>
        <nav aria-label={`Menu do ${role}`}>
          {menuLinks.map(({ path, label, icon, soon }) =>
            soon ? (
              <button
                key={path}
                type="button"
                className="manager-sidebar-soon"
                aria-disabled="true"
                title="Em breve"
              >
                <span className="manager-sidebar-icon">
                  <SidebarIcon name={icon} />
                </span>
                <span className="manager-sidebar-label">{label}</span>
                <span className="manager-sidebar-soon-tag">Em breve</span>
              </button>
            ) : (
            <NavLink
              key={path}
              end={!path}
              to={`${basePath}${path ? `/${path}` : ""}`}
            >
              <span className="manager-sidebar-icon">
                <SidebarIcon name={icon} />
              </span>
              <span className="manager-sidebar-label">{label}</span>
              {path === "chamados" && external > 0 ? (
                <span
                  className="manager-sidebar-count"
                  aria-label={`${external} chamados de outras farmácias`}
                >
                  {external}
                </span>
              ) : (
                <span className="manager-sidebar-chevron">
                  <SidebarIcon name="arrow" />
                </span>
              )}
            </NavLink>
            ),
          )}
        </nav>
      </div>

      <div className="manager-sidebar-bottom">
        <div className="manager-sidebar-unit">
          <div className="manager-sidebar-unit-heading">
            <span className="manager-sidebar-unit-icon">
              <SidebarIcon name="pharmacy" />
            </span>
            <span>{admin ? "SUA PLATAFORMA" : "SUA UNIDADE"}</span>
          </div>
          <strong>{unitName}</strong>
          <span className="manager-sidebar-unit-detail">
            Gestão e cuidado em um só lugar.
          </span>
        </div>
      </div>
    </aside>
  );
}
