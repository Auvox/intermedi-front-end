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
  const adminLinks = [
    { path: "gerentes", label: "Gerentes", icon: "team" },
    { path: "farmacias", label: "Farmácias", icon: "pharmacy" },
    links[2],
    links[4],
  ];
  const menuLinks = admin
    ? adminLinks
    : employee
      ? [links[2], links[1]]
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
          {menuLinks.map(({ path, label, icon }) => (
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
          ))}
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
