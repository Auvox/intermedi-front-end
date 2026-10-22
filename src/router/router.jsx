import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Employee, { EmployeePatients } from "../pages/Employee";
import EmployeeOverview from "../pages/EmployeeOverview";
import EmployeeServices from "../pages/EmployeeServices";
import EmployeeMedicines from "../pages/EmployeeMedicines";
import EmployeeTickets from "../pages/EmployeeTickets";
import Admin, { AdminDirectory } from "../pages/Admin";
import AdminDashboard from "../pages/AdminDashboard";
import AdminMedicines from "../pages/AdminMedicines";
import AdminRequests from "../pages/AdminRequests";
import LoginUser from "../pages/LoginUser";
import LandingPage from "../pages/LandingPage";
import AccessibleArea from "../components/layout/AccessibleArea";
import RastreadorCliques from "../components/RastreadorCliques";
import Manager, {
  ManagerDashboard,
  ManagerEmployees,
  ManagerPatients,
  ManagerTickets,
} from "../pages/Manager";
import ManagerServices from "../pages/ManagerServices";
import ManagerMedicines from "../pages/ManagerMedicines";
import ManagerNetworkOrders from "../pages/ManagerNetworkOrders";

import "../styles/directory.css";
import "../styles/personaTheme.css";
import "../styles/motion.css";

// Carregada só quando o gerente abre a tela (traz a cena 3D)
const ManagerOperacao = lazy(() => import("../pages/ManagerOperacao"));
// Aba Desempenho do admin: carregada só quando aberta (traz os gráficos)
const Desempenho = lazy(() => import("../pages/desempenho/Desempenho"));
const DesempenhoVisaoGeral = lazy(() => import("../pages/desempenho/DesempenhoVisaoGeral"));
const DesempenhoMapaCalor = lazy(() => import("../pages/desempenho/DesempenhoMapaCalor"));
const DesempenhoRotas = lazy(() => import("../pages/desempenho/DesempenhoRotas"));
const DesempenhoSaude = lazy(() => import("../pages/desempenho/DesempenhoSaude"));

const carregando = (texto) => <p className="mgr-empty" role="status">{texto}</p>;

function Rotas() {
  return (
    <BrowserRouter>
      <RastreadorCliques>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginUser />} />
        {/* gerente não cria conta: quem cadastra é o admin */}
        <Route path="/cadastro" element={<Navigate to="/login?perfil=gerente" replace />} />
        <Route path="/admin" element={<AccessibleArea><Admin /></AccessibleArea>}>
          <Route index element={<AdminDashboard />} />
          <Route path="medicamentos" element={<AdminMedicines />} />
          <Route path="chamados" element={<AdminRequests />} />
          <Route path="desempenho" element={<Suspense fallback={carregando("Carregando o desempenho…")}><Desempenho /></Suspense>}>
            <Route index element={<Suspense fallback={carregando("Carregando…")}><DesempenhoVisaoGeral /></Suspense>} />
            <Route path="mapa-de-calor" element={<Suspense fallback={carregando("Carregando…")}><DesempenhoMapaCalor /></Suspense>} />
            <Route path="rotas" element={<Suspense fallback={carregando("Carregando…")}><DesempenhoRotas /></Suspense>} />
            <Route path="saude" element={<Suspense fallback={carregando("Carregando…")}><DesempenhoSaude /></Suspense>} />
          </Route>
          {["gerentes", "farmacias", "pacientes"].map((section) => (
            <Route
              key={section}
              path={section}
              element={<AdminDirectory key={section} section={section} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="/funcionario" element={<AccessibleArea><Employee /></AccessibleArea>}>
          <Route index element={<EmployeeOverview />} />
          <Route path="pacientes" element={<EmployeePatients />} />
          <Route path="servicos" element={<EmployeeServices />} />
          <Route path="remedios" element={<EmployeeMedicines />} />
          <Route path="chamados" element={<EmployeeTickets />} />
          <Route
            path="*"
            element={<Navigate to="/funcionario" replace />}
          />
        </Route>
        <Route path="/gerente" element={<AccessibleArea><Manager /></AccessibleArea>}>
          <Route index element={<ManagerDashboard />} />
          <Route path="funcionarios" element={<ManagerEmployees />} />
          <Route path="pacientes" element={<ManagerPatients />} />
          <Route path="remedios" element={<ManagerMedicines />} />
          <Route path="servicos" element={<ManagerServices />} />
          <Route path="chamados" element={<ManagerTickets />} />
          <Route path="pedidos" element={<ManagerNetworkOrders />} />
          <Route
            path="operacao"
            element={
              <Suspense fallback={<p className="mgr-empty" role="status">Carregando a operação…</p>}>
                <ManagerOperacao />
              </Suspense>
            }
          />
        </Route>
      </Routes>
      </RastreadorCliques>
    </BrowserRouter>
  );
}

export default Rotas;
