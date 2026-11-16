import { useEffect, useRef, useState } from "react";
import mapaSvg from "../../assets/mapa-svg.svg";

// Mapa de SP (o mesmo da página inicial) com os 645 municípios clicáveis.
// O SVG é posto direto na página para pintar cada município ("mun_<código IBGE>");
// por cima vem uma camada com a mesma viewBox para distritos, farmácias e trajetos.
// O mapa é fixo: não arrasta nem dá zoom com o mouse; quem muda o enquadramento
// é a página (zoom animado ao abrir uma cidade).
//   viewBox               enquadramento
//   apiRef                recebe { caixaDoMunicipio(código) } quando o mapa carrega
//   navegacao / acoes     controles nos cantos superiores esquerdo / direito
//   cores                 Map código -> cor do município
//   selecionado           código do município escolhido
//   onSelecionar          clique num município (null = fora dele)
//   onElemento            clique num elemento da camada com a classe "sim-clicavel"
//                         (recebe o dataset dele: data-pedido, data-farmacia, data-distrito…)
//   dica                  ({ municipio } ou dataset) -> { titulo, detalhe } do balão
//   children              (escala) -> elementos da camada; escala = unidades por pixel

const COR_BASE = "#ffffff";

let textoSvg = null; // 950 KB: baixa uma vez só
const carregarSvg = () => (textoSvg ??= fetch(mapaSvg).then((r) => r.text()));

// estica o enquadramento para a proporção da caixa (sem faixas vazias nas bordas)
function cobrir([x, y, w, h], proporcao) {
  if (w / h > proporcao) {
    const nh = w / proporcao;
    return [x, y - (nh - h) / 2, w, nh];
  }
  const nw = h * proporcao;
  return [x - (nw - w) / 2, y, nw, h];
}

export default function MapaRede({ viewBox, apiRef, navegacao, acoes, cores, selecionado, onSelecionar, onElemento, dica, children }) {
  const caixa = useRef(null);
  const base = useRef(null);
  const svgRef = useRef(null);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [balao, setBalao] = useState(null);
  const [tamanho, setTamanho] = useState({ largura: 1, altura: 1 });
  const vb = cobrir(viewBox, tamanho.largura / tamanho.altura);

  // põe o SVG na página e deixa os municípios clicáveis
  useEffect(() => {
    let ativo = true;
    carregarSvg()
      .then((texto) => {
        if (!ativo || !base.current) return;
        const svg = new DOMParser().parseFromString(texto, "image/svg+xml").documentElement;
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("aria-hidden", "true");
        svg.classList.add("sim-mapa-svg");
        for (const el of svg.querySelectorAll('[id^="mun_"]')) el.style.fill = COR_BASE;
        base.current.replaceChildren(svg);
        svgRef.current = svg;
        setCarregado(true);
      })
      .catch(() => ativo && setErro("Não foi possível carregar o mapa."));
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!carregado || !apiRef) return;
    apiRef.current = {
      caixaDoMunicipio: (codigo) => {
        const b = svgRef.current?.querySelector(`#mun_${codigo}`)?.getBBox();
        return b ? [b.x, b.y, b.width, b.height] : null;
      },
    };
  }, [carregado, apiRef]);

  useEffect(() => {
    svgRef.current?.setAttribute("viewBox", vb.join(" "));
  });

  // tamanho na tela: os pontos e traços têm o mesmo tamanho em qualquer zoom
  useEffect(() => {
    const el = caixa.current;
    if (!el) return undefined;
    const observador = new ResizeObserver(([entrada]) =>
      setTamanho({ largura: entrada.contentRect.width || 1, altura: entrada.contentRect.height || 1 }));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    if (!carregado) return;
    for (const el of svgRef.current.querySelectorAll('[id^="mun_"]')) {
      const codigo = el.id.slice(4);
      el.style.fill = cores.get(codigo) ?? COR_BASE;
      el.classList.toggle("is-selecionado", codigo === selecionado);
    }
  }, [cores, selecionado, carregado]);

  const escala = vb[2] / tamanho.largura;

  // o que está embaixo do ponteiro: um elemento da camada ou um município
  function alvoEm(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const clicavel = el?.closest?.(".sim-clicavel");
    if (clicavel) return { ...clicavel.dataset };
    const municipio = el?.closest?.('[id^="mun_"]')?.id.slice(4);
    return municipio ? { municipio } : null;
  }

  function aoMover(e) {
    const alvo = alvoEm(e);
    const texto = alvo ? dica(alvo) : null;
    if (!texto) return setBalao(null);
    const r = caixa.current.getBoundingClientRect();
    setBalao({ texto, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  function aoClicar(e) {
    const alvo = alvoEm(e);
    if (alvo && !alvo.municipio) return onElemento?.(alvo);
    onSelecionar(alvo?.municipio ?? null);
  }

  return (
    <div className="sim-mapa">
      <div
        ref={caixa}
        className="sim-mapa-caixa"
        onClick={aoClicar}
        onPointerMove={aoMover}
        onPointerLeave={() => setBalao(null)}
        role="application"
        aria-label="Mapa de São Paulo. Clique numa cidade para ver de perto."
      >
        <div ref={base} className="sim-mapa-base" />
        {carregado && (
          <svg className="sim-mapa-camada" viewBox={vb.join(" ")} preserveAspectRatio="xMidYMid meet">
            {children(escala)}
          </svg>
        )}
        {!carregado && !erro && <p className="sim-mapa-aviso" role="status">Carregando o mapa…</p>}
        {erro && <p className="sim-mapa-aviso" role="alert">{erro}</p>}
        {balao && (
          <div className="sim-balao" style={{ left: balao.x, top: balao.y }} role="tooltip">
            <strong>{balao.texto.titulo}</strong>
            {balao.texto.detalhe && <span>{balao.texto.detalhe}</span>}
          </div>
        )}
      </div>
      {navegacao && <div className="sim-mapa-navegacao">{navegacao}</div>}
      {acoes && <div className="sim-mapa-acoes">{acoes}</div>}
    </div>
  );
}
