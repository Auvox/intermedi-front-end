import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginUser from "../pages/LoginUser";
import CadastroUser from "../pages/CadastroUser";
import LandingPage from "../pages/LandingPage";
import Manager, { ManagerDashboard, ManagerEmployees, ManagerPatients, ManagerMedicines, ManagerTickets } from "../pages/Manager";
import ManagerAccess from "../components/ManagerAccess";

function Rotas() {
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />}/>
                <Route path="/login" element={<LoginUser />}/>
                <Route path="/cadastro" element={<CadastroUser />}/>
                <Route element={<ManagerAccess />}>
                  <Route path="/gerente" element={<Manager />}>
                    <Route index element={<ManagerDashboard />} />
                    <Route path="funcionarios" element={<ManagerEmployees />} />
                    <Route path="pacientes" element={<ManagerPatients />} />
                    <Route path="remedios" element={<ManagerMedicines />} />
                    <Route path="chamados" element={<ManagerTickets />} />
                  </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default Rotas;
