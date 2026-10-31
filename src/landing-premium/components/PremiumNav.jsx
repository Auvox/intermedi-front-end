import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoCor from "../../assets/logoIntermedi.png";
import logoBranco from "../../assets/logoFooter.png";
import { capitulos } from "../content";

const ESCUROS = new Set(["ink", "green", "graphite"]);

// Barra simples: marca, cinco links e uma ação. Veste a cor do capítulo atual.
export default function PremiumNav({ capitulo }) {
  const [aberto, setAberto] = useState(false);
  const escuro = ESCUROS.has(capitulo.fundo);

  useEffect(() => {
    if (!aberto) return undefined;
    const fechar = (event) => { if (event.key === "Escape") setAberto(false); };
    document.addEventListener("keydown", fechar);
    return () => document.removeEventListener("keydown", fechar);
  }, [aberto]);

  return (
    <header className={`lpx-nav lpx-fundo-${aberto ? "ink" : capitulo.fundo}`} data-escuro={escuro || aberto}>
      <a href="#inicio" className="lpx-nav-marca" aria-label="Intermedi, voltar ao início">
        <img src={escuro || aberto ? logoBranco : logoCor} alt="Intermedi" width="1920" height="1080" />
      </a>
      <nav aria-label="Navegação principal" className="lpx-nav-links">
        <ul>
          {capitulos.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} aria-current={capitulo.id === c.id ? "location" : undefined}>{c.nome}</a>
            </li>
          ))}
        </ul>
      </nav>
      <Link to="/login" className="lpx-btn lpx-btn-nav">Entrar</Link>
      <button
        type="button"
        className="lpx-nav-menu"
        aria-expanded={aberto}
        aria-controls="lpx-menu"
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? "Fechar" : "Menu"}
      </button>
      <div id="lpx-menu" className="lpx-menu" hidden={!aberto}>
        <ul>
          {capitulos.map((c) => (
            <li key={c.id}><a href={`#${c.id}`} onClick={() => setAberto(false)}>{c.nome}</a></li>
          ))}
        </ul>
        <Link to="/login" className="lpx-btn lpx-btn-paper" onClick={() => setAberto(false)}>Acessar a plataforma</Link>
      </div>
    </header>
  );
}
