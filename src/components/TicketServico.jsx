import { numeroDoServico } from "../services/relatorio";

// Primeira coluna da lista de serviços: um "cupom" com o número do comprovante.
// Abre o comprovante (o clique na linha inteira também abre).
export default function TicketServico({ servico: s, onAbrir }) {
  const numero = numeroDoServico(s);
  return (
    <button
      type="button"
      className="cp-ticket"
      aria-label={`Ver comprovante ${numero}`}
      onClick={(e) => onAbrir(e.currentTarget.closest("tr") ?? e.currentTarget)}
    >
      <span className="cp-ticket-papel" aria-hidden="true"><i /><i /><i /></span>
      <span className="cp-ticket-texto">
        <strong className="cp-mono">{numero}</strong>
        <small>Ver comprovante →</small>
      </span>
    </button>
  );
}
