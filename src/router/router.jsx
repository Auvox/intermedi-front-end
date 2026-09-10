import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Employee, { EmployeePatients, EmployeeTeam } from "../pages/Employee";
import Admin, { AdminDirectory } from "../pages/Admin";
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
        <Route path="/admin" element={<Admin />}>
          <Route index element={<Navigate to="gerentes" replace />} />
          {["gerentes", "farmacias", "pacientes", "chamados"].map((section) => (
            <Route
              key={section}
              path={section}
              element={<AdminDirectory key={section} section={section} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/admin/gerentes" replace />} />
        </Route>
        <Route path="/funcionario" element={<Employee />}>
          <Route index element={<Navigate to="pacientes" replace />} />
          <Route path="pacientes" element={<EmployeePatients />} />
          <Route path="funcionarios" element={<EmployeeTeam />} />
          <Route
            path="*"
            element={<Navigate to="/funcionario/pacientes" replace />}
          />
        </Route>
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
