import { useEffect, useId, useRef, useState } from "react";
import { numero, rotuloCompleto, rotuloEixo } from "../../services/perfil";

const ALTURA = 210;
const TOPO = 18;
const BASE = 26;
const LARGURA_MIN_BARRA = 14;

// Gráfico de barras em SVG a partir de serie [{ periodo, total, unidades? }].
// Com `unidades`, oferece alternar Atendimentos / Unidades.
export default function GraficoBarras({ titulo, serie = [], agrupamento = "dia", rotuloTotal = "Atendimentos", rotuloUnidades = "Unidades" }) {
  const uid = useId();
  const caixa = useRef(null);
  const disponivel = useLarguraDisponivel(caixa);
  const temUnidades = serie.some((p) => p.unidades !== undefined);
  const [campo, setCampo] = useState("total");
  const [ativo, setAtivo] = useState(null);
  const chave = temUnidades ? campo : "total";
  const rotuloValor = chave === "unidades" ? rotuloUnidades : rotuloTotal;

  const valores = serie.map((p) => Number(p[chave] ?? 0));
  const maximo = Math.max(...valores, 0);
  const vazio = maximo === 0;
  const n = Math.max(serie.length, 1);
  // desenha na largura do cartão (1:1, texto sem distorcer); período longo:
  // largura mínima por barra e rolagem horizontal
  const largura = Math.max(disponivel || 560, n * LARGURA_MIN_BARRA);
  const passo = largura / n;
  const barra = Math.max(3, Math.min(28, passo * 0.62));
  const alturaUtil = ALTURA - TOPO - BASE;
  // quantos rótulos cabem no eixo X sem sobrepor
  const cadaQuantos = Math.max(1, Math.ceil(n / Math.floor(largura / 46)));
  const total = valores.reduce((s, v) => s + v, 0);
  const resumo = vazio
    ? `${titulo}: sem movimento no período.`
    : `${titulo}: ${numero(total)} ${rotuloValor.toLowerCase()} no período, máximo de ${numero(maximo)} em ${rotuloCompleto(serie[valores.indexOf(maximo)]?.periodo, agrupamento)}.`;

  return (
    <figure className="perfil-grafico">
      <figcaption className="perfil-grafico-topo">
        <span id={`${uid}-titulo`}>{titulo}</span>
        {temUnidades && (
          <span className="perfil-chips perfil-chips-pequeno" role="group" aria-label="Medida do gráfico">
            <button type="button" aria-pressed={chave === "total"} onClick={() => setCampo("total")}>{rotuloTotal}</button>
            <button type="button" aria-pressed={chave === "unidades"} onClick={() => setCampo("unidades")}>{rotuloUnidades}</button>
          </span>
        )}
      </figcaption>
      <div className="perfil-grafico-rolagem" ref={caixa}>
        <svg
          role="img"
          aria-label={resumo}
          viewBox={`0 0 ${largura} ${ALTURA}`}
          width={largura}
          height={ALTURA}
          onMouseLeave={() => setAtivo(null)}
        >
          <line x1="0" x2={largura} y1={ALTURA - BASE} y2={ALTURA - BASE} className="perfil-grafico-eixo" />
          {serie.map((p, i) => {
            const v = valores[i];
            const h = vazio ? 0 : Math.max(v > 0 ? 2 : 0, (v / maximo) * alturaUtil);
            const x = i * passo + (passo - barra) / 2;
            const y = ALTURA - BASE - h;
            return (
              <g key={p.periodo} onMouseEnter={() => setAtivo(i)}>
                {/* área maior que a barra para facilitar o hover */}
                <rect x={i * passo} y={TOPO} width={passo} height={alturaUtil} fill="transparent" />
                <rect x={x} y={y} width={barra} height={h} rx="3" className={`perfil-grafico-barra${ativo === i ? " ativa" : ""}`}>
                  <title>{`${rotuloCompleto(p.periodo, agrupamento)}: ${numero(v)} ${rotuloValor.toLowerCase()}`}</title>
                </rect>
                {i % cadaQuantos === 0 && (
                  <text x={i * passo + passo / 2} y={ALTURA - 8} textAnchor="middle" className="perfil-grafico-rotulo">
                    {rotuloEixo(p.periodo, agrupamento)}
                  </text>
                )}
                {ativo === i && (
                  <text x={i * passo + passo / 2} y={Math.max(12, y - 5)} textAnchor="middle" className="perfil-grafico-valor">
                    {numero(v)}
                  </text>
                )}
              </g>
            );
          })}
          {vazio && (
            <text x={largura / 2} y={(ALTURA - BASE) / 2 + 6} textAnchor="middle" className="perfil-grafico-vazio">
              Sem movimento
            </text>
          )}
        </svg>
      </div>
      {ativo !== null && serie[ativo] && (
        <p className="perfil-grafico-tooltip" aria-hidden="true">
          {rotuloCompleto(serie[ativo].periodo, agrupamento)}: <strong>{numero(valores[ativo])}</strong> {rotuloValor.toLowerCase()}
        </p>
      )}
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead><tr><th scope="col">Período</th><th scope="col">{rotuloValor}</th></tr></thead>
        <tbody>
          {serie.map((p, i) => (
            <tr key={p.periodo}><td>{rotuloCompleto(p.periodo, agrupamento)}</td><td>{numero(valores[i])}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// Largura interna do contêiner, atualizada quando ele muda de tamanho
function useLarguraDisponivel(ref) {
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(Math.floor(entrada.contentRect.width));
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
  return largura;
}
