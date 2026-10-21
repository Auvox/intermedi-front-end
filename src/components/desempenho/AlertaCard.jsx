import { useState } from "react";
import { Link } from "react-router-dom";
import ManagerIcon from "../ManagerIcon";
import { horario } from "../../services/desempenho";
import { SEVERIDADES } from "./constantes";

// Um alerta em linguagem simples: o que está acontecendo, a causa provável e
// como resolver (passos). Botões: ver detalhes, resolver e silenciar por 1 hora.
// resumido: só o título e o que está acontecendo (visão geral e sino).
export default function AlertaCard({ alerta, onResolver, onSilenciar, resumido = false, abertoInicial = false, verDetalhesHref }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [enviando, setEnviando] = useState("");
  const [erro, setErro] = useState("");
  const severidade = SEVERIDADES[alerta.severidade] ?? SEVERIDADES.info;

  async function agir(tipo, acao) {
    setEnviando(tipo);
    setErro("");
    try {
      await acao(alerta);
    } catch (error) {
      setErro(error.message);
    } finally {
      setEnviando("");
    }
  }

  return (
    <article className={`adm-dsp-alerta is-${alerta.severidade}${alerta.status === "resolvido" ? " is-resolvido" : ""}`} id={`alerta-${alerta.id}`}>
      <header>
        <span className="adm-dsp-alerta-icone" aria-hidden="true"><ManagerIcon name={severidade.icone} size={18} /></span>
        <div>
          <span className="adm-dsp-alerta-severidade">{alerta.status === "resolvido" ? "Resolvido" : severidade.rotulo}</span>
          <h3>{alerta.titulo}</h3>
          <small>
            {alerta.status === "resolvido" && alerta.resolvidoEm
              ? `Resolvido em ${horario(alerta.resolvidoEm)}`
              : `Desde ${horario(alerta.criadoEm)}${alerta.ocorrencias > 1 ? ` · ${alerta.ocorrencias} ocorrências` : ""}`}
            {alerta.status === "silenciado" && " · silenciado"}
            {alerta.naoGravado && " · ainda não gravado (banco travado)"}
          </small>
        </div>
      </header>
      <p className="adm-dsp-alerta-oque">{alerta.oQue}</p>

      {!resumido && aberto && (
        <div className="adm-dsp-alerta-detalhe">
          <h4>Causa provável</h4>
          <p>{alerta.causa}</p>
          <h4>Como resolver</h4>
          <ol>
            {alerta.passos.map((passo) => <li key={passo}>{passo}</li>)}
          </ol>
        </div>
      )}

      {erro && <p className="chamado-inline-error" role="alert">{erro}</p>}

      {alerta.status !== "resolvido" && (
        <div className="adm-dsp-alerta-acoes">
          {resumido ? (
            verDetalhesHref && <Link className="mgr-text-button" to={verDetalhesHref} data-track="alerta-ver-detalhes">Ver detalhes</Link>
          ) : (
            <button type="button" className="mgr-text-button" aria-expanded={aberto} onClick={() => setAberto((v) => !v)} data-track="alerta-detalhes">
              {aberto ? "Esconder detalhes" : "Ver detalhes"}
            </button>
          )}
          {onResolver && (
            <button type="button" className="mgr-secondary" disabled={Boolean(enviando)} onClick={() => agir("resolver", onResolver)} data-track="alerta-resolver">
              {enviando === "resolver" ? "Salvando…" : "Marcar como resolvido"}
            </button>
          )}
          {onSilenciar && alerta.status !== "silenciado" && (
            <button type="button" className="mgr-secondary" disabled={Boolean(enviando)} onClick={() => agir("silenciar", onSilenciar)} data-track="alerta-silenciar">
              {enviando === "silenciar" ? "Salvando…" : "Silenciar por 1 hora"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
