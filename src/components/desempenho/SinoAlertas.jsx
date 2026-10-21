import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ManagerIcon from "../ManagerIcon";
import { SEVERIDADES } from "./constantes";
import "../../styles/chamados.css";

// Sino de alertas no topo do admin (mesmo visual do sino do gerente).
// alertas: o que useAlertas() devolve (a consulta fica no layout do admin).
export default function SinoAlertas({ alertas }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const painelId = useId();
  const total = alertas.alertas.length;

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (event) => !ref.current?.contains(event.target) && setAberto(false);
    const esc = (event) => event.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const fechar = () => setAberto(false);

  return (
    <div className="chamado-bell" ref={ref}>
      <button
        type="button"
        className="mgr-notifications"
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label={alertas.logado
          ? `Alertas do sistema: ${total} ${total === 1 ? "ativo" : "ativos"}`
          : "Alertas do sistema: entre como admin para ver"}
        onClick={() => setAberto((v) => !v)}
        data-track="sino-alertas"
      >
        <ManagerIcon name="bell" size={17} />
        {total > 0 && <b>{total}</b>}
      </button>
      {aberto && (
        <div className="chamado-bell-panel" id={painelId} role="region" aria-label="Alertas do sistema">
          <p className="chamado-bell-title">Saúde do sistema</p>
          {!alertas.logado ? (
            <div className="chamado-bell-empty">
              <p>Entre como admin na aba Desempenho para receber os alertas do sistema.</p>
              <Link className="mgr-text-button" to="/admin/desempenho" onClick={fechar}>Abrir Desempenho</Link>
            </div>
          ) : alertas.carregando && !total ? (
            <p className="chamado-bell-empty" role="status">Carregando…</p>
          ) : alertas.erro ? (
            <div className="chamado-bell-empty" role="alert">
              <p>{alertas.erro}</p>
              <button type="button" className="mgr-text-button" onClick={alertas.recarregar}>Tentar de novo</button>
            </div>
          ) : total ? (
            <ul>
              {alertas.alertas.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to={`/admin/desempenho/saude#alerta-${a.id}`} onClick={fechar}>
                    <strong>{a.titulo}</strong>
                    <small>
                      <span className={a.severidade === "critico" ? "chamado-urgente-text" : undefined}>
                        {SEVERIDADES[a.severidade]?.rotulo}
                      </span>{" "}
                      · {a.oQue}
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="chamado-bell-empty">Tudo funcionando. Nenhum alerta ativo.</p>
          )}
          {alertas.logado && (
            <Link className="chamado-bell-all" to="/admin/desempenho/saude" onClick={fechar}>
              Ver saúde do sistema →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
