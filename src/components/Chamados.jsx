import { useEffect, useRef } from "react";
import { prioridadeChamado, statusChamado, textoResposta } from "../services/chamados";
import "../styles/chamados.css";

export function ChamadoModal({ title, onClose, children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog ref={ref} className={`mgr-modal chamado-modal ${className}`} aria-label={title} onCancel={onClose}>
      <div className="mgr-modal-head">
        <h2>{title}</h2>
        <button type="button" aria-label="Fechar janela" onClick={onClose}>×</button>
      </div>
      {children}
    </dialog>
  );
}

export function StatusChamadoBadge({ status }) {
  const { label, tone } = statusChamado(status);
  return <span className={`mgr-badge chamado-badge ${tone}`}>{label}</span>;
}

export function PrioridadeBadge({ prioridade }) {
  const { label, tone } = prioridadeChamado(prioridade);
  return <span className={`mgr-badge chamado-badge ${tone}`} title="Prioridade">{label}</span>;
}

export function CriticoBadge() {
  return <span className="mgr-badge chamado-badge red">Estoque crítico</span>;
}

export function RemediosChamadoTable({ remedios = [] }) {
  return (
    <div className="mgr-table-wrap chamado-remedios">
      <table>
        <thead>
          <tr>
            <th scope="col">Remédio</th>
            <th scope="col">Solicitado</th>
            <th scope="col">Estoque atual</th>
          </tr>
        </thead>
        <tbody>
          {remedios.map((r) => (
            <tr key={r.idRemedio}>
              <td>
                <strong>{r.nomeRemedio}</strong>
                {r.dosagemRemedio && <small>{r.dosagemRemedio}</small>}
              </td>
              <td>{Number(r.quantidadeSolicitada).toLocaleString("pt-BR")} un.</td>
              <td>
                <span className="chamado-estoque">
                  {Number(r.estoqueAtual).toLocaleString("pt-BR")} un.
                  {r.critico && <CriticoBadge />}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RespostaChamado({ chamado }) {
  if (!chamado.resposta) return null;
  return (
    <p className={`chamado-resposta ${chamado.status === "recusado" ? "recusado" : "aceito"}`}>
      {textoResposta(chamado)}
    </p>
  );
}

export function ErroComRetry({ message, onRetry }) {
  return (
    <div className="mgr-empty" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="mgr-secondary chamado-retry" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

// Escolha de funcionário/gerente enquanto o login das personas não existe
export function SeletorPersona({ label, value, onChange, options }) {
  return (
    <label className="chamado-seletor" title="Temporário: substitui o login até ele ser implementado">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([id, nome]) => (
          <option key={id} value={id}>{nome}</option>
        ))}
      </select>
    </label>
  );
}

// Região sempre presente para leitores de tela anunciarem o toast
export function ToastRegion({ message }) {
  return (
    <div className="chamado-toast-region" aria-live="polite" role="status">
      {message && <div className="chamado-toast">{message}</div>}
    </div>
  );
}
