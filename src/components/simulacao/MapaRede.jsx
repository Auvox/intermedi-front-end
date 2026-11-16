import { useEffect, useRef, useState } from "react";
import mapaSvg from "../../assets/mapa-svg.svg";
import { ENQUADRAMENTOS } from "../../services/rede";

// Mapa de SP (o mesmo da página inicial) com os 645 municípios clicáveis.
// O SVG é posto direto na página para pintar cada município ("mun_<código IBGE>");
// por cima vem uma camada com a mesma viewBox para farmácias e trajetos.
//   viewBox / onViewBox   enquadramento (zoom e arraste)
//   vistaRede             enquadramento com todas as farmácias (botão "Farmácias")
//   cores                 Map código -> cor do município
//   selecionado           código do município escolhido
//   onSelecionar          clique num município (null = fora dele)
//   onElemento            clique num elemento da camada com a classe "sim-clicavel"
//                         (recebe o dataset dele: data-pedido, data-farmacia…)
//   dica                  (código) -> { titulo, detalhe } do balão ao passar o mouse
//   children              (escala) -> elementos da camada; escala = unidades por pixel

const COR_BASE = "#ffffff";
const LARGURA_MINIMA = 1500; // zoom máximo (~5 km de largura)
const ESTADO = ENQUADRAMENTOS.estado;

let textoSvg = null; // 950 KB: baixa uma vez só
const carregarSvg = () => (textoSvg ??= fetch(mapaSvg).then((r) => r.text()));

function limitar([x, y, largura, altura]) {
  const w = Math.min(Math.max(largura, LARGURA_MINIMA), ESTADO[2] * 1.15);
  const h = (w * altura) / largura;
  const folga = w * 0.3;
  const nx = Math.min(Math.max(x, ESTADO[0] - folga), ESTADO[0] + ESTADO[2] - w + folga);
  const ny = Math.min(Math.max(y, ESTADO[1] - folga), ESTADO[1] + ESTADO[3] - h + folga);
  return [nx, ny, w, h];
}

// estica o enquadramento para a proporção da caixa (sem faixas vazias nas bordas)
function cobrir([x, y, w, h], proporcao) {
  if (w / h > proporcao) {
    const nh = w / proporcao;
    return [x, y - (nh - h) / 2, w, nh];
  }
  const nw = h * proporcao;
  return [x - (nw - w) / 2, y, nw, h];
}

export default function MapaRede({ viewBox, onViewBox, vistaRede, cores, selecionado, onSelecionar, onElemento, dica, children }) {
  const caixa = useRef(null);
  const base = useRef(null);
  const svgRef = useRef(null);
  const arraste = useRef(null);
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

  // ponto da tela -> coordenada do mapa
  const noMapa = (clientX, clientY) => {
    const r = caixa.current.getBoundingClientRect();
    return [vb[0] + ((clientX - r.left) / r.width) * vb[2], vb[1] + ((clientY - r.top) / r.height) * vb[3]];
  };

  function zoom(fator, cx, cy) {
    const [x, y, w, h] = vb;
    const [px, py] = cx == null ? [x + w / 2, y + h / 2] : noMapa(cx, cy);
    const nw = w * fator;
    const nh = h * fator;
    onViewBox(limitar([px - ((px - x) / w) * nw, py - ((py - y) / h) * nh, nw, nh]));
  }

  // roda do mouse: zoom no ponto do cursor (precisa de passive: false)
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  });
  useEffect(() => {
    const el = caixa.current;
    const aoRolar = (e) => {
      e.preventDefault();
      zoomRef.current(e.deltaY > 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", aoRolar, { passive: false });
    return () => el.removeEventListener("wheel", aoRolar);
  }, []);

  const municipioEm = (alvo) => alvo.closest?.('[id^="mun_"]')?.id.slice(4) ?? null;

  function aoApertar(e) {
    if (e.button !== 0) return;
    arraste.current = { x: e.clientX, y: e.clientY, inicio: vb, moveu: false };
    caixa.current.setPointerCapture(e.pointerId);
  }

  function aoMover(e) {
    const a = arraste.current;
    if (a) {
      const dx = e.clientX - a.x;
      const dy = e.clientY - a.y;
      if (!a.moveu && Math.hypot(dx, dy) < 4) return;
      a.moveu = true;
      setBalao(null);
      const r = caixa.current.getBoundingClientRect();
      const [x, y, w, h] = a.inicio;
      onViewBox(limitar([x - (dx / r.width) * w, y - (dy / r.height) * h, w, h]));
      return;
    }
    const codigo = municipioEm(document.elementFromPoint(e.clientX, e.clientY) ?? e.target);
    if (!codigo) return setBalao(null);
    const r = caixa.current.getBoundingClientRect();
    setBalao({ codigo, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  function aoSoltar(e) {
    const a = arraste.current;
    arraste.current = null;
    if (!a || a.moveu) return;
    // clique: o que está embaixo do ponteiro (a camada de cima deixa passar)
    const alvo = document.elementFromPoint(e.clientX, e.clientY);
    const clicavel = alvo?.closest(".sim-clicavel");
    if (clicavel) return onElemento?.({ ...clicavel.dataset });
    onSelecionar(municipioEm(alvo));
  }

  const textoBalao = balao ? dica(balao.codigo) : null;

  return (
    <div className="sim-mapa">
      <div
        ref={caixa}
        className="sim-mapa-caixa"
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerLeave={() => !arraste.current && setBalao(null)}
        role="application"
        aria-label="Mapa de São Paulo. Arraste para mover, role para aproximar, clique num município para ver os números."
      >
        <div ref={base} className="sim-mapa-base" />
        {carregado && (
          <svg className="sim-mapa-camada" viewBox={vb.join(" ")} preserveAspectRatio="xMidYMid meet">
            {children(escala)}
          </svg>
        )}
        {!carregado && !erro && <p className="sim-mapa-aviso" role="status">Carregando o mapa…</p>}
        {erro && <p className="sim-mapa-aviso" role="alert">{erro}</p>}
        {textoBalao && (
          <div className="sim-balao" style={{ left: balao.x, top: balao.y }} role="tooltip">
            <strong>{textoBalao.titulo}</strong>
            {textoBalao.detalhe && <span>{textoBalao.detalhe}</span>}
          </div>
        )}
      </div>
      <div className="sim-zoom" role="group" aria-label="Zoom do mapa">
        <button type="button" onClick={() => zoom(1 / 1.6)} aria-label="Aproximar">+</button>
        <button type="button" onClick={() => zoom(1.6)} aria-label="Afastar">−</button>
        <button type="button" onClick={() => onViewBox(ENQUADRAMENTOS.estado)}>Estado</button>
        <button type="button" onClick={() => onViewBox(ENQUADRAMENTOS.grandeSp)}>Grande SP</button>
        <button type="button" onClick={() => onViewBox(vistaRede)}>Farmácias</button>
      </div>
    </div>
  );
}
