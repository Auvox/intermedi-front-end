import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ManagerIcon from "./ManagerIcon";
import { chaveEntrega, itemEntregue, tempoDesde } from "../services/chamados";

// Entregas recentes (remédios que chegaram), usadas no sino do gerente e do funcionário
export function ListaEntregas({ entregas, isNaoLida, link, onNavegar }) {
  if (!entregas.length) return <p className="chamado-bell-empty">Nenhuma entrega nas últimas 24 h.</p>;
  return (
    <ul>
      {entregas.slice(0, 6).map((p) => (
        <li key={chaveEntrega(p)} className={isNaoLida(p) ? "chamado-entrega-nova" : undefined}>
          <Link to={typeof link === "function" ? link(p) : link} onClick={onNavegar}>
            {p.tipo === "recebidos" ? (
              <>
                <strong>Entregue:</strong> {itemEntregue(p)} chegou à {p.nomeFarmaciaDestino}
              </>
            ) : (
              <>
                <strong>Chegou:</strong> {itemEntregue(p)} · de {p.nomeFarmaciaOrigem}
              </>
            )}
            <small>
              {isNaoLida(p) && <span className="sr-only">Nova. </span>}
              {tempoDesde(p.dataRecebimento)}
            </small>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Sino do funcionário: remédios que chegaram na farmácia dele
export function SinoEntregas({ entregas }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const painelId = useId();
  const { naoLidas, marcarLidas } = entregas;
  // Quais eram novas quando o sino abriu (abrir já marca como lidas)
  const [novas, setNovas] = useState(() => new Set());

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (event) => { if (!ref.current?.contains(event.target)) setAberto(false); };
    const esc = (event) => {
      if (event.key === "Escape") {
        setAberto(false);
        ref.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function alternar() {
    // abrir o sino marca as entregas como vistas
    if (!aberto) {
      setNovas(new Set(entregas.entregas.filter(entregas.isNaoLida).map(chaveEntrega)));
      marcarLidas();
    }
    setAberto((v) => !v);
  }

  return (
    <div className="chamado-bell" ref={ref}>
      <button
        type="button"
        className="mgr-notifications"
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label={`Notificações: ${naoLidas} ${naoLidas === 1 ? "entrega nova" : "entregas novas"}`}
        onClick={alternar}
      >
        <ManagerIcon name="bell" size={17} />
        <b>{naoLidas}</b>
      </button>
      {aberto && (
        <div className="chamado-bell-panel" id={painelId} role="region" aria-label="Entregas de remédios">
          <p className="chamado-bell-title">Remédios que chegaram</p>
          {entregas.loading ? (
            <p className="chamado-bell-empty" role="status">Carregando…</p>
          ) : entregas.error ? (
            <div className="chamado-bell-empty" role="alert">
              <p>{entregas.error}</p>
              <button type="button" className="mgr-text-button" onClick={entregas.retry}>Tentar de novo</button>
            </div>
          ) : (
            <ListaEntregas
              entregas={entregas.entregas}
              isNaoLida={(p) => novas.has(chaveEntrega(p))}
              link="/funcionario/remedios"
              onNavegar={() => setAberto(false)}
            />
          )}
          <Link className="chamado-bell-all" to="/funcionario/remedios" onClick={() => setAberto(false)}>
            Ver estoque →
          </Link>
        </div>
      )}
    </div>
  );
}
