import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ManagerIcon from "./ManagerIcon";
import { DespachoResumo } from "./Chamados";
import { ListaRastreio } from "./Rastreio";
import { disponibilidadeChamado, redistribuirChamado, responderChamado } from "../services/api";
import { prioridadeChamado, resumoRemedios, tempoDesde } from "../services/chamados";

// Sininho do topo: chamados pendentes da equipe, pedidos de outras farmácias e
// o rastreamento das entregas (o que a farmácia pediu e o que ela está enviando).
export function NotificacoesGerente({ gerente, pendentes, pedidos, rastreio }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const painelId = useId();
  const navigate = useNavigate();
  const location = useLocation();
  // Atualizações de entrega que eram novas quando o sino abriu (abrir já marca como lidas)
  const [novos, setNovos] = useState(() => new Set());
  const totalPedidos = pedidos?.totalPendentes ?? 0;
  const totalEntregas = rastreio?.naoLidos ?? 0;
  const total = pendentes.totalPendentes + totalPedidos + totalEntregas;
  // o pedido abre na página de rastreamento, por cima da tela atual
  const linkPedido = (e) => `${location.pathname}?perfil=pedido:${e.pedido.idRedistribuicao}`;

  function alternar() {
    if (!aberto && rastreio) {
      setNovos(new Set(rastreio.eventos.filter(rastreio.isNaoLido).map((e) => e.chave)));
      rastreio.marcarLidos();
    }
    setAberto((v) => !v);
  }

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
        aria-label={`Notificações: ${pendentes.totalPendentes} ${pendentes.totalPendentes === 1 ? "chamado pendente" : "chamados pendentes"}, ${totalPedidos} ${totalPedidos === 1 ? "pedido da rede" : "pedidos da rede"} e ${totalEntregas} ${totalEntregas === 1 ? "atualização de entrega" : "atualizações de entrega"}`}
        onClick={alternar}
      >
        <ManagerIcon name="bell" size={17} />
        <b>{total}</b>
      </button>
      {aberto && (
        <div className="chamado-bell-panel" id={painelId} role="region" aria-label="Notificações">
          <p className="chamado-bell-title">Chamados da sua equipe</p>
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
          <p className="chamado-bell-title chamado-bell-secao">Pedidos de outras farmácias</p>
          {pedidos?.loading ? (
            <p className="chamado-bell-empty" role="status">Carregando…</p>
          ) : pedidos?.error ? (
            <div className="chamado-bell-empty" role="alert">
              <p>{pedidos.error}</p>
              <button type="button" className="mgr-text-button" onClick={pedidos.retry}>Tentar de novo</button>
            </div>
          ) : pedidos?.pedidos.length ? (
            <ul>
              {pedidos.pedidos.slice(0, 5).map((p) => (
                <li key={p.idRedistribuicao}>
                  <Link to={`/gerente/pedidos?pedido=${p.idRedistribuicao}`} onClick={() => setAberto(false)}>
                    {p.mensagem}
                    <small>{tempoDesde(p.dataSolicitacao)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="chamado-bell-empty">Nenhum pedido aguardando você.</p>
          )}
          <Link className="chamado-bell-all" to="/gerente/pedidos" onClick={() => setAberto(false)}>
            Ver pedidos da rede →
          </Link>
          {rastreio && (
            <>
              <p className="chamado-bell-title chamado-bell-secao">Rastreamento das entregas</p>
              <ListaRastreio
                eventos={rastreio.eventos}
                isNovo={(e) => novos.has(e.chave)}
                linkPara={linkPedido}
                onAbrir={(e) => { setAberto(false); navigate(linkPedido(e)); }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Aceitar (comentário opcional) ou recusar (motivo obrigatório), com confirmação.
// Aceitar = pedir à rede: o chamado vai para "em_andamento" e cada remédio é
// pedido a uma farmácia fornecedora (resposta.despacho).
export function ResponderChamado({ chamado, idGerente, avisoSemFornecedor = false, onRespondido, onConflito }) {
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
      const resposta = await responderChamado(chamado.idChamado, {
        idGerente: Number(idGerente),
        aceitar,
        ...(texto.trim() && { resposta: texto.trim() }),
      });
      onRespondido(resposta.chamado, resposta.despacho ?? []);
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
        {avisoSemFornecedor && (
          <p className="remedio-aviso remedio-aviso-alerta">
            Alguns remédios ficarão sem fornecedor. Você poderá tentar de novo depois.
          </p>
        )}
        <div className="mgr-modal-actions">
          <button type="button" className="mgr-primary" onClick={() => escolher("aceitar")}>Aceitar e pedir à rede</button>
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
        placeholder={aceitar ? "Ex.: prioridade para a Dipirona" : "Ex.: estoque da rede suficiente para a semana"}
        onChange={(e) => { setTexto(e.target.value); setErroCampo(""); }}
      />
      {erroCampo && <small className="chamado-field-error" id={erroId}>{erroCampo}</small>}
      {erro && <p role="alert">{erro}</p>}
      {confirmando ? (
        <div className="chamado-confirmar" role="group" aria-label="Confirmar resposta">
          <p>
            {aceitar ? "Aceitar e pedir à rede" : "Recusar"} a solicitação #{chamado.idChamado} de {nome}?
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
            {aceitar ? "Aceitar e pedir à rede" : "Recusar solicitação"}
          </button>
        </div>
      )}
    </form>
  );
}

// Antes de aceitar: quais farmácias da rede têm cada remédio do chamado.
// Avisa o pai se algum remédio ficará sem fornecedor.
export function DisponibilidadeRede({ chamado, idGerente, onCarregado }) {
  const [estado, setEstado] = useState({ dados: null, loading: true, erro: "" });
  const [tentativa, setTentativa] = useState(0);
  const avisar = useRef(onCarregado);
  useEffect(() => { avisar.current = onCarregado; });

  useEffect(() => {
    const controller = new AbortController();
    disponibilidadeChamado(chamado.idChamado, idGerente, { signal: controller.signal })
      .then((dados) => {
        setEstado({ dados, loading: false, erro: "" });
        avisar.current?.(dados);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setEstado({ dados: null, loading: false, erro: e.message });
      });
    return () => controller.abort();
  }, [chamado.idChamado, idGerente, tentativa]);

  if (estado.loading) return <p className="mgr-empty" role="status">Consultando a rede…</p>;
  if (estado.erro) {
    return (
      <div className="chamado-inline-error chamado-aviso" role="alert">
        <p>{estado.erro}</p>
        <button type="button" className="mgr-text-button" onClick={() => { setEstado((a) => ({ ...a, loading: true })); setTentativa((t) => t + 1); }}>
          Tentar de novo
        </button>
      </div>
    );
  }
  return (
    <div className="chamado-rede">
      {estado.dados.remedios.map((r) => {
        const escolhida = r.farmacias.find((f) => f.podeAtender);
        return (
          <section key={r.idRemedio} className="chamado-rede-card" aria-label={`Disponibilidade de ${r.nomeRemedio}`}>
            <div className="chamado-item-topo">
              <strong>{r.nomeRemedio}{r.dosagemRemedio ? ` ${r.dosagemRemedio}` : ""}</strong>
              <span>Pedido: {r.quantidadeSolicitada} un.</span>
            </div>
            {!r.temFornecedor && (
              <p className="remedio-aviso remedio-aviso-erro">Nenhuma farmácia da rede pode atender este remédio agora.</p>
            )}
            {r.farmacias.length ? (
              <ul>
                {r.farmacias.map((f) => (
                  <li key={f.idFarmacia} className={f === escolhida ? "chamado-rede-escolhida" : undefined}>
                    <span>
                      <strong>{f.nomeFarmacia}</strong>
                      <small>tem {f.quantidade} · mínimo {f.estoqueMinimo} · pode enviar {f.disponivel}</small>
                      {f === escolhida && <small className="chamado-rede-dica">Provável fornecedora</small>}
                    </span>
                    <span className="remedio-selos">
                      <span className={`mgr-badge chamado-badge ${f.podeAtender ? "green" : "neutral"}`}>
                        {f.podeAtender ? "Pode atender" : "Não pode atender"}
                      </span>
                      {f.vencido && <span className="mgr-badge chamado-badge red">Lote vencido</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="remedio-obrigatorio-nota">Nenhuma outra farmácia tem este remédio em estoque.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// Itens sem fornecedor: pede de novo à rede (sem repetir farmácias que recusaram)
export function TentarDeNovo({ chamado, idGerente, onRedistribuido }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [despacho, setDespacho] = useState(null);

  async function tentar() {
    setEnviando(true);
    setErro("");
    try {
      const resposta = await redistribuirChamado(chamado.idChamado, Number(idGerente));
      setDespacho(resposta.despacho ?? []);
      onRedistribuido(resposta.chamado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="chamado-acoes">
      <p className="remedio-aviso remedio-aviso-erro">
        Alguns remédios ficaram sem fornecedor. Você pode pedir de novo à rede.
      </p>
      {erro && <p className="chamado-inline-error" role="alert">{erro}</p>}
      {despacho && <DespachoResumo despacho={despacho} />}
      <div className="mgr-modal-actions">
        <button type="button" className="mgr-primary" disabled={enviando} onClick={tentar}>
          {enviando ? "Enviando..." : "Tentar de novo"}
        </button>
      </div>
    </div>
  );
}
