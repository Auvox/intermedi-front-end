import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ManagerIcon from "./ManagerIcon";
import { responderChamado } from "../services/api";
import { prioridadeChamado, resumoRemedios, tempoDesde } from "../services/chamados";

// Sininho do topo: badge com os pendentes e painel com os mais recentes.
export function NotificacoesGerente({ gerente, pendentes }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const painelId = useId();
  const total = pendentes.totalPendentes;

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

  return (
    <div className="chamado-bell" ref={ref}>
      <button
        type="button"
        className="mgr-notifications"
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label={`Notificações: ${total} ${total === 1 ? "solicitação pendente" : "solicitações pendentes"}`}
        onClick={() => setAberto((v) => !v)}
      >
        <ManagerIcon name="bell" size={17} />
        <b>{total}</b>
      </button>
      {aberto && (
        <div className="chamado-bell-panel" id={painelId} role="region" aria-label="Solicitações pendentes">
          <p className="chamado-bell-title">Solicitações pendentes</p>
          {gerente.loading || pendentes.loading ? (
            <p className="chamado-bell-empty" role="status">Carregando…</p>
          ) : gerente.error || pendentes.error ? (
            <div className="chamado-bell-empty" role="alert">
              <p>{gerente.error || pendentes.error}</p>
              <button type="button" className="mgr-text-button" onClick={gerente.error ? gerente.retry : pendentes.retry}>
                Tentar de novo
              </button>
            </div>
          ) : pendentes.pendentes.length ? (
            <ul>
              {pendentes.pendentes.slice(0, 5).map((c) => (
                <li key={c.idChamado}>
                  <Link to={`/gerente/chamados?chamado=${c.idChamado}`} onClick={() => setAberto(false)}>
                    <strong>{c.funcionario?.nomeFuncionario}</strong> solicitou {resumoRemedios(c.remedios)}
                    <small>
                      <span className={c.prioridade === "urgente" ? "chamado-urgente-text" : undefined}>
                        {prioridadeChamado(c.prioridade).label}
                      </span>{" "}
                      · {tempoDesde(c.dataAbertura)}
                    </small>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="chamado-bell-empty">Nenhuma solicitação pendente.</p>
          )}
          <Link className="chamado-bell-all" to="/gerente/chamados" onClick={() => setAberto(false)}>
            Ver todos os chamados →
          </Link>
        </div>
      )}
    </div>
  );
}

// Aceitar (comentário opcional) ou recusar (motivo obrigatório), com confirmação.
export function ResponderChamado({ chamado, idGerente, onRespondido, onConflito }) {
  const uid = useId();
  const [modo, setModo] = useState(null); // "aceitar" | "recusar"
  const [texto, setTexto] = useState("");
  const [erroCampo, setErroCampo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const aceitar = modo === "aceitar";
  const nome = chamado.funcionario?.nomeFuncionario || "funcionário";

  function escolher(novoModo) {
    setModo(novoModo);
    setTexto("");
    setErroCampo("");
    setErro("");
    setConfirmando(false);
  }

  function continuar(event) {
    event.preventDefault();
    if (!aceitar && !texto.trim()) {
      setErroCampo("Informe o motivo da recusa.");
      return;
    }
    setErroCampo("");
    setConfirmando(true);
  }

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const { chamado: atualizado } = await responderChamado(chamado.idChamado, {
        idGerente: Number(idGerente),
        aceitar,
        ...(texto.trim() && { resposta: texto.trim() }),
      });
      onRespondido(atualizado, aceitar);
    } catch (error) {
      setErro(error.message);
      setConfirmando(false);
      if (error.status === 409) onConflito?.(error.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!modo) {
    return (
      <div className="chamado-acoes">
        {erro && <p className="chamado-inline-error" role="alert">{erro}</p>}
        <div className="mgr-modal-actions">
          <button type="button" className="mgr-primary" onClick={() => escolher("aceitar")}>Aceitar</button>
          <button type="button" className="mgr-delete-button chamado-recusar" onClick={() => escolher("recusar")}>Recusar</button>
        </div>
      </div>
    );
  }

  const campoId = `${uid}-texto`;
  const erroId = `${uid}-erro`;
  return (
    <form className="mgr-form chamado-acoes" onSubmit={continuar} noValidate>
      <label htmlFor={campoId}>
        {aceitar ? "Comentário (opcional)" : "Motivo da recusa (obrigatório)"}
      </label>
      <textarea
        id={campoId}
        rows="3"
        maxLength={1000}
        value={texto}
        disabled={confirmando}
        required={!aceitar}
        aria-invalid={Boolean(erroCampo)}
        aria-describedby={erroCampo ? erroId : undefined}
        placeholder={aceitar ? "Ex.: pedido feito ao distribuidor" : "Ex.: estoque da rede suficiente para a semana"}
        onChange={(e) => { setTexto(e.target.value); setErroCampo(""); }}
      />
      {erroCampo && <small className="chamado-field-error" id={erroId}>{erroCampo}</small>}
      {erro && <p role="alert">{erro}</p>}
      {confirmando ? (
        <div className="chamado-confirmar" role="group" aria-label="Confirmar resposta">
          <p>
            {aceitar ? "Aceitar" : "Recusar"} a solicitação #{chamado.idChamado} de {nome}?
          </p>
          <div className="mgr-modal-actions">
            <button type="button" className="mgr-secondary" disabled={enviando} onClick={() => setConfirmando(false)}>
              Voltar
            </button>
            <button
              type="button"
              className={aceitar ? "mgr-primary" : "mgr-delete-button chamado-recusar"}
              disabled={enviando}
              onClick={enviar}
              autoFocus
            >
              {enviando ? "Enviando..." : aceitar ? "Confirmar aceite" : "Confirmar recusa"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mgr-modal-actions">
          <button type="button" className="mgr-secondary" onClick={() => escolher(null)}>Cancelar</button>
          <button type="submit" className={aceitar ? "mgr-primary" : "mgr-delete-button chamado-recusar"}>
            {aceitar ? "Aceitar solicitação" : "Recusar solicitação"}
          </button>
        </div>
      )}
    </form>
  );
}
