import { useCallback, useEffect, useId, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { ContagemEntrega, ErroComRetry, StatusPedidoBadge } from "../components/Chamados";
import { FotoRemedio, TarjaBadge } from "../components/Remedios";
import { usePerfil } from "../components/perfil/perfilContext";
import { propsLinha } from "../services/perfil";
import { INTERVALO_CHAMADOS, usePolling } from "../hooks/useChamados";
import { listarPedidosGerente, responderPedido } from "../services/api";
import {
  INTERVALO_A_CAMINHO,
  STATUS_PEDIDO,
  formatarDataChamado,
  tempoDesde,
} from "../services/chamados";

const ABAS = [
  ["recebidos", "Recebidos", "Outras farmácias pedindo remédios para a sua"],
  ["enviados", "Enviados", "O que a sua farmácia pediu à rede"],
];

// Pedidos de remédio entre farmácias (redistribuição).
// Recebidos: esta farmácia é a fornecedora. Enviados: esta farmácia pediu.
export default function ManagerNetworkOrders() {
  const { gerente, pedidosRede, notify } = useOutletContext();
  const { idGerente } = gerente;
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba") === "enviados" ? "enviados" : "recebidos";
  const destaque = params.get("pedido");
  const [status, setStatus] = useState("");

  const fetcher = useCallback(
    (options) => listarPedidosGerente(idGerente, aba, status, options),
    [idGerente, aba, status],
  );
  const { data, loading, error, reload, retry, setData } = usePolling(fetcher, {
    enabled: Boolean(idGerente),
    // mais rápido enquanto há remédio a caminho (a contagem é local)
    interval: (dados) =>
      (dados?.pedidos ?? []).some((p) => p.status === "enviada") ? INTERVALO_A_CAMINHO : INTERVALO_CHAMADOS,
  });
  // A lista anterior pode ser de outra aba enquanto a nova carrega
  const pedidos = data?.tipo === aba ? data.pedidos ?? [] : [];

  // Vindo do sino (?pedido=ID): rola até o cartão
  useEffect(() => {
    if (!destaque || !pedidos.length) return;
    document.getElementById(`pedido-${destaque}`)?.scrollIntoView({ block: "center" });
  }, [destaque, pedidos.length]);

  function trocarAba(valor) {
    setStatus("");
    setParams(valor === "recebidos" ? {} : { aba: valor });
  }
  function respondido(pedido, mensagem) {
    setData((atual) =>
      atual && { ...atual, pedidos: atual.pedidos.map((p) => (p.idRedistribuicao === pedido.idRedistribuicao ? pedido : p)) },
    );
    notify(mensagem);
    reload();
    pedidosRede.reload();
  }
  function conflito() {
    reload();
    pedidosRede.reload();
  }

  const header = (
    <header className="mgr-page-head">
      <div>
        <p className="mgr-eyebrow">REDE INTERMEDI</p>
        <h1>Pedidos da rede</h1>
        <p>Farmácias da rede pedem remédios umas às outras. Aceite para enviar do seu estoque.</p>
      </div>
    </header>
  );
  if (!idGerente) {
    return (
      <>
        {header}
        <section className="mgr-panel">
          {gerente.loading ? (
            <p className="mgr-empty" role="status">Carregando gerente…</p>
          ) : (
            <ErroComRetry message={gerente.error || "Selecione um gerente na barra superior."} onRetry={gerente.error ? gerente.retry : undefined} />
          )}
        </section>
      </>
    );
  }

  return (
    <>
      {header}
      <section className="mgr-panel">
        <div className="mgr-toolbar">
          <div className="mgr-tabs" role="tablist" aria-label="Tipo de pedido">
            {ABAS.map(([valor, label]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={aba === valor}
                aria-pressed={aba === valor}
                onClick={() => trocarAba(valor)}
              >
                {label}
                {valor === "recebidos" && pedidosRede.totalPendentes > 0 && ` (${pedidosRede.totalPendentes})`}
              </button>
            ))}
          </div>
          <select aria-label="Filtrar por status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_PEDIDO).map(([valor, { label }]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </select>
          <button type="button" className="mgr-secondary" onClick={reload}>Atualizar</button>
        </div>
        <p className="chamado-pedidos-descricao">{ABAS.find(([v]) => v === aba)[2]}.</p>

        {loading || (data && data.tipo !== aba) ? (
          <p className="mgr-empty" role="status">Carregando pedidos…</p>
        ) : error && !data ? (
          <ErroComRetry message={error} onRetry={retry} />
        ) : !pedidos.length ? (
          <p className="mgr-empty">
            {aba === "recebidos" ? "Nenhuma farmácia pediu remédios para a sua." : "Sua farmácia ainda não pediu remédios à rede."}
          </p>
        ) : aba === "recebidos" ? (
          <ul className="chamado-pedidos">
            {pedidos.map((p) => (
              <li key={p.idRedistribuicao} id={`pedido-${p.idRedistribuicao}`}>
                <PedidoRecebido
                  pedido={p}
                  idGerente={idGerente}
                  destacado={String(p.idRedistribuicao) === destaque}
                  onRespondido={respondido}
                  onConflito={conflito}
                />
              </li>
            ))}
          </ul>
        ) : (
          <PedidosEnviados pedidos={pedidos} />
        )}
        {data && (
          <p className="mgr-table-note">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} · Atualiza automaticamente
          </p>
        )}
      </section>
    </>
  );
}

function PedidoRecebido({ pedido: p, idGerente, destacado, onRespondido, onConflito }) {
  const uid = useId();
  const { abrirPerfil } = usePerfil();
  const [modo, setModo] = useState(null); // "aceitar" | "recusar"
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [semEstoque, setSemEstoque] = useState(false);
  const depois = Number(p.estoqueOrigem) - Number(p.quantidade);
  const abaixo = depois < Number(p.estoqueMinimoOrigem);

  async function enviar() {
    if (enviando) return;
    const aceitar = modo === "aceitar";
    setEnviando(true);
    setErro("");
    try {
      const { pedido, encaminhadoPara } = await responderPedido(p.idRedistribuicao, {
        idGerente: Number(idGerente),
        aceitar,
        ...(!aceitar && motivo.trim() && { motivo: motivo.trim() }),
      });
      setModo(null);
      onRespondido(
        pedido,
        aceitar
          ? `${p.quantidade}× ${p.nomeRemedio} a caminho da ${p.nomeFarmaciaDestino}. Saiu do seu estoque.`
          : encaminhadoPara
            ? `Pedido repassado para ${encaminhadoPara.nomeFarmacia}.`
            : "Nenhuma outra farmácia tem esse remédio; a farmácia solicitante será avisada.",
      );
    } catch (e) {
      setErro(e.message);
      setModo(null);
      // 409 "Sua farmácia não tem N unidades…": destaca o Recusar
      if (e.status === 409 && /não tem/i.test(e.message)) setSemEstoque(true);
      else if (e.status === 409) onConflito();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article
      {...propsLinha((el) => abrirPerfil("pedido", p.idRedistribuicao, el), `Abrir pedido #${p.idRedistribuicao}: ${p.mensagem}`)}
      className={`perfil-linha chamado-pedido${destacado ? " chamado-pedido-destaque" : ""}`}
    >
      <div className="chamado-pedido-topo">
        <FotoRemedio foto={p.fotoRemedio} nome={p.nomeRemedio} tamanho="md" />
        <div>
          <p className="chamado-pedido-msg" id={`${uid}-msg`}>{p.mensagem}</p>
          <div className="remedio-selos">
            <TarjaBadge valor={p.tarjaRemedio} />
            <span aria-live="polite"><StatusPedidoBadge status={p.status} /></span>
          </div>
          <small>
            Pedido {tempoDesde(p.dataSolicitacao)}
            {p.idChamado ? ` · chamado #${p.idChamado}` : ""}
          </small>
        </div>
      </div>

      {p.status === "solicitada" && (
        <p className="chamado-pedido-impacto">
          Seu estoque: {p.estoqueOrigem} → <strong>{depois}</strong> após enviar (mínimo {p.estoqueMinimoOrigem})
          {abaixo && <span className="chamado-pedido-abaixo"> · vai ficar abaixo do mínimo</span>}
        </p>
      )}
      {p.status === "enviada" && (
        <p className="chamado-pedido-impacto">
          Enviado por {p.nomeGerenteResposta || "você"} · <ContagemEntrega dataPrevistaChegada={p.dataPrevistaChegada} />
        </p>
      )}
      {p.status === "recebida" && (
        <p className="chamado-pedido-impacto">Entregue em {formatarDataChamado(p.dataRecebimento)}</p>
      )}
      {p.status === "recusada" && (
        <p className="chamado-pedido-impacto">
          Recusado{p.nomeGerenteResposta ? ` por ${p.nomeGerenteResposta}` : ""}
          {p.motivoRecusa ? ` — Motivo: ${p.motivoRecusa}` : ""}
        </p>
      )}

      {erro && <p className="chamado-inline-error" role="alert">{erro}</p>}

      {p.status === "solicitada" && !modo && (
        <div className="mgr-modal-actions">
          {!semEstoque && (
            <button type="button" className="mgr-primary" onClick={() => setModo("aceitar")}>Aceitar e enviar</button>
          )}
          <button
            type="button"
            className={`mgr-delete-button chamado-recusar${semEstoque ? " chamado-recusar-destaque" : ""}`}
            onClick={() => setModo("recusar")}
          >
            Recusar
          </button>
        </div>
      )}

      {modo && (
        <div className="chamado-confirmar" role="group" aria-label="Confirmar resposta">
          {modo === "recusar" && (
            <label className="chamado-pedido-motivo" htmlFor={`${uid}-motivo`}>
              Motivo (opcional)
              <textarea
                id={`${uid}-motivo`}
                rows="2"
                maxLength={500}
                value={motivo}
                disabled={enviando}
                placeholder="Ex.: reservado para campanha"
                onChange={(e) => setMotivo(e.target.value)}
              />
            </label>
          )}
          <p>
            {modo === "aceitar"
              ? `Enviar ${p.quantidade}× ${p.nomeRemedio} para ${p.nomeFarmaciaDestino}? Sai do seu estoque agora.`
              : `Recusar o pedido de ${p.nomeFarmaciaDestino}? Ele será repassado para outra farmácia, se houver.`}
          </p>
          <div className="mgr-modal-actions">
            <button type="button" className="mgr-secondary" disabled={enviando} onClick={() => setModo(null)}>Voltar</button>
            <button
              type="button"
              className={modo === "aceitar" ? "mgr-primary" : "mgr-delete-button chamado-recusar"}
              disabled={enviando}
              onClick={enviar}
              autoFocus
            >
              {enviando ? "Enviando..." : modo === "aceitar" ? "Confirmar envio" : "Confirmar recusa"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function PedidosEnviados({ pedidos }) {
  const { abrirPerfil } = usePerfil();
  return (
    <div className="mgr-table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Remédio</th>
            <th scope="col">Farmácia fornecedora</th>
            <th scope="col">Status</th>
            <th scope="col">Entrega</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <tr key={p.idRedistribuicao} {...propsLinha((el) => abrirPerfil("pedido", p.idRedistribuicao, el), `Abrir pedido #${p.idRedistribuicao}`)}>
              <td>
                <strong>{p.quantidade}× {p.nomeRemedio}</strong>
                <small>{p.dosagemRemedio}{p.idChamado ? ` · chamado #${p.idChamado}` : ""}</small>
              </td>
              <td>{p.nomeFarmaciaOrigem}</td>
              <td>
                <span aria-live="polite"><StatusPedidoBadge status={p.status} /></span>
                {p.status === "recusada" && p.motivoRecusa && <small>Motivo: {p.motivoRecusa}</small>}
              </td>
              <td>
                {p.status === "enviada" ? (
                  <ContagemEntrega dataPrevistaChegada={p.dataPrevistaChegada} />
                ) : p.status === "recebida" ? (
                  formatarDataChamado(p.dataRecebimento)
                ) : (
                  `pedido ${tempoDesde(p.dataSolicitacao)}`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
