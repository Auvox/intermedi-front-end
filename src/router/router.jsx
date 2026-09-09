import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginUser from "../pages/LoginUser";
import CadastroUser from "../pages/CadastroUser";
import LandingPage from "../pages/LandingPage";
import Manager, {
  ManagerDashboard,
  ManagerEmployees,
  ManagerPatients,
  ManagerMedicines,
  ManagerTickets,
} from "../pages/Manager";

function Rotas() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginUser />} />
        <Route path="/cadastro" element={<CadastroUser />} />
        <Route path="/gerente" element={<Manager />}>
          <Route index element={<ManagerDashboard />} />
          <Route path="funcionarios" element={<ManagerEmployees />} />
          <Route path="pacientes" element={<ManagerPatients />} />
          <Route path="remedios" element={<ManagerMedicines />} />
          <Route path="chamados" element={<ManagerTickets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default Rotas;
