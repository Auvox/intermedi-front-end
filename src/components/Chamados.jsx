import { useEffect, useRef } from "react";
import ManagerIcon from "./ManagerIcon";
import { useContagemRegressiva } from "../hooks/useChamados";
import {
  formatarContagem,
  formatarDataChamado,
  prioridadeChamado,
  progressoChamado,
  situacaoItem,
  statusChamado,
  statusPedido,
  textoResposta,
} from "../services/chamados";
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

export function SituacaoItemBadge({ situacao }) {
  const { label, tone, icone } = situacaoItem(situacao);
  return (
    <span className={`mgr-badge chamado-badge chamado-situacao ${tone}`}>
      {icone && <ManagerIcon name={icone} size={12} />}
      {label}
    </span>
  );
}

export function StatusPedidoBadge({ status }) {
  const { label, tone } = statusPedido(status);
  return <span className={`mgr-badge chamado-badge ${tone}`}>{label}</span>;
}

// "chega em 1:42" / "chegando…", calculado no navegador a cada 1 s.
// O número muda todo segundo, então só uma frase curta é anunciada ao leitor de
// tela (ao aparecer e ao chegar), para não repetir a contagem inteira.
export function ContagemEntrega({ dataPrevistaChegada }) {
  const segundos = useContagemRegressiva(dataPrevistaChegada);
  if (segundos === null) return null;
  const chegando = segundos === 0;
  return (
    <span className="chamado-contagem">
      <ManagerIcon name="truck" size={13} />
      <span aria-hidden="true">{chegando ? "chegando…" : `chega em ${formatarContagem(segundos)}`}</span>
      <span className="sr-only" aria-live="polite">
        {chegando ? "chegando" : `chega em cerca de ${Math.max(1, Math.round(segundos / 60))} min`}
      </span>
    </span>
  );
}

// Barra "recebidos / total de remédios"
export function ProgressoChamado({ chamado }) {
  const { recebidos, total } = progressoChamado(chamado);
  if (!total) return null;
  const pct = Math.round((recebidos / total) * 100);
  return (
    <div className="chamado-progresso">
      <span
        className="chamado-progresso-barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={recebidos}
        aria-label={`${recebidos} de ${total} remédios recebidos`}
      >
        <i style={{ width: `${pct}%` }} />
      </span>
      <small>{recebidos} de {total} {total === 1 ? "remédio recebido" : "remédios recebidos"}</small>
    </div>
  );
}

// Um passo da linha do tempo: feito, atual ou futuro
function Passo({ estado, children }) {
  return <li className={`chamado-passo chamado-passo-${estado}`}>{children}</li>;
}

// Situação de cada remédio do chamado (funcionário e gerente).
// linhaDoTempo: Pedido à rede → Aceito pela farmácia → A caminho → Recebido
// onAbrirRemedio(idRemedio): torna o nome do remédio clicável (abre o perfil)
export function AcompanhamentoRemedios({ chamado, linhaDoTempo = false, onAbrirRemedio }) {
  return (
    <ul className="chamado-itens" aria-label="Remédios do chamado">
      {(chamado.remedios ?? []).map((r) => {
        const p = r.pedidoAtual;
        const s = r.situacao;
        const aceito = ["a_caminho", "recebido"].includes(s);
        return (
          <li key={r.idRemedio} className="chamado-item">
            <div className="chamado-item-topo">
              <span>
                {onAbrirRemedio ? (
                  <button type="button" className="perfil-link" onClick={() => onAbrirRemedio(r.idRemedio)}>
                    <strong>{r.nomeRemedio}</strong>
                  </button>
                ) : (
                  <strong>{r.nomeRemedio}</strong>
                )}
                {r.dosagemRemedio && ` ${r.dosagemRemedio}`} · {r.quantidadeSolicitada} un.
              </span>
              <span aria-live="polite"><SituacaoItemBadge situacao={s} /></span>
            </div>
            {p?.nomeFarmaciaFornecedora && s !== "sem_fornecedor" && (
              <small>Fornecido por <strong>{p.nomeFarmaciaFornecedora}</strong></small>
            )}
            {s === "a_caminho" && <ContagemEntrega dataPrevistaChegada={p?.dataPrevistaChegada} />}
            {s === "recebido" && p?.dataRecebimento && (
              <small className="chamado-item-ok">Chegou em {formatarDataChamado(p.dataRecebimento)}</small>
            )}
            {linhaDoTempo && s && s !== "aguardando_gerente" && (
              <ol className="chamado-linha" aria-label={`Andamento de ${r.nomeRemedio}`}>
                <Passo estado="feito">Pedido à rede</Passo>
                {s === "sem_fornecedor" ? (
                  <Passo estado="erro">Nenhuma farmácia disponível</Passo>
                ) : (
                  <>
                    <Passo estado={aceito ? "feito" : "atual"}>
                      {aceito ? `Aceito por ${p?.nomeFarmaciaFornecedora}` : `Aguardando ${p?.nomeFarmaciaFornecedora ?? "farmácia"}`}
                    </Passo>
                    <Passo estado={s === "recebido" ? "feito" : s === "a_caminho" ? "atual" : "futuro"}>A caminho</Passo>
                    <Passo estado={s === "recebido" ? "feito" : "futuro"}>Recebido</Passo>
                  </>
                )}
              </ol>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Tentativas de pedido às farmácias (inclusive recusas e repasses)
export function HistoricoPedidos({ pedidos = [] }) {
  if (!pedidos.length) return null;
  return (
    <ol className="chamado-historico">
      {pedidos.map((p, i) => {
        const proximo = pedidos.slice(i + 1).find((o) => o.idRemedio === p.idRemedio);
        return (
          <li key={p.idRedistribuicao}>
            <span>
              <strong>{p.nomeRemedio}</strong> · {p.quantidade} un. — {p.nomeFarmaciaOrigem}{" "}
              {p.status === "recusada" ? (
                <>
                  recusou{p.motivoRecusa ? `: “${p.motivoRecusa}”` : ""}
                  {proximo && ` · repassado para ${proximo.nomeFarmaciaOrigem}`}
                </>
              ) : (
                <StatusPedidoBadge status={p.status} />
              )}
            </span>
            <small>{formatarDataChamado(p.dataSolicitacao, { ano: false })}</small>
          </li>
        );
      })}
    </ol>
  );
}

// Resultado de aceitar/redistribuir: para qual farmácia cada remédio foi pedido
export function DespachoResumo({ despacho = [] }) {
  if (!despacho.length) return null;
  return (
    <div className="chamado-despacho" role="status">
      <p><strong>Pedidos enviados à rede</strong></p>
      <ul>
        {despacho.map((d) => (
          <li key={d.idRemedio} className={d.enviadoPara ? undefined : "chamado-despacho-sem"}>
            {d.nomeRemedio} →{" "}
            {d.enviadoPara ? `pedido enviado à ${d.enviadoPara.nomeFarmacia}` : "nenhuma farmácia tem"}
          </li>
        ))}
      </ul>
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
