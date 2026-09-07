import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginUser from "../pages/LoginUser";
import CadastroUser from "../pages/CadastroUser";
import LandingPage from "../pages/LandingPage";

function Rotas() {
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />}/>
                <Route path="/login" element={<LoginUser />}/>
                <Route path="/cadastro" element={<CadastroUser />}/>
            </Routes>
        </BrowserRouter>
    )
}

export default Rotas;
