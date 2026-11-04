import { NOMES_ETAPAS } from "./storyData";

// Indicador de progresso: etapas concluídas ganham ✓, a atual ganha anel,
// rótulo em negrito e aria-current. A linha preenche junto com a rolagem
// (data-story="progresso" é animado pela timeline).
export default function StoryProgress({ etapa }) {
  return (
    <div className="rms-progresso">
      <span className="rms-progresso-trilho" aria-hidden="true"><i data-story="progresso" /></span>
      <ol aria-label="Etapas do remanejamento">
        {NOMES_ETAPAS.map((nome, i) => {
          const estado = i < etapa ? "feito" : i === etapa ? "atual" : "futuro";
          return (
            <li key={nome} className={`is-${estado}`} aria-current={estado === "atual" ? "step" : undefined}>
              <span className="rms-marca" aria-hidden="true">{estado === "feito" ? "✓" : ""}</span>
              <span className="rms-progresso-nome">{nome}</span>
              <span className="lpx-sr">{estado === "feito" ? " (concluída)" : estado === "atual" ? " (etapa atual)" : ""}</span>
            </li>
          );
        })}
      </ol>
      <p className="rms-progresso-atual" aria-hidden="true">Agora: <strong>{NOMES_ETAPAS[etapa]}</strong></p>
    </div>
  );
}
