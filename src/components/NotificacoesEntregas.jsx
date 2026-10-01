import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ManagerIcon from "./ManagerIcon";
import { ListaRastreio } from "./Rastreio";

// Sino do funcionário: cada etapa da entrega dos chamados que ele abriu e os
// remédios que chegaram na unidade por pedido de outra pessoa
export function SinoFuncionario({ rastreio, fonte }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const painelId = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const { naoLidos, marcarLidos } = rastreio;
  // Quais eram novas quando o sino abriu (abrir já marca como lidas)
  const [novos, setNovos] = useState(() => new Set());
  const linkPedido = (e) => `${location.pathname}?perfil=pedido:${e.pedido.idRedistribuicao}`;

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
    if (!aberto) {
      setNovos(new Set(rastreio.eventos.filter(rastreio.isNaoLido).map((e) => e.chave)));
      marcarLidos();
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
        aria-label={`Notificações: ${naoLidos} ${naoLidos === 1 ? "atualização de entrega" : "atualizações de entrega"}`}
        onClick={alternar}
      >
        <ManagerIcon name="bell" size={17} />
        <b>{naoLidos}</b>
      </button>
      {aberto && (
        <div className="chamado-bell-panel" id={painelId} role="region" aria-label="Entregas de remédios">
          <p className="chamado-bell-title">Rastreamento das entregas</p>
          {fonte.loading && !fonte.carregado ? (
            <p className="chamado-bell-empty" role="status">Carregando…</p>
          ) : fonte.error && !fonte.carregado ? (
            <div className="chamado-bell-empty" role="alert">
              <p>{fonte.error}</p>
              <button type="button" className="mgr-text-button" onClick={fonte.retry}>Tentar de novo</button>
            </div>
          ) : (
            <ListaRastreio
              eventos={rastreio.eventos}
              isNovo={(e) => novos.has(e.chave)}
              linkPara={linkPedido}
              onAbrir={(e) => { setAberto(false); navigate(linkPedido(e)); }}
            />
          )}
          <Link className="chamado-bell-all" to="/funcionario/chamados" onClick={() => setAberto(false)}>
            Minhas solicitações →
          </Link>
        </div>
      )}
    </div>
  );
}
