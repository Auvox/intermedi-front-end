import { useCallback, useEffect, useMemo, useState } from "react";
import MapaRede from "../components/simulacao/MapaRede";
import LinhaDoTempo from "../components/simulacao/LinhaDoTempo";
import {
  ENQUADRAMENTOS,
  ESCALA_AMARELO,
  METRICAS,
  agregarPorMunicipio,
  buscarRede,
  corDoValor,
  estaACaminho,
  eventosDoPedido,
  nomeDoMunicipio,
  prepararRede,
  progresso,
  saldoPorFarmacia,
} from "../services/rede";
import "../styles/simulacao.css";

// Aba "Simulação em tempo real" do admin: o mapa de SP com as farmácias da rede
// e os pedidos entre elas. Ao vivo, os traços são os remédios que estão na
// estrada agora; dá para voltar no tempo e rever qualquer envio. Os municípios
// ficam mais escuros onde a rede mais recebe, envia ou pede (com filtro de remédio).

const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;
const PERIODOS = [
  [1, "24 h"],
  [7, "7 dias"],
  [30, "30 dias"],
];
const ATUALIZAR_A_CADA = 10 * 1000;
const COR_COM_FARMACIA = "#f6f1df"; // município da rede sem movimento no filtro

const numero = (n) => Number(n || 0).toLocaleString("pt-BR");
const nomeRemedio = (p) => `${p.nomeRemedio}${p.dosagemRemedio ? ` ${p.dosagemRemedio}` : ""}`;
const horario = (t) =>
  t ? new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const ordenar = (mapa) => [...mapa].sort((a, b) => b[1] - a[1]);

// curva suave da origem ao destino (ponto de controle para o lado)
function curva(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return { cx: (a.x + b.x) / 2 - dy * 0.18, cy: (a.y + b.y) / 2 + dx * 0.18 };
}
function pontoNaCurva(a, b, c, s) {
  const u = 1 - s;
  return [u * u * a.x + 2 * u * s * c.cx + s * s * b.x, u * u * a.y + 2 * u * s * c.cy + s * s * b.y];
}

// rótulos que cabem sem se sobrepor (os mais importantes primeiro)
function semSobrepor(rotulos, escala, peso) {
  const postos = [];
  return [...rotulos]
    .sort((a, b) => peso(b) - peso(a))
    .filter((r) => {
      const caixa = { x: r.x + 8 * escala, y: r.y - 9 * escala, w: r.nome.length * 6.4 * escala, h: 14 * escala };
      const bate = postos.some((o) => caixa.x < o.x + o.w && o.x < caixa.x + caixa.w && caixa.y < o.y + o.h && o.y < caixa.y + caixa.h);
      if (!bate) postos.push(caixa);
      return !bate;
    });
}

export default function AdminSimulacao() {
  const [dias, setDias] = useState(7);
  const [metrica, setMetrica] = useState("recebeu");
  const [idRemedio, setIdRemedio] = useState("");
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [diferencaRelogio, setDiferencaRelogio] = useState(0); // relógio do servidor - do navegador
  const [relogio, setRelogio] = useState(() => Date.now());
  const [aoVivo, setAoVivo] = useState(true);
  const [t, setT] = useState(() => Date.now());
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(600);
  const [viewBox, setViewBox] = useState(ENQUADRAMENTOS.estado);
  const [municipio, setMunicipio] = useState(null);
  const [idPedido, setIdPedido] = useState(null);
  const [idFarmacia, setIdFarmacia] = useState(null);

  useEffect(() => {
    document.title = "Simulação em tempo real | Intermedi";
  }, []);

  // dados do período; ao vivo, atualiza a cada 10 s
  const carregar = useCallback(
    (signal) =>
      buscarRede(dias, { signal })
        .then((resposta) => {
          setDados(resposta);
          setDiferencaRelogio(Date.parse(resposta.agora) - Date.now());
          setErro("");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setErro(e.message || "Não foi possível carregar a rede.");
        }),
    [dias],
  );
  useEffect(() => {
    const controller = new AbortController();
    carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);
  useEffect(() => {
    if (!aoVivo) return undefined;
    const timer = setInterval(() => carregar(), ATUALIZAR_A_CADA);
    return () => clearInterval(timer);
  }, [aoVivo, carregar]);

  // relógio: ao vivo anda de segundo em segundo
  useEffect(() => {
    const timer = setInterval(() => setRelogio(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const agora = relogio + diferencaRelogio;
  const inicio = agora - dias * DIA;
  const momento = aoVivo ? agora : Math.min(Math.max(t, inicio), agora);

  // tocar a partir de um momento do passado; chegando em agora, volta ao vivo
  useEffect(() => {
    if (!tocando || aoVivo) return undefined;
    let anterior = performance.now();
    const timer = setInterval(() => {
      const instante = performance.now();
      const passo = (instante - anterior) * velocidade;
      anterior = instante;
      setT((atual) => {
        const proximo = atual + passo;
        if (proximo >= Date.now() + diferencaRelogio) {
          setAoVivo(true);
          setTocando(false);
        }
        return proximo;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [tocando, aoVivo, velocidade, diferencaRelogio]);

  const irPara = (instante) => {
    if (instante >= agora) {
      setAoVivo(true);
      setTocando(false);
      return;
    }
    setAoVivo(false);
    setT(Math.max(instante, inicio));
  };

  const rede = useMemo(() => (dados ? prepararRede(dados) : { farmacias: [], porId: new Map(), pedidos: [] }), [dados]);
  const doRemedio = useCallback((p) => !idRemedio || String(p.idRemedio) === String(idRemedio), [idRemedio]);

  const remedios = useMemo(() => {
    const mapa = new Map();
    for (const p of rede.pedidos) mapa.set(String(p.idRemedio), nomeRemedio(p));
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [rede]);

  // o mapa de calor só muda de minuto em minuto (tocando rápido fica leve)
  const minuto = Math.floor(momento / MINUTO);
  const porMunicipio = useMemo(
    () => agregarPorMunicipio(rede.pedidos, { metrica, idRemedio, inicio, fim: minuto * MINUTO + MINUTO - 1 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rede, metrica, idRemedio, minuto, dias],
  );
  const saldo = useMemo(
    () => saldoPorFarmacia(rede.pedidos, { idRemedio, inicio, fim: minuto * MINUTO + MINUTO - 1 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rede, idRemedio, minuto, dias],
  );
  const maximo = Math.max(0, ...[...porMunicipio.values()].map((m) => m.valor));
  const cores = useMemo(() => {
    const mapa = new Map();
    for (const f of rede.farmacias) if (f.codigo) mapa.set(f.codigo, COR_COM_FARMACIA);
    for (const [codigo, m] of porMunicipio) mapa.set(codigo, corDoValor(m.valor, maximo) ?? COR_COM_FARMACIA);
    return mapa;
  }, [rede, porMunicipio, maximo]);

  const minutoAgora = Math.floor(agora / MINUTO);
  const aCaminho = rede.pedidos.filter((p) => doRemedio(p) && estaACaminho(p, momento));
  const marcas = useMemo(
    () =>
      rede.pedidos
        .filter(doRemedio)
        .flatMap(eventosDoPedido)
        .filter((e) => e.tipo !== "pedido" && e.em >= inicio && e.em <= agora + MINUTO)
        .sort((a, b) => a.em - b.em),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rede, doRemedio, dias, minutoAgora],
  );

  // pula para o envio anterior/seguinte (um pouco depois da saída, com o traço na tela)
  function pular(direcao) {
    const envios = marcas.filter((m) => m.tipo === "envio").map((m) => m.em + MINUTO);
    const alvo = direcao === "proximo"
      ? envios.find((em) => em > momento + 30 * 1000)
      : [...envios].reverse().find((em) => em < momento - 30 * 1000);
    if (alvo != null) {
      setTocando(false);
      irPara(alvo);
    }
  }

  // municípios com farmácia: um rótulo no meio das farmácias de cada um
  const rotulos = useMemo(() => {
    const grupos = new Map();
    for (const f of rede.farmacias) {
      if (f.x == null || !f.codigo) continue;
      const g = grupos.get(f.codigo) ?? { codigo: f.codigo, x: 0, y: 0, n: 0 };
      g.x += f.x;
      g.y += f.y;
      g.n += 1;
      grupos.set(f.codigo, g);
    }
    return [...grupos.values()].map((g) => ({ ...g, x: g.x / g.n, y: g.y / g.n, nome: nomeDoMunicipio(g.codigo) }));
  }, [rede]);

  const m = METRICAS[metrica];
  const ranking = ordenar(new Map([...porMunicipio].map(([codigo, dadosMun]) => [codigo, dadosMun.valor]))).slice(0, 5);
  const pedido = idPedido ? rede.pedidos.find((p) => p.idPedido === idPedido) : null;
  const farmacia = idFarmacia ? rede.porId.get(idFarmacia) : null;

  function focarMunicipio(codigo) {
    setMunicipio(codigo);
    setIdPedido(null);
    setIdFarmacia(null);
    const grupo = rotulos.find((r) => r.codigo === codigo);
    if (!grupo) return;
    const [, , w0, h0] = ENQUADRAMENTOS.grandeSp;
    const w = w0 * 0.55;
    const h = h0 * 0.55;
    setViewBox([grupo.x - w / 2, grupo.y - h / 2, w, h]);
  }

  function aoClicarElemento({ pedido: idP, farmacia: idF }) {
    if (idP) {
      setIdPedido(Number(idP));
      setIdFarmacia(null);
    } else if (idF) {
      const f = rede.porId.get(Number(idF));
      setIdFarmacia(Number(idF));
      setIdPedido(null);
      setMunicipio(f?.codigo ?? null);
    }
  }

  const dica = (codigo) => {
    const dadosMun = porMunicipio.get(codigo);
    return {
      titulo: nomeDoMunicipio(codigo),
      detalhe: dadosMun ? `${numero(dadosMun.valor)} ${m.unidade}` : rotulos.some((r) => r.codigo === codigo) ? "Sem movimento neste filtro" : null,
    };
  };

  const dadosMunicipio = municipio ? porMunicipio.get(municipio) : null;
  const farmaciasDoMunicipio = municipio ? rede.farmacias.filter((f) => f.codigo === municipio) : [];

  return (
    <div className="sim">
      <header className="sim-cabecalho">
        <div>
          <h1>Simulação em tempo real</h1>
          <p>A rede de farmácias no mapa de São Paulo: o que está na estrada agora e o que já passou.</p>
        </div>
        {erro && <p className="sim-erro" role="alert">{erro} <button type="button" onClick={() => carregar()}>Tentar de novo</button></p>}
      </header>

      <div className="sim-grade">
        <section className="sim-palco" aria-label="Mapa da rede">
          <MapaRede
            viewBox={viewBox}
            onViewBox={setViewBox}
            cores={cores}
            selecionado={municipio}
            onSelecionar={(codigo) => {
              setMunicipio(codigo);
              setIdPedido(null);
              setIdFarmacia(null);
            }}
            onElemento={aoClicarElemento}
            dica={dica}
          >
            {(escala) => (
              <>
                {aCaminho.map((p) => {
                  const a = p.origem;
                  const b = p.destino;
                  if (a.x == null || b.x == null) return null;
                  const c = curva(a, b);
                  const d = `M${a.x},${a.y} Q${c.cx},${c.cy} ${b.x},${b.y}`;
                  const s = progresso(p, momento);
                  const [px, py] = pontoNaCurva(a, b, c, s ?? 0.5);
                  const ativo = p.idPedido === idPedido;
                  return (
                    <g key={p.idPedido} className={`sim-trajeto${ativo ? " is-ativo" : ""}`}>
                      <path d={d} className="sim-trajeto-linha" strokeWidth={(ativo ? 3 : 2) * escala} strokeDasharray={`${7 * escala} ${5 * escala}`}>
                        {aoVivo && <animate attributeName="stroke-dashoffset" from={12 * escala} to="0" dur="0.9s" repeatCount="indefinite" />}
                      </path>
                      <circle cx={b.x} cy={b.y} r={9 * escala} className="sim-trajeto-chegada" />
                      <circle cx={px} cy={py} r={5 * escala} className="sim-trajeto-carga" />
                      <path d={d} className="sim-clicavel sim-trajeto-alvo" data-pedido={p.idPedido} strokeWidth={14 * escala}>
                        <title>{`${nomeRemedio(p)} · ${numero(p.quantidade)} un. · ${a.nome} → ${b.nome}`}</title>
                      </path>
                    </g>
                  );
                })}
                {rede.farmacias.map((f) => {
                  if (f.x == null) return null;
                  const s = saldo.get(f.idFarmacia) ?? 0;
                  const tom = s > 0 ? "sobra" : s < 0 ? "falta" : "neutra";
                  const ativa = f.idFarmacia === idFarmacia;
                  return (
                    <g key={f.idFarmacia} className={`sim-farmacia is-${tom}${ativa ? " is-ativa" : ""}`} transform={`translate(${f.x},${f.y})`}>
                      <circle r={10 * escala} className="sim-farmacia-halo" />
                      <circle r={(ativa ? 6 : 4.5) * escala} strokeWidth={1.5 * escala} className="sim-clicavel sim-farmacia-ponto" data-farmacia={f.idFarmacia}>
                        <title>{`${f.nome} · ${f.bairro ? `${f.bairro}, ` : ""}${f.cidade}`}</title>
                      </circle>
                    </g>
                  );
                })}
                {semSobrepor(rotulos, escala, (r) => (r.codigo === municipio ? Infinity : porMunicipio.get(r.codigo)?.valor ?? 0)).map((r) => (
                  <text key={r.codigo} x={r.x + 9 * escala} y={r.y + 4 * escala} fontSize={11 * escala} strokeWidth={3 * escala} className="sim-rotulo">
                    {r.nome}
                  </text>
                ))}
              </>
            )}
          </MapaRede>

          <LinhaDoTempo
            inicio={inicio}
            agora={agora}
            t={momento}
            aoVivo={aoVivo}
            tocando={tocando}
            velocidade={velocidade}
            marcas={marcas}
            onT={(instante) => irPara(instante)}
            onAoVivo={() => {
              setAoVivo(true);
              setTocando(false);
            }}
            onTocar={setTocando}
            onVelocidade={setVelocidade}
            onPular={pular}
          />
        </section>

        <aside className="sim-lateral" aria-label="Filtros e detalhes">
          <div className="sim-bloco">
            <span className="sim-rotulo-bloco">Mostrar</span>
            <div className="sim-segmentos" role="group" aria-label="O que pintar no mapa">
              {Object.entries(METRICAS).map(([chave, info]) => (
                <button key={chave} type="button" aria-pressed={metrica === chave} onClick={() => setMetrica(chave)}>
                  {info.rotulo}
                </button>
              ))}
            </div>
            <label className="sim-campo">
              <span>Remédio</span>
              <select value={idRemedio} onChange={(e) => setIdRemedio(e.target.value)}>
                <option value="">Todos os remédios</option>
                {remedios.map(([id, nome]) => (
                  <option key={id} value={id}>{nome}</option>
                ))}
              </select>
            </label>
            <span className="sim-rotulo-bloco">Período</span>
            <div className="sim-segmentos" role="group" aria-label="Período">
              {PERIODOS.map(([valor, rotulo]) => (
                <button key={valor} type="button" aria-pressed={dias === valor} onClick={() => setDias(valor)}>
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="sim-bloco sim-legenda">
            <span className="sim-rotulo-bloco">{m.titulo}</span>
            <div className="sim-escala" aria-hidden="true">
              {ESCALA_AMARELO.map((cor) => <i key={cor} style={{ background: cor }} />)}
            </div>
            <div className="sim-escala-valores">
              <span>menos</span>
              <span>{maximo ? `${numero(maximo)} ${m.unidade}` : "sem movimento"}</span>
            </div>
            <ul className="sim-legenda-itens">
              <li><i className="sim-ponto is-sobra" /> Farmácia que mais envia (sobra)</li>
              <li><i className="sim-ponto is-falta" /> Farmácia que mais recebe (falta)</li>
              <li><i className="sim-traco" /> Remédio na estrada</li>
            </ul>
          </div>

          {pedido ? (
            <div className="sim-bloco sim-detalhe">
              <button type="button" className="sim-fechar" onClick={() => setIdPedido(null)} aria-label="Fechar pedido">×</button>
              <span className="sim-rotulo-bloco">Pedido #{pedido.idPedido}</span>
              <h2>{nomeRemedio(pedido)}</h2>
              <p className="sim-destaque">{numero(pedido.quantidade)} unidades</p>
              <p className="sim-rota">
                <span>{pedido.origem.nome}<small>{pedido.origem.cidade}</small></span>
                <b aria-label="para">→</b>
                <span>{pedido.destino.nome}<small>{pedido.destino.cidade}</small></span>
              </p>
              <dl className="sim-numeros">
                <div><dt>Pedido</dt><dd>{horario(pedido.sol)}</dd></div>
                <div><dt>Saiu</dt><dd>{horario(pedido.env)}</dd></div>
                <div><dt>{pedido.rec ? "Chegou" : "Chegada prevista"}</dt><dd>{horario(pedido.rec ?? pedido.prev)}</dd></div>
              </dl>
              {estaACaminho(pedido, momento) && <p className="sim-status">Na estrada neste momento</p>}
            </div>
          ) : municipio ? (
            <div className="sim-bloco sim-detalhe">
              <button type="button" className="sim-fechar" onClick={() => { setMunicipio(null); setIdFarmacia(null); }} aria-label="Fechar município">×</button>
              <span className="sim-rotulo-bloco">{m.titulo}{idRemedio ? ` · ${remedios.find(([id]) => id === idRemedio)?.[1]}` : ""}</span>
              <h2>{nomeDoMunicipio(municipio)}</h2>
              {dadosMunicipio ? (
                <>
                  <p className="sim-destaque">{numero(dadosMunicipio.valor)} <small>{m.unidade}</small></p>
                  <dl className="sim-numeros">
                    <div><dt>Pedidos</dt><dd>{numero(dadosMunicipio.pedidos)}</dd></div>
                    <div><dt>Farmácias da rede</dt><dd>{numero(farmaciasDoMunicipio.length)}</dd></div>
                    <div><dt>Posição</dt><dd>{ordenar(new Map([...porMunicipio].map(([c, d]) => [c, d.valor]))).findIndex(([c]) => c === municipio) + 1}º</dd></div>
                  </dl>
                  <ListaBarras titulo="Por farmácia" itens={ordenar(dadosMunicipio.porFarmacia).map(([id, v]) => [rede.porId.get(id)?.nome ?? `#${id}`, v])} destaque={farmacia?.nome} />
                  {!idRemedio && <ListaBarras titulo="Remédios" itens={ordenar(dadosMunicipio.porRemedio).slice(0, 5)} />}
                  <ListaBarras titulo={m.parceiro === "origem" ? "De onde veio" : "Para onde foi"} itens={ordenar(dadosMunicipio.parceiros).slice(0, 5)} />
                </>
              ) : (
                <p className="sim-vazio">
                  {farmaciasDoMunicipio.length
                    ? `Sem ${m.unidade} neste filtro até este momento.`
                    : "Nenhuma farmácia da rede neste município."}
                </p>
              )}
              {!dadosMunicipio && farmaciasDoMunicipio.length > 0 && (
                <ListaBarras titulo="Farmácias da rede" itens={farmaciasDoMunicipio.map((f) => [f.nome, 0])} semValor />
              )}
            </div>
          ) : (
            <>
              <div className="sim-bloco">
                <span className="sim-rotulo-bloco">Na estrada {aoVivo ? "agora" : "neste momento"} · {aCaminho.length}</span>
                {aCaminho.length ? (
                  <ul className="sim-lista">
                    {aCaminho.slice(0, 6).map((p) => (
                      <li key={p.idPedido}>
                        <button type="button" onClick={() => setIdPedido(p.idPedido)}>
                          <strong>{nomeRemedio(p)} · {numero(p.quantidade)} un.</strong>
                          <span>{p.origem.cidade === p.destino.cidade ? `${p.origem.nome} → ${p.destino.nome}` : `${p.origem.cidade} → ${p.destino.cidade}`}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="sim-vazio">
                    Nenhum remédio na estrada{aoVivo ? " agora" : " neste momento"}.{" "}
                    <button type="button" className="sim-link" onClick={() => pular("anterior")}>Ver o último envio</button>
                  </p>
                )}
              </div>
              <div className="sim-bloco">
                <span className="sim-rotulo-bloco">{m.titulo}</span>
                {ranking.length ? (
                  <ol className="sim-ranking">
                    {ranking.map(([codigo, valor]) => (
                      <li key={codigo}>
                        <button type="button" onClick={() => focarMunicipio(codigo)}>
                          <span>{nomeDoMunicipio(codigo)}</span>
                          <i style={{ width: `${(valor / maximo) * 100}%`, background: corDoValor(valor, maximo) }} aria-hidden="true" />
                          <b>{numero(valor)}</b>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="sim-vazio">Sem movimento neste filtro até este momento.</p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function ListaBarras({ titulo, itens, destaque, semValor = false }) {
  if (!itens.length) return null;
  const maior = Math.max(1, ...itens.map(([, v]) => v));
  return (
    <div className="sim-barras">
      <span className="sim-rotulo-bloco">{titulo}</span>
      <ul>
        {itens.map(([nome, valor]) => (
          <li key={nome} className={nome === destaque ? "is-destaque" : undefined}>
            <span>{nome}</span>
            {!semValor && <i style={{ width: `${(valor / maior) * 100}%` }} aria-hidden="true" />}
            {!semValor && <b>{numero(valor)}</b>}
          </li>
        ))}
      </ul>
    </div>
  );
}
