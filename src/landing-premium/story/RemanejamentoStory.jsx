import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { farmacias, simulacoes } from "../content";
import { useMotion } from "../hooks";
import { montarHistoria } from "./storyData";
import { TOTAL_ETAPAS, useScrollStory } from "./useScrollStory";
import PharmacyCard from "./PharmacyCard";
import TransferConnection from "./TransferConnection";
import StoryProgress from "./StoryProgress";
import "./story.css";

// "Uma rede, não uma ilha.": a narrativa do remanejamento conduzida pela
// rolagem. O palco fica preso (sticky) enquanto o contêiner alto rola; cada
// trecho da rolagem é uma etapa. Sem movimento (sistema ou menu de
// acessibilidade), vira uma sequência estática com o resultado final.
export default function RemanejamentoStory() {
  const raiz = useRef(null);
  const rolagem = useRef(null);
  const movimento = useMotion();
  const [casoId, setCasoId] = useState(simulacoes[0].id);
  const [etapa, setEtapa] = useState(0);
  const caso = simulacoes.find((c) => c.id === casoId);
  // memorizada: a timeline só é refeita quando o caso muda
  const historia = useMemo(() => montarHistoria(simulacoes.find((c) => c.id === casoId)), [casoId]);

  useScrollStory({ raiz, rolagem, historia, ativo: movimento, aoMudarEtapa: setEtapa });

  const { solicitante: sol, fornecedora: forn, remedio, quantidade, escala, etapas } = historia;
  const etapaVista = movimento ? etapa : TOTAL_ETAPAS - 1;
  const versao = `${casoId}-${movimento ? "animado" : "estatico"}`;
  const atual = etapas[etapaVista];
  // as farmácias da rede que não entram neste caso
  const outras = Object.entries(farmacias).filter(([id]) => id !== caso.falta.id && id !== caso.envia.id);

  return (
    <section ref={raiz} id="solucao" className="rms lpx-fundo-green" data-fundo="green" aria-labelledby="solucao-titulo">
      <div ref={rolagem} className={`rms-rolagem ${movimento ? "is-animado" : "is-estatico"}`}>
        <div className="rms-palco">
          <div className="rms-texto">
            <h2 id="solucao-titulo" className="lpx-h2 rms-titulo">
              <span className="lpx-linha"><span data-story="titulo-linha">Uma rede,</span></span>{" "}
              <span className="lpx-linha"><span data-story="titulo-linha">não uma ilha.</span></span>
            </h2>

            <ol className="rms-narrativa" aria-label="O remanejamento, etapa por etapa">
              {etapas.map((e, i) => (
                <li key={e.nome} className="rms-passo" data-story="texto">
                  <p className="rms-micro"><span className="rms-passo-nome">{e.nome}</span>{e.micro}</p>
                  <p className="rms-detalhe">{e.detalhe}</p>
                  {i === TOTAL_ETAPAS - 1 && (
                    <Link to="/login" className="lpx-btn lpx-btn-paper rms-cta">Acessar a plataforma</Link>
                  )}
                </li>
              ))}
            </ol>
            <p className="lpx-sr" aria-live="polite">{movimento ? `${atual.nome}: ${atual.micro}` : ""}</p>

            <fieldset className="rms-casos">
              <legend>Casos reais da base de demonstração</legend>
              <div>
                {simulacoes.map((c) => (
                  <button key={c.id} type="button" aria-pressed={casoId === c.id} onClick={() => setCasoId(c.id)}>
                    {c.remedio.split(" ")[0]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="rms-cena" data-ui>
            <div className="rms-rede" aria-hidden="true">
              <svg className="rms-rede-linhas" data-story="rede-linhas" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M18 50 L50 20 L82 50 L50 80 Z M18 50 H82 M50 20 V80" />
              </svg>
              <span className="rms-no rms-no-sol" data-story="rede-sol">{sol.nome}</span>
              <span className="rms-no rms-no-forn" data-story="rede-forn">{forn.nome}</span>
              {outras.map(([id, f], i) => (
                <span key={id} className={`rms-no rms-no-outra-${i}`} data-story="rede-outra">{f.nome}</span>
              ))}
            </div>

            <PharmacyCard
              papel="solicitante"
              versao={versao}
              farmacia={sol}
              remedio={remedio}
              escala={escala}
              status={atual.statusSolicitante}
              resolvido="Reposto"
              aviso={{
                critico: `Faltam ${sol.minimo - sol.inicial} un. para o mínimo`,
                ok: `Reposto: ${sol.final - sol.minimo} un. acima do mínimo`,
              }}
            />
            <TransferConnection quantidade={quantidade} />
            <PharmacyCard
              papel="fornecedora"
              versao={versao}
              farmacia={forn}
              remedio={remedio}
              escala={escala}
              status={atual.statusFornecedora}
              resolvido="Enviado"
            >
              <div className="rms-preparo" data-story="preparo">
                <span>{quantidade} un. separadas · em preparo</span>
                <span className="rms-preparo-trilho"><i data-story="preparo-barra" /></span>
              </div>
            </PharmacyCard>

            <p className="rms-resultado" data-story="resultado">
              <b aria-hidden="true">✓</b> Chamado resolvido · {quantidade} un. de {remedio}
            </p>
          </div>

          <StoryProgress etapa={etapaVista} />
        </div>
      </div>
    </section>
  );
}
