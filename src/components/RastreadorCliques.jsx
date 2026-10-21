import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { iniciarRastreio, mudarDeTela } from "../services/rastreioCliques";

// Envolve todas as rotas (router.jsx): liga a captura de cliques do mapa de
// calor e avisa cada troca de tela. Só rastreia as áreas do painel
// (/admin, /gerente, /funcionario).
export default function RastreadorCliques({ children }) {
  const { pathname } = useLocation();

  useEffect(() => iniciarRastreio(), []);
  useEffect(() => {
    mudarDeTela(pathname);
  }, [pathname]);

  return children;
}
