import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AccessibleArea from "../components/layout/AccessibleArea";
import RastreadorCliques from "../components/RastreadorCliques";
import TelaCarregando, { CarregandoTela } from "../components/TelaCarregando";
import { AcessoDesativado, GuardaSistema, LimiteDeErro } from "../components/aviso/GuardaSistema";
import PaginaAviso from "../pages/PaginaAviso";
import { marcarNavegacao } from "../services/carregamento";
import {
  Admin, AdminDashboard, AdminDirectory, AdminMedicines, AdminRequests,
  Employee, EmployeeMedicines, EmployeeOverview, EmployeePatients, EmployeeServices, EmployeeTickets,
  LandingPage, LoginUser,
  Manager, ManagerDashboard, ManagerEmployees, ManagerMedicines, ManagerNetworkOrders,
  ManagerPatients, ManagerServices, ManagerTickets,
  precarregar, precarregarArea,
} from "./telas";

// O CSS de todas as telas é carregado em main.jsx (styles/estilosGlobais.js).

// Carregada só quando o gerente abre a tela (traz a cena 3D)
const ManagerOperacao = lazy(() => import("../pages/ManagerOperacao"));
// Aba Desempenho do admin: carregada só quando aberta (traz os gráficos)
const Desempenho = lazy(() => import("../pages/desempenho/Desempenho"));
const DesempenhoVisaoGeral = lazy(() => import("../pages/desempenho/DesempenhoVisaoGeral"));
const DesempenhoMapaCalor = lazy(() => import("../pages/desempenho/DesempenhoMapaCalor"));
const DesempenhoRotas = lazy(() => import("../pages/desempenho/DesempenhoRotas"));
const DesempenhoSaude = lazy(() => import("../pages/desempenho/DesempenhoSaude"));

// Enquanto uma tela é baixada, a camada de carregamento (pílula) aparece
const carregando = <CarregandoTela />;
const naoEncontrada = <PaginaAviso tipo="nao-encontrada" />;

// Abre a área e baixa as outras abas dela em segundo plano
function Area({ nome, children }) {
  useEffect(() => precarregarArea(nome), [nome]);
  return <AccessibleArea>{children}</AccessibleArea>;
}

// Na página inicial, o login (o próximo passo de quase todo mundo) já vem baixado
function Inicio() {
  useEffect(() => precarregar(LoginUser), []);
  return <LandingPage />;
}

// A cada troca de tela, as leituras que ela fizer mostram o carregamento
function MarcarNavegacao() {
  const { pathname } = useLocation();
  useEffect(() => marcarNavegacao(), [pathname]);
  return null;
}

function Rotas() {
  return (
    // v7_startTransition: ao trocar de tela, a anterior continua na frente até a
    // nova estar baixada (sem tela branca nem "Carregando" piscando)
    <BrowserRouter future={{ v7_startTransition: true }}>
      <MarcarNavegacao />
      <TelaCarregando />
      <LimiteDeErro>
      <GuardaSistema>
      <RastreadorCliques>
      <Suspense fallback={carregando}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/login" element={<LoginUser />} />
        <Route path="/acesso-desativado" element={<AcessoDesativado />} />
        {/* gerente não cria conta: quem cadastra é o admin */}
        <Route path="/cadastro" element={<Navigate to="/login?perfil=gerente" replace />} />
        <Route path="/admin" element={<Area nome="admin"><Admin /></Area>}>
          <Route index element={<AdminDashboard />} />
          <Route path="medicamentos" element={<AdminMedicines />} />
          <Route path="chamados" element={<AdminRequests />} />
          <Route path="desempenho" element={<Suspense fallback={carregando}><Desempenho /></Suspense>}>
            <Route index element={<Suspense fallback={carregando}><DesempenhoVisaoGeral /></Suspense>} />
            <Route path="mapa-de-calor" element={<Suspense fallback={carregando}><DesempenhoMapaCalor /></Suspense>} />
            <Route path="rotas" element={<Suspense fallback={carregando}><DesempenhoRotas /></Suspense>} />
            <Route path="saude" element={<Suspense fallback={carregando}><DesempenhoSaude /></Suspense>} />
          </Route>
          {["gerentes", "farmacias", "pacientes"].map((section) => (
            <Route
              key={section}
              path={section}
              element={<AdminDirectory key={section} section={section} />}
            />
          ))}
        </Route>
        <Route path="/funcionario" element={<Area nome="funcionario"><Employee /></Area>}>
          <Route index element={<EmployeeOverview />} />
          <Route path="pacientes" element={<EmployeePatients />} />
          <Route path="servicos" element={<EmployeeServices />} />
          <Route path="remedios" element={<EmployeeMedicines />} />
          <Route path="chamados" element={<EmployeeTickets />} />
        </Route>
        <Route path="/gerente" element={<Area nome="gerente"><Manager /></Area>}>
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
              <Suspense fallback={carregando}>
                <ManagerOperacao />
              </Suspense>
            }
          />
        </Route>
        {/* endereço que não existe (inclusive dentro das áreas) */}
        <Route path="/admin/*" element={naoEncontrada} />
        <Route path="/funcionario/*" element={naoEncontrada} />
        <Route path="/gerente/*" element={naoEncontrada} />
        <Route path="*" element={naoEncontrada} />
      </Routes>
      </Suspense>
      </RastreadorCliques>
      </GuardaSistema>
      </LimiteDeErro>
    </BrowserRouter>
  );
}

export default Rotas;
