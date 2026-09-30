import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Employee, { EmployeePatients, EmployeeTeam } from "../pages/Employee";
import EmployeeServices from "../pages/EmployeeServices";
import EmployeeMedicines from "../pages/EmployeeMedicines";
import EmployeeTickets from "../pages/EmployeeTickets";
import Admin, { AdminDirectory } from "../pages/Admin";
import AdminDashboard from "../pages/AdminDashboard";
import AdminMedicines from "../pages/AdminMedicines";
import LoginUser from "../pages/LoginUser";
import CadastroUser from "../pages/CadastroUser";
import LandingPage from "../pages/LandingPage";
import AccessibleArea from "../components/layout/AccessibleArea";
import Manager, {
  ManagerDashboard,
  ManagerEmployees,
  ManagerPatients,
  ManagerTickets,
} from "../pages/Manager";
import ManagerServices from "../pages/ManagerServices";
import ManagerMedicines from "../pages/ManagerMedicines";

import "../styles/directory.css";
import "../styles/personaTheme.css";

function Rotas() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginUser />} />
        <Route path="/cadastro" element={<CadastroUser />} />
        <Route path="/admin" element={<AccessibleArea><Admin /></AccessibleArea>}>
          <Route index element={<AdminDashboard />} />
          <Route path="medicamentos" element={<AdminMedicines />} />
          {["gerentes", "farmacias", "pacientes", "chamados"].map((section) => (
            <Route
              key={section}
              path={section}
              element={<AdminDirectory key={section} section={section} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="/funcionario" element={<AccessibleArea><Employee /></AccessibleArea>}>
          <Route index element={<Navigate to="pacientes" replace />} />
          <Route path="pacientes" element={<EmployeePatients />} />
          <Route path="servicos" element={<EmployeeServices />} />
          <Route path="remedios" element={<EmployeeMedicines />} />
          <Route path="chamados" element={<EmployeeTickets />} />
          <Route path="funcionarios" element={<EmployeeTeam />} />
          <Route
            path="*"
            element={<Navigate to="/funcionario/pacientes" replace />}
          />
        </Route>
        <Route path="/gerente" element={<AccessibleArea><Manager /></AccessibleArea>}>
          <Route index element={<ManagerDashboard />} />
          <Route path="funcionarios" element={<ManagerEmployees />} />
          <Route path="pacientes" element={<ManagerPatients />} />
          <Route path="remedios" element={<ManagerMedicines />} />
          <Route path="servicos" element={<ManagerServices />} />
          <Route path="chamados" element={<ManagerTickets />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default Rotas;
