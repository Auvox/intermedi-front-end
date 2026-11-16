import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ManagerIcon from "./ManagerIcon";
import PainelNotificacoes from "./PainelNotificacoes";
import { useVistas } from "../hooks/useVistas";
import { useRelogio } from "../hooks/useRastreio";
import { haQuanto, ICONE_MARCO } from "../services/rastreio";

// Sino do funcionário: cada etapa da entrega dos chamados que ele abriu e os
// remédios que chegaram na unidade por pedido de outra pessoa
export function SinoFuncionario({ rastreio, fonte }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const painelId = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const { naoLidos, marcarLidos } = rastreio;
  // o que já foi clicado (o resto fica em destaque)
  const { vistas, marcar } = useVistas();
  const agora = useRelogio(false);
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
    if (!aberto) marcarLidos();
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
        <PainelNotificacoes
          id={painelId}
          vistas={vistas}
          onMarcar={marcar}
          carregando={fonte.loading && !fonte.carregado}
          erros={fonte.error && !fonte.carregado ? [{ texto: fonte.error, tentar: fonte.retry }] : []}
          itens={rastreio.eventos.map((e) => ({
            chave: `entrega:${e.chave}`,
            icone: ICONE_MARCO[e.marco] ?? "truck",
            titulo: `${e.titulo} · ${e.item}`,
            detalhe: e.descricao,
            meta: `Entrega · ${haQuanto(e.quando, Math.max(agora, e.quando))}`,
            quando: e.quando,
            abrir: () => {
              setAberto(false);
              navigate(linkPedido(e));
            },
          }))}
          rodape={<Link to="/funcionario/chamados" onClick={() => setAberto(false)}>Minhas solicitações</Link>}
        />
      )}
    </div>
  );
}
