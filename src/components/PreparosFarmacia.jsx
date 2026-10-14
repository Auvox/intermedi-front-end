import { useState } from "react";
import ManagerIcon from "./ManagerIcon";
import { iniciarPreparo } from "../services/api";
import { preparoDoPedido } from "../services/rastreio";
import { useRelogio } from "../hooks/useRastreio";
import "../styles/preparos.css";

const relogio = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const item = (p) => `${p.quantidade}× ${[p.nomeRemedio, p.dosagemRemedio].filter(Boolean).join(" ")}`;

// Avisos de preparo para os funcionários da farmácia fornecedora:
//   aguardando → "Prepare 50× Paracetamol para a Farmácia X" + [Começar]
//   em preparo por você → caixas no caminhão e contagem até a saída
//   em preparo por outra pessoa → "Fulano aceitou o pedido #N"
// O "Começar" pode ser apertado por mais de um funcionário ao mesmo tempo: a
// API aceita só o primeiro e responde 409 aos demais, com o nome de quem assumiu.
export default function PreparosFarmacia({ preparos, idFuncionario, onAviso }) {
  const [enviando, setEnviando] = useState(null);
  const [recusados, setRecusados] = useState({}); // idRedistribuicao → nome de quem assumiu
  const emPreparo = preparos.pedidos.some((p) => p.status === "preparando");
  const agora = useRelogio(emPreparo, 1000);

  if (!preparos.pedidos.length) return null;

  async function comecar(p) {
    setEnviando(p.idRedistribuicao);
    try {
      await iniciarPreparo(p.idRedistribuicao, idFuncionario);
      onAviso?.(`Você começou o preparo: ${item(p)}. Leve as caixas até o caminhão.`);
    } catch (error) {
      if (error.status === 409) {
        const quem = error.pedido?.nomeFuncionarioPreparo;
        setRecusados((atual) => ({ ...atual, [p.idRedistribuicao]: quem || "Outro funcionário" }));
        onAviso?.(error.message);
      } else {
        onAviso?.(error.message || "Não foi possível começar o preparo.");
      }
    } finally {
      setEnviando(null);
      preparos.reload();
    }
  }

  return (
    <section className="preparos" aria-label="Pedidos da rede para preparar">
      {preparos.pedidos.map((p) => {
        const numero = `#${p.idRedistribuicao}`;
        const quemAssumiu = p.nomeFuncionarioPreparo ?? recusados[p.idRedistribuicao];

        if (p.status === "aprovada" && !recusados[p.idRedistribuicao]) {
          return (
            <article key={p.idRedistribuicao} className="preparo preparo-aguardando">
              <span className="preparo-icone"><ManagerIcon name="box" size={20} /></span>
              <div className="preparo-texto">
                <strong>{p.mensagemPreparo}</strong>
                <small>
                  Pedido {numero} · {p.caixas} {p.caixas === 1 ? "caixa" : "caixas"} de {p.unidadesPorCaixa} un. ·
                  cerca de {p.segundosPreparo} s para carregar o caminhão
                </small>
              </div>
              <button
                type="button"
                className="mgr-primary"
                disabled={enviando !== null}
                aria-label={`Começar o preparo do pedido ${numero}: ${item(p)}`}
                onClick={() => comecar(p)}
              >
                {enviando === p.idRedistribuicao ? "Começando…" : "Começar"}
              </button>
            </article>
          );
        }

        if (p.status === "preparando" && p.voce) {
          const prep = preparoDoPedido(p, agora);
          return (
            <article key={p.idRedistribuicao} className="preparo preparo-voce" aria-live="polite">
              <span className="preparo-icone"><ManagerIcon name="truck" size={20} /></span>
              <div className="preparo-texto">
                <strong>Você está preparando o pedido {numero}: {item(p)}</strong>
                <small>
                  {prep
                    ? `${prep.carregadas}/${prep.caixas} ${prep.caixas === 1 ? "caixa" : "caixas"} no caminhão · sai em ${relogio(prep.restante)}`
                    : "Carregando o caminhão"}
                  {` · para a ${p.nomeFarmaciaDestino}`}
                </small>
                {prep && (
                  <span className="preparo-barra" role="meter" aria-valuemin={0} aria-valuemax={prep.caixas} aria-valuenow={prep.carregadas} aria-label="Caixas no caminhão">
                    <i style={{ width: `${Math.round(prep.fracao * 100)}%` }} />
                  </span>
                )}
              </div>
            </article>
          );
        }

        // alguém já assumiu (ou o caminhão já saiu)
        const saiu = ["enviada", "recebida"].includes(p.status);
        return (
          <article key={p.idRedistribuicao} className="preparo preparo-outro">
            <span className="preparo-icone"><ManagerIcon name={saiu ? "truck" : "check"} size={18} /></span>
            <div className="preparo-texto">
              <strong>
                {p.voce
                  ? `Você preparou o pedido ${numero}`
                  : `${quemAssumiu || "Um colega"} aceitou o pedido ${numero}`}
              </strong>
              <small>{item(p)} · {saiu ? `saiu para a ${p.nomeFarmaciaDestino}` : "em preparo"}</small>
            </div>
          </article>
        );
      })}
    </section>
  );
}
