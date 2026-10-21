import { useCallback, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErroComRetry } from "../../components/Chamados";
import ManagerIcon from "../../components/ManagerIcon";
import { SkeletonLinhas } from "../../components/Skeleton";
import AlertaCard from "../../components/desempenho/AlertaCard";
import Ajuda from "../../components/desempenho/Ajuda";
import { CORES, EIXO, TOOLTIP } from "../../components/desempenho/constantes";
import { usePolling } from "../../hooks/useChamados";
import {
  buscarAlertas, buscarSaude, duracao, horario, numero, porcentagem, resolverAlerta, rotuloTempo, silenciarAlerta,
} from "../../services/desempenho";

// Sub-aba "Saúde do sistema": status em uma frase, alertas (com o que fazer),
// tempo de resposta, rotas com mais erros, últimos erros e histórico.
export default function DesempenhoSaude() {
  const { filtros, alertas } = useOutletContext();
  const { hash } = useLocation();
  const fetcher = useCallback((options) => buscarSaude(filtros.consulta, options), [filtros.consulta]);
  const saude = usePolling(fetcher, { interval: 30000 });
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const buscarHistorico = useCallback((options) => buscarAlertas("resolvido", options), []);
  const historico = usePolling(buscarHistorico, { enabled: historicoAberto, interval: 0 });
  const dados = saude.data;

  async function depoisDeAgir(acao, alerta) {
    await acao(alerta.id);
    alertas.recarregar();
    saude.reload();
    if (historicoAberto) historico.reload();
  }

  if (saude.error && !dados) return <section className="mgr-panel"><ErroComRetry message={saude.error} onRetry={saude.retry} /></section>;

  const tempo = (dados?.tempoResposta ?? []).map((p) => ({ ...p, rotulo: rotuloTempo(p.inicio, dados.passo, p.parcial) }));
  const semTempo = tempo.every((p) => p.mediaMs === null);
  const rotasComErro = (dados?.rotasComErro ?? []).map((r) => ({ ...r, nome: `${r.metodo} ${r.rota}` }));
  const alertaAberto = hash.startsWith("#alerta-") ? hash.slice("#alerta-".length) : null;

  return (
    <div className={saude.loading && dados ? "is-atualizando" : undefined}>
      {saude.loading && !dados ? (
        <SkeletonLinhas rotulo="Verificando o sistema…" />
      ) : (
        <div className={`adm-dsp-status ${dados.status.ok ? "is-ok" : "is-problema"}`} role="status">
          <span aria-hidden="true"><ManagerIcon name={dados.status.ok ? "check" : "alert"} size={24} /></span>
          <div>
            <strong>{dados.status.frase}</strong>
            <p>
              {dados.totais
                ? `${numero(dados.totais.requisicoes)} requisições no período · ${porcentagem(dados.totais.taxaErro)} com erro · resposta média de ${duracao(dados.totais.tempoMedioMs)}`
                : dados.banco?.mensagem}
              {dados.banco && (dados.banco.ok ? " · banco de dados respondendo" : " · banco de dados sem responder")}
            </p>
          </div>
        </div>
      )}

      {filtros.farmacia !== "todas" && (
        <p className="adm-dsp-nota">A saúde do sistema é da rede toda: o filtro de farmácia não muda esta sub-aba.</p>
      )}

      <section className="mgr-panel" aria-labelledby="dsp-alertas-ativos">
        <div className="mgr-panel-head">
          <div>
            <h2 id="dsp-alertas-ativos">Alertas ativos</h2>
            <p>Verificados a cada 1 minuto. Cada alerta diz o que está acontecendo e como resolver.</p>
          </div>
        </div>
        {alertas.carregando && !alertas.alertas.length ? (
          <SkeletonLinhas rotulo="Carregando alertas…" />
        ) : alertas.erro ? (
          <ErroComRetry message={alertas.erro} onRetry={alertas.recarregar} />
        ) : alertas.alertas.length ? (
          <div className="adm-dsp-alertas">
            {alertas.alertas.map((a) => (
              <AlertaCard
                key={a.id}
                alerta={a}
                abertoInicial={String(a.id) === alertaAberto || alertas.alertas.length === 1}
                onResolver={(alerta) => depoisDeAgir(resolverAlerta, alerta)}
                onSilenciar={(alerta) => depoisDeAgir(silenciarAlerta, alerta)}
              />
            ))}
          </div>
        ) : (
          <p className="mgr-empty adm-dsp-tudo-ok">Nenhum alerta ativo. Tudo funcionando.</p>
        )}
      </section>

      <div className="adm-dsp-colunas">
        <section className="mgr-panel" aria-labelledby="dsp-graf-tempo">
          <div className="mgr-panel-head">
            <div>
              <h2 id="dsp-graf-tempo">
                Tempo de resposta
                <Ajuda texto="Quanto o servidor demora para responder. A linha preta é a média; a vermelha são as respostas mais lentas (as 5% piores). Acima de 1 s a pessoa sente a demora." />
              </h2>
              <p>Média e respostas mais lentas</p>
            </div>
          </div>
          {saude.loading && !dados ? (
            <SkeletonLinhas rotulo="Carregando o gráfico…" />
          ) : semTempo ? (
            <p className="mgr-empty">Ainda não há requisições neste período.</p>
          ) : (
            <div className="adm-dsp-grafico">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={tempo} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke={CORES.grade} vertical={false} />
                  <XAxis dataKey="rotulo" {...EIXO} minTickGap={24} />
                  <YAxis {...EIXO} width={56} tickFormatter={(v) => duracao(v)} />
                  <Tooltip {...TOOLTIP} formatter={(valor, nome) => [duracao(valor), nome]} />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
                  <ReferenceLine y={1000} stroke={CORES.atencao} strokeDasharray="4 4" label={{ value: "1 s", position: "insideTopRight", fill: CORES.atencao, fontSize: 12 }} />
                  <Line type="monotone" dataKey="mediaMs" name="Média" stroke={CORES.destaque} strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="p95Ms" name="Mais lentas (5%)" stroke={CORES.erro} strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="mgr-panel" aria-labelledby="dsp-graf-erros">
          <div className="mgr-panel-head">
            <div>
              <h2 id="dsp-graf-erros">
                Rotas com mais erros
                <Ajuda texto="As partes do sistema que mais falharam no período (erro do servidor). Comece a investigar pela primeira." />
              </h2>
              <p>Requisições com erro por rota</p>
            </div>
          </div>
          {saude.loading && !dados ? (
            <SkeletonLinhas rotulo="Carregando o gráfico…" />
          ) : !rotasComErro.length ? (
            <p className="mgr-empty adm-dsp-tudo-ok">Nenhuma rota com erro no período.</p>
          ) : (
            <div className="adm-dsp-grafico">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rotasComErro} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={CORES.grade} horizontal={false} />
                  <XAxis type="number" {...EIXO} allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" {...EIXO} width={190} />
                  <Tooltip {...TOOLTIP} formatter={(valor, _n, item) => [`${numero(valor)} erros (${porcentagem(item.payload.taxa)} das requisições)`, "Erros"]} />
                  <Bar dataKey="erros" name="Erros" fill={CORES.erro} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="mgr-panel" aria-labelledby="dsp-ultimos-erros">
        <div className="mgr-panel-head">
          <div>
            <h2 id="dsp-ultimos-erros">Últimos erros</h2>
            <p>A mensagem que o servidor registrou, para quem for corrigir.</p>
          </div>
        </div>
        {saude.loading && !dados ? (
          <SkeletonLinhas rotulo="Carregando erros…" />
        ) : dados.ultimosErros.length ? (
          <ul className="adm-dsp-erros">
            {dados.ultimosErros.map((e) => (
              <li key={e.id}>
                <code>{e.metodo} {e.rota}</code>
                <span>{e.mensagem}</span>
                <time dateTime={new Date(e.criadoEm).toISOString()}>{horario(e.criadoEm)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mgr-empty adm-dsp-tudo-ok">Nenhum erro registrado no período.</p>
        )}
      </section>

      <details className="mgr-panel adm-dsp-historico" onToggle={(e) => setHistoricoAberto(e.currentTarget.open)}>
        <summary data-track="saude-historico">Histórico de alertas resolvidos</summary>
        {historico.loading && !historico.data ? (
          <SkeletonLinhas rotulo="Carregando histórico…" />
        ) : historico.error ? (
          <ErroComRetry message={historico.error} onRetry={historico.retry} />
        ) : historico.data?.alertas.length ? (
          <div className="adm-dsp-alertas">
            {historico.data.alertas.map((a) => <AlertaCard key={a.id} alerta={a} />)}
          </div>
        ) : (
          <p className="mgr-empty">Nenhum alerta resolvido ainda.</p>
        )}
      </details>
    </div>
  );
}
