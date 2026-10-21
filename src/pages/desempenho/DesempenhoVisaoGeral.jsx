import { useCallback } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErroComRetry } from "../../components/Chamados";
import { SkeletonLinhas } from "../../components/Skeleton";
import AlertaCard from "../../components/desempenho/AlertaCard";
import Ajuda from "../../components/desempenho/Ajuda";
import Indicador from "../../components/desempenho/Indicador";
import { CORES, EIXO, TOOLTIP } from "../../components/desempenho/constantes";
import { usePolling } from "../../hooks/useChamados";
import { buscarResumo, duracao, nomeDaTela, numero, porcentagem, PLATAFORMAS, rotuloTempo } from "../../services/desempenho";

// Sub-aba "Visão geral": 4 indicadores (com o período anterior), requisições
// e erros no tempo, as 5 telas mais acessadas e até 3 alertas ativos.
// Todo número leva à sub-aba com o detalhe já filtrado.
export default function DesempenhoVisaoGeral() {
  const { filtros } = useOutletContext();
  const navigate = useNavigate();
  const fetcher = useCallback((options) => buscarResumo(filtros.consulta, options), [filtros.consulta]);
  const resumo = usePolling(fetcher, { interval: 60000 });
  const dados = resumo.data;
  const carregando = resumo.loading && !dados;
  const ind = dados?.indicadores;

  if (resumo.error && !dados) return <section className="mgr-panel"><ErroComRetry message={resumo.error} onRetry={resumo.retry} /></section>;

  const serie = (dados?.serie ?? []).map((p) => ({ ...p, rotulo: rotuloTempo(p.inicio, dados.passo, p.parcial) }));
  const semRequisicoes = serie.every((p) => !p.requisicoes);
  const top = (dados?.maisAcessadas ?? []).map((r) => ({ ...r, nome: nomeDaTela(r.rota, r.plataforma), uso: r.visitas || r.cliques }));

  return (
    <div className={resumo.loading && dados ? "is-atualizando" : undefined}>
      <div className="directory-stats adm-dsp-indicadores">
        <Indicador
          titulo="Usuários ativos" icone="people" carregando={carregando}
          valor={numero(ind?.usuariosAtivos.valor)} variacao={ind?.usuariosAtivos.variacao} comparacao={dados?.comparacao}
          ajuda="Quantas pessoas diferentes usaram o app ou o painel no período (contamos quem clicou ou abriu alguma tela)."
          to={filtros.linkPara("/rotas")}
        />
        <Indicador
          titulo="Cliques" icone="check" carregando={carregando}
          valor={numero(ind?.cliques.valor)} variacao={ind?.cliques.variacao} comparacao={dados?.comparacao}
          ajuda="Todos os cliques e toques registrados nas telas. Veja onde as pessoas clicam no Mapa de calor."
          to={filtros.linkPara("/mapa-de-calor")}
        />
        <Indicador
          titulo="Taxa de erro" icone="alert" melhor="menor" carregando={carregando}
          valor={porcentagem(ind?.taxaErro.valor)} variacao={ind?.taxaErro.variacao} comparacao={dados?.comparacao}
          ajuda="De cada 100 pedidos que o app e o painel fizeram ao servidor, quantos falharam por erro do servidor. Bom é abaixo de 1%."
          to={filtros.linkPara("/saude")}
        />
        <Indicador
          titulo="Tempo de resposta" icone="clock" melhor="menor" carregando={carregando}
          valor={duracao(ind?.tempoMedioMs.valor)} variacao={ind?.tempoMedioMs.variacao} comparacao={dados?.comparacao}
          ajuda="Quanto tempo, em média, o servidor leva para responder. Abaixo de 0,3 s a pessoa nem percebe a espera."
          to={filtros.linkPara("/saude")}
        />
      </div>

      <div className="adm-dsp-colunas">
        <section className="mgr-panel" aria-labelledby="dsp-graf-requisicoes">
          <div className="mgr-panel-head">
            <div>
              <h2 id="dsp-graf-requisicoes">
                Requisições e erros <Ajuda texto="Cada vez que o app ou o painel pede algo ao servidor é uma requisição. A linha vermelha são as que falharam." />
              </h2>
              <p>{numero(dados?.requisicoes.total)} requisições · {numero(dados?.requisicoes.erros)} com erro</p>
            </div>
            <Link to={filtros.linkPara("/saude")}>Ver saúde →</Link>
          </div>
          {carregando ? (
            <SkeletonLinhas rotulo="Carregando o gráfico…" />
          ) : semRequisicoes ? (
            <p className="mgr-empty">Ainda não há requisições neste período.</p>
          ) : (
            <div className="adm-dsp-grafico">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={serie} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} onClick={() => navigate(filtros.linkPara("/saude"))}>
                  <CartesianGrid stroke={CORES.grade} vertical={false} />
                  <XAxis dataKey="rotulo" {...EIXO} minTickGap={24} />
                  <YAxis {...EIXO} allowDecimals={false} width={48} />
                  <Tooltip {...TOOLTIP} />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
                  <Line type="monotone" dataKey="requisicoes" name="Requisições" stroke={CORES.volume} strokeWidth={2} dot={false} activeDot={{ r: 5, cursor: "pointer" }} />
                  <Line type="monotone" dataKey="erros" name="Com erro" stroke={CORES.erro} strokeWidth={2} dot={false} activeDot={{ r: 5, cursor: "pointer" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="mgr-panel" aria-labelledby="dsp-graf-telas">
          <div className="mgr-panel-head">
            <div>
              <h2 id="dsp-graf-telas">
                Telas mais acessadas <Ajuda texto="As 5 telas que mais foram abertas no período. Clique numa barra para ver o mapa de calor dela." />
              </h2>
              <p>Visitas no período</p>
            </div>
            <Link to={filtros.linkPara("/rotas")}>Ver todas →</Link>
          </div>
          {carregando ? (
            <SkeletonLinhas rotulo="Carregando o gráfico…" />
          ) : !top.length ? (
            <p className="mgr-empty">Ainda não há visitas às telas neste período.</p>
          ) : (
            <div className="adm-dsp-grafico">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={CORES.grade} horizontal={false} />
                  <XAxis type="number" {...EIXO} allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" {...EIXO} width={170} />
                  <Tooltip {...TOOLTIP} formatter={(valor, _n, item) => [`${numero(valor)} visitas`, PLATAFORMAS[item.payload.plataforma]]} />
                  <Bar
                    dataKey="uso" name="Visitas" fill={CORES.volume} radius={[0, 6, 6, 0]} cursor="pointer"
                    onClick={(item) => navigate(filtros.linkPara("/mapa-de-calor", { rota: item.rota, tela: item.plataforma }))}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="mgr-panel" aria-labelledby="dsp-alertas">
        <div className="mgr-panel-head">
          <div>
            <h2 id="dsp-alertas">Alertas ativos</h2>
            <p>{dados ? (dados.totalAlertas ? `${dados.totalAlertas} ${dados.totalAlertas === 1 ? "alerta precisa" : "alertas precisam"} de atenção` : "Nenhum problema agora") : "Carregando…"}</p>
          </div>
          <Link to={filtros.linkPara("/saude")}>Ver todos →</Link>
        </div>
        {carregando ? (
          <SkeletonLinhas rotulo="Carregando alertas…" />
        ) : dados.alertas.length ? (
          <div className="adm-dsp-alertas">
            {dados.alertas.map((a) => (
              <AlertaCard key={a.id} alerta={a} resumido verDetalhesHref={`${filtros.linkPara("/saude")}#alerta-${a.id}`} />
            ))}
          </div>
        ) : (
          <p className="mgr-empty adm-dsp-tudo-ok">Tudo funcionando. Nenhum alerta ativo.</p>
        )}
      </section>
    </div>
  );
}
