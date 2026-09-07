import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginUser from "../pages/LoginUser";
import LandingPage from "../pages/LandingPage";

function Rotas() {
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />}/>
                <Route path="/login" element={<LoginUser />}/>
            </Routes>
        </BrowserRouter>
    )
}

export default Rotas; 