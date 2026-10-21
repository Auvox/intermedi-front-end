import { useCallback, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ErroComRetry } from "../../components/Chamados";
import { SkeletonTabela } from "../../components/Skeleton";
import Ajuda from "../../components/desempenho/Ajuda";
import { usePolling } from "../../hooks/useChamados";
import { propsLinha } from "../../services/perfil";
import { buscarRotas, duracao, nomeDaTela, numero, porcentagem, PLATAFORMAS } from "../../services/desempenho";

// Sub-aba "Rotas e telas": as 3 telas mais e menos usadas e a tabela completa
// (ordenável por coluna). Clicar numa tela abre o mapa de calor dela.

const COLUNAS = [
  ["rota", "Tela", null],
  ["plataforma", "Plataforma", null],
  ["visitas", "Visitas", "Quantas vezes a tela foi aberta no período."],
  ["cliques", "Cliques", "Quantos cliques ou toques a tela recebeu."],
  ["tempoMedioMs", "Tempo médio", "Quanto tempo as pessoas ficam na tela, em média."],
  ["taxaAbandono", "Abandono", "De cada 100 visitas, em quantas a pessoa fechou o sistema estando nesta tela. Alto pode indicar que a tela trava ou confunde."],
];

function Destaques({ titulo, ajuda, rotas, abrir, tom }) {
  return (
    <section className="mgr-panel adm-dsp-destaque" aria-label={titulo}>
      <h2>{titulo} <Ajuda texto={ajuda} /></h2>
      {rotas.length ? (
        <ol>
          {rotas.map((r) => (
            <li key={`${r.plataforma} ${r.rota}`}>
              <button type="button" onClick={() => abrir(r)} data-track={`rotas-destaque-${tom}`}>
                <span>
                  <strong>{nomeDaTela(r.rota, r.plataforma)}</strong>
                  <small>{PLATAFORMAS[r.plataforma]}</small>
                </span>
                <b className={tom === "menos" ? "is-atencao" : undefined}>{numero(r.visitas)} visitas</b>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mgr-empty">Sem visitas no período.</p>
      )}
    </section>
  );
}

export default function DesempenhoRotas() {
  const { filtros } = useOutletContext();
  const navigate = useNavigate();
  const [ordem, setOrdem] = useState({ coluna: "visitas", direcao: "desc" });
  const fetcher = useCallback((options) => buscarRotas(filtros.consulta, options), [filtros.consulta]);
  const lista = usePolling(fetcher, { interval: 60000 });

  if (lista.error && !lista.data) return <section className="mgr-panel"><ErroComRetry message={lista.error} onRetry={lista.retry} /></section>;

  const rotas = lista.data ?? [];
  const comVisitas = rotas.filter((r) => r.visitas > 0);
  const mais = [...comVisitas].sort((a, b) => b.visitas - a.visitas).slice(0, 3);
  const menos = [...comVisitas].sort((a, b) => a.visitas - b.visitas).filter((r) => !mais.includes(r)).slice(0, 3);
  const ordenadas = [...rotas].sort((a, b) => {
    const va = a[ordem.coluna] ?? -1;
    const vb = b[ordem.coluna] ?? -1;
    const comparacao = typeof va === "string" ? String(va).localeCompare(String(vb), "pt-BR") : va - vb;
    return ordem.direcao === "asc" ? comparacao : -comparacao;
  });
  const abrir = (r) => navigate(filtros.linkPara("/mapa-de-calor", { rota: r.rota, tela: r.plataforma }));
  const ordenar = (coluna) =>
    setOrdem((atual) => ({ coluna, direcao: atual.coluna === coluna && atual.direcao === "desc" ? "asc" : "desc" }));

  return (
    <div className={lista.loading && lista.data ? "is-atualizando" : undefined}>
      {lista.loading && !lista.data ? (
        <SkeletonTabela rotulo="Carregando telas…" foto={false} />
      ) : (
        <>
          <div className="adm-dsp-colunas">
            <Destaques titulo="Mais usadas" ajuda="As 3 telas abertas mais vezes no período." rotas={mais} abrir={abrir} tom="mais" />
            <Destaques titulo="Menos usadas" ajuda="As 3 telas abertas menos vezes. Pode ser uma função difícil de achar ou pouco útil." rotas={menos} abrir={abrir} tom="menos" />
          </div>

          <section className="mgr-panel" aria-labelledby="dsp-tabela-rotas">
            <div className="mgr-panel-head">
              <div>
                <h2 id="dsp-tabela-rotas">Todas as telas</h2>
                <p>Clique numa tela para ver onde as pessoas clicam.</p>
              </div>
            </div>
            {rotas.length ? (
              <div className="mgr-table-wrap">
                <table className="adm-dsp-tabela">
                  <thead>
                    <tr>
                      {COLUNAS.map(([coluna, rotulo, ajuda]) => (
                        <th
                          key={coluna}
                          scope="col"
                          className={["visitas", "cliques", "tempoMedioMs", "taxaAbandono"].includes(coluna) ? "is-num" : undefined}
                          aria-sort={ordem.coluna === coluna ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none"}
                        >
                          <button type="button" onClick={() => ordenar(coluna)} data-track={`rotas-ordenar:${coluna}`}>
                            {rotulo}
                            <span aria-hidden="true">{ordem.coluna === coluna ? (ordem.direcao === "asc" ? " ↑" : " ↓") : ""}</span>
                          </button>
                          {ajuda && <Ajuda texto={ajuda} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ordenadas.map((r) => (
                      <tr key={`${r.plataforma} ${r.rota}`} {...propsLinha(() => abrir(r), `Abrir o mapa de calor de ${nomeDaTela(r.rota, r.plataforma)}`)}>
                        <td>
                          <strong>{nomeDaTela(r.rota, r.plataforma)}</strong>
                          <small>{r.rota}</small>
                        </td>
                        <td>{PLATAFORMAS[r.plataforma]}</td>
                        <td className="is-num">{numero(r.visitas)}</td>
                        <td className="is-num">{numero(r.cliques)}</td>
                        <td className="is-num">{duracao(r.tempoMedioMs)}</td>
                        <td className={`is-num${r.taxaAbandono > 40 ? " adm-dsp-ruim" : ""}`}>{porcentagem(r.taxaAbandono)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mgr-empty">Ainda não há uso registrado neste período.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
