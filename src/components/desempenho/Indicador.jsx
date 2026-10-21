import { Link } from "react-router-dom";
import ManagerIcon from "../ManagerIcon";
import { SkeletonValor } from "../Skeleton";
import Ajuda from "./Ajuda";

// Card de indicador da aba Desempenho: número grande, comparação com o
// período anterior e "?" com a explicação. O card inteiro leva ao detalhe.
// melhor: "maior" (ex.: usuários) ou "menor" (ex.: taxa de erro) — define se
// a variação aparece verde (bom) ou vermelha (problema).
export default function Indicador({ titulo, valor, variacao, comparacao, ajuda, icone, to, melhor = "maior", carregando }) {
  const subiu = variacao > 0;
  const bom = variacao === 0 || variacao === null || variacao === undefined ? null : (melhor === "maior") === subiu;
  const conteudo = (
    <>
      <span className="directory-stat-icon">
        <ManagerIcon name={icone} size={18} />
      </span>
      <div>
        <p className="adm-dsp-indicador-titulo">
          {titulo}
          {ajuda && <Ajuda texto={ajuda} rotulo={`O que é ${titulo.toLowerCase()}?`} />}
        </p>
        <strong>{carregando ? <SkeletonValor /> : valor}</strong>
        {!carregando && (
          <small className={`adm-dsp-variacao${bom === null ? "" : bom ? " is-bom" : " is-ruim"}`}>
            {variacao === null || variacao === undefined
              ? `sem dados para comparar ${comparacao ?? ""}`.trim()
              : `${subiu ? "+" : ""}${variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ${comparacao ?? ""}`.trim()}
          </small>
        )}
      </div>
    </>
  );
  return to ? (
    <Link className="directory-stat is-link adm-dsp-indicador" to={to} aria-busy={carregando || undefined}>
      {conteudo}
    </Link>
  ) : (
    <article className="directory-stat adm-dsp-indicador" aria-busy={carregando || undefined}>{conteudo}</article>
  );
}
