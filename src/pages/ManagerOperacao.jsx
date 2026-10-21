import { Component, Suspense, lazy, useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { usePerfil } from "../components/perfil/perfilContext";
import { ErroComRetry } from "../components/Chamados";
import useOperacao from "../hooks/useOperacao";
import KpiStrip from "../components/operacao/KpiStrip";
import Inspector from "../components/operacao/Inspector";
import FlowStrip from "../components/operacao/FlowStrip";
import Fallback2D from "../components/operacao/Fallback2D";
import { VISTAS } from "../components/operacao3d/layout";
import { COR_SITUACAO, COR_STATUS } from "../components/operacao3d/cores";
import "../styles/operacao.css";

// three.js só é baixado por quem abre a cena (desktop com WebGL)
const IntermediScene = lazy(() => import("../components/operacao3d/IntermediScene"));

function suportaWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function useMediaQuery(query) {
  const assinar = useCallback((avisar) => {
    const lista = window.matchMedia(query);
    lista.addEventListener("change", avisar);
    return () => lista.removeEventListener("change", avisar);
  }, [query]);
  return useSyncExternalStore(assinar, () => window.matchMedia(query).matches);
}

// "Reduzir movimento": preferência do sistema ou do menu de acessibilidade
const MOVIMENTO = "(prefers-reduced-motion: reduce)";
function lerMovimentoReduzido() {
  return window.matchMedia(MOVIMENTO).matches || Boolean(document.querySelector(".persona-accessibility.a11y-motion"));
}
function assinarMovimento(avisar) {
  const lista = window.matchMedia(MOVIMENTO);
  lista.addEventListener("change", avisar);
  const raiz = document.querySelector(".persona-accessibility");
  const observador = new MutationObserver(avisar);
  if (raiz) observador.observe(raiz, { attributes: true, attributeFilter: ["class"] });
  return () => {
    lista.removeEventListener("change", avisar);
    observador.disconnect();
  };
}

// Se a cena falhar (chunk não carregou, WebGL recusado), a página continua com a planta 2D
class LimiteDaCena extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }
  static getDerivedStateFromError(erro) {
    return { erro };
  }
  componentDidCatch(erro) {
    this.props.onErro(erro);
  }
  render() {
    return this.state.erro ? null : this.props.children;
  }
}

// O relatório do chamado abre no topo; "Validar" leva direto à seção da decisão
function rolarParaDecisao() {
  let tentativas = 0;
  const procurar = () => {
    const secao = document.querySelector('.perfil-pagina [data-secao="decisao"]');
    if (secao) {
      window.scrollTo({ top: secao.getBoundingClientRect().top + window.scrollY - 140 });
      secao.querySelector("h2")?.focus({ preventScroll: true });
      return;
    }
    if (++tentativas < 40) setTimeout(procurar, 100);
  };
  setTimeout(procurar, 150);
}

const LEGENDA_ESTOQUE = [
  ["ok", "Em estoque"],
  ["vencendo", "Vence em até 90 dias"],
  ["critico", "Crítico"],
  ["vencido", "Zerado ou vencido"],
];
const LEGENDA_EQUIPE = [
  ["atendimento", "Ocupado"],
  ["disponivel", "Disponível"],
  ["pausa", "Em pausa"],
  ["fora", "Fora do turno"],
];

export default function ManagerOperacao() {
  const { gerente, pendentes, pedidosRastreio, user } = useOutletContext();
  const { abrirPerfil } = usePerfil();
  const { operacao, loading, error, avisoResumo, retry } = useOperacao({ gerente, pendentes, pedidosRastreio });

  const [selecionado, setSelecionado] = useState(null);
  const [aba, setAba] = useState("alertas");
  const [foco, setFoco] = useState(null);
  const [preferencia2d, setPreferencia2d] = useState(false);
  const [falha3d, setFalha3d] = useState("");
  const [tentativa3d, setTentativa3d] = useState(0);
  const [webgl] = useState(suportaWebGL);
  const desktop = useMediaQuery("(min-width: 768px)");
  const reduzirMovimento = useSyncExternalStore(assinarMovimento, lerMovimentoReduzido);
  const inspetorRef = useRef(null);

  const usar3d = desktop && webgl && !falha3d && !preferencia2d;
  const motivo2d = !desktop
    ? "Em telas pequenas a operação aparece como planta 2D. Abra em um computador para a visão 3D."
    : !webgl
      ? "Este navegador não oferece WebGL, então a operação aparece como planta 2D."
      : falha3d || "";

  // Seleção pela lista/indicadores: também leva a câmera até o objeto
  function selecionarDaLista(chave) {
    setSelecionado(chave);
    if (chave) setFoco({ tipo: "objeto", chave });
    if (!desktop) inspetorRef.current?.scrollIntoView({ block: "start", behavior: reduzirMovimento ? "auto" : "smooth" });
  }
  // Seleção na cena: a câmera fica onde a pessoa deixou
  function selecionarNaCena(chave) {
    setSelecionado(chave);
  }
  function abrirIndicador(id) {
    if (id === "estoque") {
      setAba("estoque");
      setSelecionado(null);
      setFoco({ tipo: "vista", vista: "estoque" });
    } else if (id === "equipe") {
      setAba("equipe");
      setSelecionado(null);
      setFoco({ tipo: "vista", vista: "atendimento" });
    } else if (id === "chamados") {
      selecionarDaLista(operacao.chamadosPendentes.length === 1 ? operacao.chamadosPendentes[0].key : "chamados");
    } else if (id === "alertas") {
      setSelecionado("alertas");
      setFoco({ tipo: "vista", vista: "estoque" });
    } else if (id === "doca") {
      setAba("entregas");
      setSelecionado(null);
      setFoco({ tipo: "vista", vista: "doca" });
    } else if (id === "operacao") {
      setSelecionado("operacao");
    }
  }

  const acoes = {
    abrirPerfil,
    validarChamado(idChamado, elemento) {
      abrirPerfil("chamado", idChamado, elemento);
      rolarParaDecisao();
    },
  };

  const nomeUnidade = operacao?.farmacia?.nome || user?.unitName || "sua unidade";

  return (
    <>
      <header className="mgr-page-head op-cabecalho">
        <div>
          <p className="mgr-eyebrow">DIGITAL TWIN DA UNIDADE</p>
          <h1>Operação 3D</h1>
          <p>
            Estoque, equipe, chamados e entregas da {nomeUnidade} em uma visão espacial. São os mesmos dados das outras
            telas, atualizados a cada 30 segundos.
          </p>
        </div>
        <Link className="mgr-primary" to="/gerente/remedios">
          Ver estoque <span>↗</span>
        </Link>
      </header>

      {gerente.error ? (
        <ErroComRetry message={gerente.error} onRetry={gerente.retry} />
      ) : error ? (
        <ErroComRetry message={error} onRetry={retry} />
      ) : loading || !operacao ? (
        <p className="mgr-empty" role="status">Carregando a operação da unidade…</p>
      ) : (
        <>
          <KpiStrip operacao={operacao} onAbrir={abrirIndicador} />
          {avisoResumo && (
            <p className="op-aviso" role="status">
              A equipe e os serviços não puderam ser carregados agora ({avisoResumo}). O estoque continua atualizado.
            </p>
          )}

          <section className="op-bancada">
            <div className="op-palco" aria-label={usar3d ? "Cena 3D da unidade" : "Planta da unidade"} role="region">
              <div className="op-barra">
                {usar3d && (
                  <div className="op-vistas" role="group" aria-label="Pontos de vista da câmera">
                    {Object.entries(VISTAS).map(([id, v]) => (
                      <button key={id} type="button" onClick={() => setFoco({ tipo: "vista", vista: id })}>
                        {v.rotulo}
                      </button>
                    ))}
                  </div>
                )}
                {desktop && webgl && (
                  <div className="op-modo" role="group" aria-label="Modo de visualização">
                    <button type="button" aria-pressed={usar3d} onClick={() => { setPreferencia2d(false); setFalha3d(""); }}>3D</button>
                    <button type="button" aria-pressed={!usar3d} onClick={() => setPreferencia2d(true)}>2D</button>
                  </div>
                )}
              </div>

              {usar3d ? (
                <>
                  <div className="op-canvas" aria-describedby="op-ajuda-3d">
                    <LimiteDaCena key={tentativa3d} onErro={() => setFalha3d("A cena 3D não pôde ser carregada neste navegador. Mostrando a planta 2D.")}>
                      <Suspense fallback={<p className="op-carregando" role="status">Montando a cena 3D…</p>}>
                        <IntermediScene
                          operacao={operacao}
                          selecionado={selecionado}
                          onSelecionar={selecionarNaCena}
                          foco={foco}
                          reduzirMovimento={reduzirMovimento}
                          onContextoPerdido={() => setFalha3d("A placa de vídeo interrompeu a cena 3D. Mostrando a planta 2D.")}
                        />
                      </Suspense>
                    </LimiteDaCena>
                  </div>
                  <div className="op-zoom" role="group" aria-label="Zoom da câmera">
                    <button type="button" aria-label="Aproximar" onClick={() => setFoco({ tipo: "zoom", fator: 0.75 })}>+</button>
                    <button type="button" aria-label="Afastar" onClick={() => setFoco({ tipo: "zoom", fator: 1.33 })}>−</button>
                    <button type="button" aria-label="Voltar à visão geral" onClick={() => setFoco({ tipo: "vista", vista: "geral" })}>⌂</button>
                  </div>
                  <div className="op-legenda" aria-hidden="true">
                    <span className="op-legenda-titulo">Estoque</span>
                    {LEGENDA_ESTOQUE.map(([id, rotulo]) => (
                      <span key={id}><i style={{ background: COR_SITUACAO[id] }} />{rotulo}</span>
                    ))}
                    <span className="op-legenda-titulo">Equipe</span>
                    {LEGENDA_EQUIPE.map(([id, rotulo]) => (
                      <span key={id}><i className="op-legenda-anel" style={{ borderColor: COR_STATUS[id] }} />{rotulo}</span>
                    ))}
                  </div>
                  <p id="op-ajuda-3d" className="op-ajuda">
                    Arraste para girar, use a roda do mouse para aproximar e o botão direito para mover. Pelo teclado, use a lista ao lado.
                  </p>
                </>
              ) : (
                <>
                  <Fallback2D operacao={operacao} selecionado={selecionado} motivo={motivo2d} onSelecionar={selecionarDaLista} />
                  {falha3d && webgl && desktop && (
                    <button type="button" className="mgr-secondary op-tentar-3d" onClick={() => { setFalha3d(""); setTentativa3d((t) => t + 1); }}>
                      Tentar a cena 3D de novo
                    </button>
                  )}
                </>
              )}
            </div>

            <aside className="op-inspetor" ref={inspetorRef} aria-label="Detalhes da operação">
              <Inspector
                operacao={operacao}
                selecionado={selecionado}
                aba={aba}
                onAba={setAba}
                onSelecionar={selecionarDaLista}
                onFechar={() => setSelecionado(null)}
                acoes={acoes}
              />
            </aside>
          </section>

          <FlowStrip fluxo={operacao.fluxo} onAbrir={abrirIndicador} />
          <p className="op-rodape">
            Posição nas prateleiras e status ao vivo da equipe são representações: o sistema guarda a categoria do remédio e
            o turno do funcionário, não a localização física nem a presença em tempo real.
          </p>
        </>
      )}
    </>
  );
}
