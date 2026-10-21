import { Link } from "react-router-dom";
import ManagerIcon from "./ManagerIcon";
import { paraIdentificador } from "../services/rastreioCliques";

// Atalhos para as tarefas principais de cada perfil, na visão geral.
// itens: [{ to, icone, titulo, descricao, contador? }]; a cor de destaque
// vem do tema da plataforma (personaTheme.css).
export default function Ferramentas({ titulo = "Ferramentas", itens }) {
  return (
    <section className="mgr-ferramentas" aria-label={titulo}>
      <h2>{titulo}</h2>
      <div className="mgr-ferramentas-grade">
        {itens.map(({ to, icone, titulo: nome, descricao, contador }) => (
          <Link key={to} to={to} className="mgr-ferramenta" data-track={`atalho:${paraIdentificador(nome)}`}>
            <span className="mgr-ferramenta-icone" aria-hidden="true">
              <ManagerIcon name={icone} size={22} />
            </span>
            <span className="mgr-ferramenta-texto">
              <strong>{nome}</strong>
              <small>{descricao}</small>
            </span>
            {contador > 0 && (
              <span className="mgr-ferramenta-contador" aria-label={`${contador} pendentes`}>
                {contador}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
