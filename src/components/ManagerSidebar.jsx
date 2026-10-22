import { useLayoutEffect, useRef, useState } from "react";
import PersonaIcon from "./PersonaIcon";
import { Link, NavLink, useLocation } from "react-router-dom";
import logo from "../assets/logoIntermedi.png";
import "../styles/managerSidebar.css";

const links = [
  { path: "", label: "Visão geral", icon: "dashboard" },
  { path: "funcionarios", label: "Funcionários", icon: "team" },
  { path: "pacientes", label: "Pacientes", icon: "heart" },
  { path: "remedios", label: "Remédios", icon: "pill" },
  { path: "chamados", label: "Chamados", icon: "ticket" },
  { path: "servicos", label: "Serviços", icon: "clipboard" },
  { path: "pedidos", label: "Pedidos da rede", icon: "truck" },
  // no fim da lista: o menu do funcionário usa os itens acima pela posição
  { path: "operacao", label: "Operação 3D", icon: "cube" },
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
    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5V3h6v1.5M9 9h6m-6 4h6m-6 4h4" />
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
    cube: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
    arrow: <path d="m9 5 7 7-7 7" />,
    // aba Desempenho do admin
    chart: (
      <>
        <path d="M4 20V10m6 10V4m6 16v-7m4 7H3" />
      </>
    ),
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

// Um único fundo de item ativo que desliza até o link da rota atual, em vez de
// o item antigo sumir e o novo aparecer. A posição vem do próprio link ativo
// (offsetTop/Left dentro do nav), então acompanha a sidebar vertical e a
// faixa horizontal do celular.
function useIndicadorAtivo(navRef) {
  const { pathname } = useLocation();
  const [posicao, setPosicao] = useState(null);
  const [pronto, setPronto] = useState(false);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const medir = () => {
      const ativo = nav.querySelector("a.active");
      setPosicao(
        ativo
          ? { x: ativo.offsetLeft, y: ativo.offsetTop, w: ativo.offsetWidth, h: ativo.offsetHeight }
          : null,
      );
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [navRef, pathname]);

  // A transição só liga depois da primeira posição, para o indicador não
  // deslizar a partir do topo quando a área abre.
  useLayoutEffect(() => {
    if (!posicao || pronto) return undefined;
    const quadro = requestAnimationFrame(() => setPronto(true));
    return () => cancelAnimationFrame(quadro);
  }, [posicao, pronto]);

  return { posicao, pronto };
}

export default function ManagerSidebar({
  unitName,
  pendingTickets = 0,
  pendingOrders = 0,
  employee = false,
  admin = false,
}) {
  // Só telas que existem. Rotas, Relatórios e Configurações voltam ao menu
  // quando tiverem tela própria.
  const adminLinks = [
    { path: "", label: "Visão geral", icon: "dashboard" },
    { path: "medicamentos", label: "Medicamentos", icon: "pill" },
    { path: "farmacias", label: "Farmácias", icon: "pharmacy" },
    { path: "gerentes", label: "Gerentes", icon: "manager" },
    { path: "pacientes", label: "Pacientes", icon: "heart" },
    { path: "chamados", label: "Solicitações", icon: "ticket" },
    { path: "desempenho", label: "Desempenho", icon: "chart" },
  ];
  const menuLinks = admin
    ? adminLinks
    : employee
      // o funcionário não vê a equipe: sem "Funcionários" (links[1])
      ? [links[0], links[2], links[3], { path: "chamados", label: "Solicitações", icon: "ticket" }, links[5]]
      : links;
  // Badge no menu: chamados pendentes da equipe e pedidos de outras farmácias
  const contador = (path) => (path === "chamados" ? pendingTickets : path === "pedidos" ? pendingOrders : 0);
  const basePath = admin ? "/admin" : employee ? "/funcionario" : "/gerente";
  const role = admin ? "admin" : employee ? "funcionário" : "gerente";
  const navRef = useRef(null);
  const { posicao, pronto } = useIndicadorAtivo(navRef);
  return (
    <aside className="manager-sidebar">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <div className="manager-sidebar-header">
        <Link to="/" className="manager-sidebar-brand">
          <img src={logo} alt="Intermedi — início" />
        </Link>
        <span className="manager-sidebar-role">
          <span /> Espaço do {role}
        </span>
      </div>

      <div className="manager-sidebar-menu">
        <nav ref={navRef} aria-label={`Menu do ${role}`} className={posicao ? "has-indicator" : undefined}>
          <span
            aria-hidden="true"
            className={`manager-sidebar-indicator${posicao ? " is-visible" : ""}${pronto ? " is-ready" : ""}`}
            style={
              posicao
                ? { width: posicao.w, height: posicao.h, transform: `translate(${posicao.x}px, ${posicao.y}px)` }
                : undefined
            }
          />
          {menuLinks.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              end={!path}
              to={`${basePath}${path ? `/${path}` : ""}`}
              data-track={`menu:${path || "visao-geral"}`}
            >
              <span className="manager-sidebar-icon">
                <SidebarIcon name={icon} />
              </span>
              <span className="manager-sidebar-label">{label}</span>
              {contador(path) > 0 && (
                <span
                  className="manager-sidebar-count"
                  aria-label={
                    path === "pedidos"
                      ? `${pendingOrders} ${pendingOrders === 1 ? "pedido da rede pendente" : "pedidos da rede pendentes"}`
                      : `${pendingTickets} ${pendingTickets === 1 ? "chamado pendente" : "chamados pendentes"}`
                  }
                >
                  {contador(path)}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="manager-sidebar-bottom">
        <div className="manager-sidebar-unit">
          <span className="manager-sidebar-unit-icon">
            <SidebarIcon name="pharmacy" />
          </span>
          <div>
            <span className="manager-sidebar-unit-heading">{admin ? "Plataforma" : "Unidade"}</span>
            <strong title={unitName}>{unitName}</strong>
          </div>
        </div>
      </div>
    </aside>
  );
}
