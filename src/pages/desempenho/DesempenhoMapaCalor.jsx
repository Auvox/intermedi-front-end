import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ErroComRetry } from "../../components/Chamados";
import { SkeletonLinhas } from "../../components/Skeleton";
import Ajuda from "../../components/desempenho/Ajuda";
import MapaCalorCanvas, { LegendaCalor } from "../../components/desempenho/MapaCalorCanvas";
import { usePolling } from "../../hooks/useChamados";
import {
  buscarPontos, buscarRotas, duracao, enviarCapturaApp, nomeDaTela, numero, PLATAFORMAS, urlDaCaptura,
} from "../../services/desempenho";

// Sub-aba "Mapa de calor": escolha a tela à esquerda; no meio aparece a própria
// tela com o calor por cima; à direita, 4 dados objetivos da tela.
//   • Web: a rota abre num <iframe> (só para ver) e o calor fica num <canvas>
//     por cima, então a tela está sempre atualizada.
//   • App: não dá para abrir o app num iframe; o fundo é uma captura da tela
//     (enviada pelo app em desenvolvimento ou pelo admin aqui mesmo).

const TELAS = {
  desktop: { rotulo: "Computador", largura: 1440, altura: 900 },
  tablet: { rotulo: "Tablet", largura: 820, altura: 1180 },
  celular: { rotulo: "Celular", largura: 390, altura: 844 },
};

function ListaDeRotas({ titulo, rotas, selecionada, aoEscolher }) {
  if (!rotas.length) return null;
  return (
    <div className="adm-dsp-mapa-grupo">
      <h3>{titulo}</h3>
      <ul>
        {rotas.map((r) => {
          const ativa = selecionada?.rota === r.rota && selecionada?.plataforma === r.plataforma;
          return (
            <li key={`${r.plataforma} ${r.rota}`}>
              <button type="button" aria-pressed={ativa} onClick={() => aoEscolher(r)} data-track="mapa-escolher-rota">
                <span>
                  <strong>{nomeDaTela(r.rota, r.plataforma)}</strong>
                  <small>{r.rota}</small>
                </span>
                <b aria-label={`${numero(r.cliques)} cliques`}>{numero(r.cliques)}</b>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// a tela (iframe ou captura) no tamanho do aparelho, reduzida para caber
function Palco({ rota, plataforma, dispositivo, pontos, mostrarCalor, captura, aoEnviarCaptura }) {
  const ref = useRef(null);
  const [largura, setLargura] = useState(800);
  const [carregou, setCarregou] = useState(false);
  const tela = TELAS[dispositivo];

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const escala = Math.min(1, largura / tela.largura, 640 / tela.altura);
  const caixa = { width: Math.round(tela.largura * escala), height: Math.round(tela.altura * escala) };
  const temParametro = rota.includes(":");
  const abreAqui = plataforma === "web" && !temParametro;

  return (
    <div className="adm-dsp-palco" ref={ref}>
      {/* sem imagem: o aviso fica acima da tela, pra não cobrir o calor */}
      {!abreAqui && !captura && (
        <div className="adm-dsp-sem-captura">
          <p>
            <strong>Sem imagem desta tela ainda.</strong>{" "}
            {plataforma === "app"
              ? "Abra esta tela no app em modo de desenvolvimento para ele enviar a captura sozinho, ou envie uma imagem da tela."
              : "Esta tela depende de um registro específico e não abre aqui. Envie uma captura para ver o calor sobre ela."}
          </p>
          <label className="mgr-secondary">
            Enviar imagem da tela
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files[0] && aoEnviarCaptura(e.target.files[0])} data-track="mapa-enviar-captura" />
          </label>
        </div>
      )}
      <div className={`adm-dsp-tela is-${dispositivo}`} style={caixa}>
        {abreAqui ? (
          <>
            {!carregou && <p className="adm-dsp-tela-carregando" role="status">Abrindo a tela…</p>}
            <iframe
              title={`Tela ${nomeDaTela(rota, plataforma)} (somente leitura)`}
              src={rota}
              sandbox="allow-same-origin allow-scripts"
              tabIndex={-1}
              onLoad={() => setCarregou(true)}
              style={{ width: tela.largura, height: tela.altura, transform: `scale(${escala})` }}
            />
          </>
        ) : captura ? (
          <img src={urlDaCaptura(captura.url)} alt={`Captura da tela ${nomeDaTela(rota, plataforma)}`} />
        ) : null}
        <MapaCalorCanvas
          pontos={pontos}
          visivel={mostrarCalor}
          rotulo={`Mapa de calor de ${nomeDaTela(rota, plataforma)}: ${pontos.length ? "áreas vermelhas têm mais cliques" : "sem cliques"}`}
        />
      </div>
    </div>
  );
}

// A tela escolhida: o calor no meio e os 4 dados à direita.
// Recebe só textos (rota, plataforma, aparelho), então a busca fica estável.
function TelaComCalor({ rota, plataforma, dispositivo, consulta, definir }) {
  const [mostrarCalor, setMostrarCalor] = useState(true);
  const [erroEnvio, setErroEnvio] = useState("");
  // a plataforma da tela escolhida vale mais que o filtro global
  const buscarMapa = useCallback(
    (options) => buscarPontos({ ...consulta, plataforma }, { rota, dispositivo }, options),
    [consulta, rota, plataforma, dispositivo],
  );
  const mapa = usePolling(buscarMapa, { interval: 60000 });
  const dados = mapa.data;
  const semRespostaPct = dados?.cliques ? Math.round((dados.semResposta / dados.cliques) * 100) : null;
  const appSemInformacao = dados && dados.cliques > 0 && dados.semInformacao === dados.cliques;

  async function enviarCaptura(arquivo) {
    setErroEnvio("");
    try {
      await enviarCapturaApp(rota, arquivo);
      mapa.reload();
    } catch (error) {
      setErroEnvio(error.message);
    }
  }

  return (
    <>
      <section className="mgr-panel adm-dsp-mapa-centro" aria-labelledby="dsp-mapa-titulo">
        <div className="adm-dsp-mapa-barra">
          <div>
            <h2 id="dsp-mapa-titulo">{nomeDaTela(rota, plataforma)}</h2>
            <p>{PLATAFORMAS[plataforma]} · {rota}</p>
          </div>
          <div className="adm-dsp-segmentos" role="group" aria-label="Aparelho">
            {Object.entries(TELAS).map(([chave, { rotulo }]) => (
              <button key={chave} type="button" aria-pressed={dispositivo === chave} onClick={() => definir({ dispositivo: chave })} data-track={`mapa-dispositivo:${chave}`}>
                {rotulo}
                {dados?.porDispositivo?.[chave] ? <small>{numero(dados.porDispositivo[chave])}</small> : null}
              </button>
            ))}
          </div>
          <button type="button" className="mgr-secondary" aria-pressed={!mostrarCalor} onClick={() => setMostrarCalor((v) => !v)} data-track="mapa-alternar-calor">
            {mostrarCalor ? "Ver tela limpa" : "Mostrar calor"}
          </button>
        </div>

        {mapa.error && !dados ? (
          <ErroComRetry message={mapa.error} onRetry={mapa.retry} />
        ) : (
          <>
            <Palco
              key={`${plataforma} ${rota} ${dispositivo}`}
              rota={rota}
              plataforma={plataforma}
              dispositivo={dispositivo}
              pontos={dados?.pontos ?? []}
              mostrarCalor={mostrarCalor}
              captura={dados?.captura}
              aoEnviarCaptura={enviarCaptura}
            />
            {erroEnvio && <p className="chamado-inline-error" role="alert">{erroEnvio}</p>}
            <div className="adm-dsp-mapa-rodape">
              <LegendaCalor />
              {dados && !dados.cliques && (
                <p className="mgr-empty">Ainda não há cliques nesta tela no período ({TELAS[dispositivo].rotulo.toLowerCase()}).</p>
              )}
            </div>
          </>
        )}
      </section>

      <aside className="adm-dsp-mapa-dados" aria-label="Dados da tela">
        <div className="directory-stat">
          <p className="adm-dsp-indicador-titulo">Cliques na tela <Ajuda texto="Quantos cliques (ou toques, no app) esta tela recebeu no período e no aparelho escolhido." /></p>
          <strong>{dados ? numero(dados.cliques) : "…"}</strong>
          <small>{dados ? `${numero(dados.visitas)} visitas` : ""}</small>
        </div>
        <div className="directory-stat">
          <p className="adm-dsp-indicador-titulo">Mais clicado <Ajuda texto="O botão ou link que mais recebeu cliques. O nome vem do identificador do elemento (data-track)." /></p>
          <strong className="adm-dsp-elemento">{dados ? dados.elementoMaisClicado?.elemento ?? "—" : "…"}</strong>
          <small>{dados?.elementoMaisClicado ? `${numero(dados.elementoMaisClicado.cliques)} cliques` : "sem identificador"}</small>
        </div>
        <div className="directory-stat">
          <p className="adm-dsp-indicador-titulo">Tempo médio na tela <Ajuda texto="Quanto tempo, em média, as pessoas ficam nesta tela antes de ir para outra ou fechar o sistema." /></p>
          <strong>{dados ? duracao(dados.tempoMedioMs) : "…"}</strong>
        </div>
        <div className={`directory-stat${semRespostaPct > 10 ? " adm-dsp-atencao" : ""}`}>
          <p className="adm-dsp-indicador-titulo">
            Cliques sem resposta
            <Ajuda texto="Cliques em algo que não é botão nem link. Muitos cliques assim mostram que a pessoa achou que aquilo era clicável: vale transformar em botão ou mudar o visual." />
          </p>
          <strong>{dados ? (appSemInformacao ? "—" : numero(dados.semResposta)) : "…"}</strong>
          <small>{appSemInformacao ? "o app não informa se o toque foi num botão" : semRespostaPct !== null ? `${semRespostaPct}% dos cliques` : ""}</small>
        </div>
      </aside>
    </>
  );
}

export default function DesempenhoMapaCalor() {
  const { filtros } = useOutletContext();
  const { params, definir } = filtros;
  const buscarLista = useCallback((options) => buscarRotas(filtros.consulta, options), [filtros.consulta]);
  const lista = usePolling(buscarLista, { interval: 60000 });

  if (lista.error && !lista.data) return <section className="mgr-panel"><ErroComRetry message={lista.error} onRetry={lista.retry} /></section>;

  const rotas = (lista.data ?? []).filter((r) => r.cliques > 0 || r.visitas > 0);
  // tela escolhida (?rota=&tela=) ou a mais clicada
  const primeira = [...rotas].sort((a, b) => b.cliques - a.cliques)[0];
  const escolhida = params.get("rota")
    ? { rota: params.get("rota"), plataforma: params.get("tela") || "web" }
    : primeira ? { rota: primeira.rota, plataforma: primeira.plataforma } : null;
  const dispositivo = TELAS[params.get("dispositivo")] ? params.get("dispositivo") : escolhida?.plataforma === "app" ? "celular" : "desktop";
  const doApp = rotas.filter((r) => r.plataforma === "app").sort((a, b) => b.cliques - a.cliques);
  const doWeb = rotas.filter((r) => r.plataforma === "web").sort((a, b) => b.cliques - a.cliques);
  const escolher = (r) => definir({ rota: r.rota, tela: r.plataforma, dispositivo: null });

  return (
    <div className="adm-dsp-mapa">
      <nav className="mgr-panel adm-dsp-mapa-rotas" aria-label="Telas">
        {lista.loading && !lista.data ? (
          <SkeletonLinhas rotulo="Carregando telas…" />
        ) : !rotas.length ? (
          <p className="mgr-empty">Ainda não há cliques no período.</p>
        ) : (
          <>
            <ListaDeRotas titulo={PLATAFORMAS.app} rotas={doApp} selecionada={escolhida} aoEscolher={escolher} />
            <ListaDeRotas titulo={PLATAFORMAS.web} rotas={doWeb} selecionada={escolhida} aoEscolher={escolher} />
          </>
        )}
      </nav>
      {escolhida && (
        <TelaComCalor
          rota={escolhida.rota}
          plataforma={escolhida.plataforma}
          dispositivo={dispositivo}
          consulta={filtros.consulta}
          definir={definir}
        />
      )}
    </div>
  );
}
