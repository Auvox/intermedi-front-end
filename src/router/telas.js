import { lazy } from "react";

// Telas baixadas sob demanda: quem abre a página inicial não baixa o painel, e
// quem entra no painel não baixa a página inicial.
// Para a troca de tela não piscar, cada área é baixada antes de ser aberta,
// quando o navegador está à toa:
//   página inicial → o login;   login → a área do perfil escolhido;
//   área aberta → as outras abas da mesma área.

const quandoOcioso = (fn) =>
  typeof window.requestIdleCallback === "function"
    ? window.requestIdleCallback(fn, { timeout: 2000 })
    : window.setTimeout(fn, 500);

// lazy() que também sabe se baixar antes da hora (tela.carregar())
function tela(importar, exportacao = "default") {
  let promessa = null;
  const carregar = () =>
    (promessa ??= importar().catch((erro) => {
      promessa = null; // sem rede: tenta de novo na próxima vez
      throw erro;
    }));
  const Componente = lazy(() => carregar().then((modulo) => ({ default: modulo[exportacao] })));
  Componente.carregar = carregar;
  return Componente;
}

export const LandingPage = tela(() => import("../pages/LandingPage"));
export const LoginUser = tela(() => import("../pages/LoginUser"));

const admin = () => import("../pages/Admin");
export const Admin = tela(admin);
export const AdminDirectory = tela(admin, "AdminDirectory");
export const AdminDashboard = tela(() => import("../pages/AdminDashboard"));
export const AdminMedicines = tela(() => import("../pages/AdminMedicines"));
export const AdminRequests = tela(() => import("../pages/AdminRequests"));

const funcionario = () => import("../pages/Employee");
export const Employee = tela(funcionario);
export const EmployeePatients = tela(funcionario, "EmployeePatients");
export const EmployeeOverview = tela(() => import("../pages/EmployeeOverview"));
export const EmployeeServices = tela(() => import("../pages/EmployeeServices"));
export const EmployeeMedicines = tela(() => import("../pages/EmployeeMedicines"));
export const EmployeeTickets = tela(() => import("../pages/EmployeeTickets"));

const gerente = () => import("../pages/Manager");
export const Manager = tela(gerente);
export const ManagerDashboard = tela(gerente, "ManagerDashboard");
export const ManagerEmployees = tela(gerente, "ManagerEmployees");
export const ManagerPatients = tela(gerente, "ManagerPatients");
export const ManagerTickets = tela(gerente, "ManagerTickets");
export const ManagerServices = tela(() => import("../pages/ManagerServices"));
export const ManagerMedicines = tela(() => import("../pages/ManagerMedicines"));
export const ManagerNetworkOrders = tela(() => import("../pages/ManagerNetworkOrders"));

const AREAS = {
  admin: [Admin, AdminDashboard, AdminMedicines, AdminRequests],
  gerente: [Manager, ManagerServices, ManagerMedicines, ManagerNetworkOrders],
  funcionario: [Employee, EmployeeOverview, EmployeeServices, EmployeeMedicines, EmployeeTickets],
};

export function precarregar(...telas) {
  quandoOcioso(() => telas.forEach((t) => t.carregar().catch(() => {})));
}

export function precarregarArea(area) {
  if (AREAS[area]) precarregar(...AREAS[area]);
}
