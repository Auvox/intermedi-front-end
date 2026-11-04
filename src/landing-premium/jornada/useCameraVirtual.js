import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ALTURA_VISIVEL, FIM, FORNECEDORA, INICIO, LARGURA_MINIMA, MUNDO, QUADRO_FIM, QUADRO_INICIO, SOLICITANTE, VAGAS } from "./geometria";

gsap.registerPlugin(ScrollTrigger);

// Fases no progresso normalizado da seção (0 a 1)
export const PARTIDA = 0.15; // fim do carregamento: o carrinho começa a andar
export const CHEGADA = 0.9; // o carrinho para na porta da solicitante
// Começo de cada cena do texto
export const CENAS = [0, 0.13, 0.27, 0.72, 0.9];

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const misturar = (a, b, t) => a + (b - a) * t;
const suave = (a, b, v) => {
  const t = limitar((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Quanto da rota (0 a 1) o carrinho já percorreu: parado no carregamento,
// acelera, segue em velocidade constante, desacelera e para. A velocidade
// não dá saltos (perfil trapezoidal).
export function percurso(p) {
  const t = limitar((p - PARTIDA) / (CHEGADA - PARTIDA), 0, 1);
  const a = 0.14;
  const d = 0.24;
  const v = 1 / (1 - a / 2 - d / 2);
  if (t < a) return (v * t * t) / (2 * a);
  if (t <= 1 - d) return v * (a / 2 + (t - a));
  return 1 - (v * (1 - t) * (1 - t)) / (2 * d);
}

const cenaDe = (p) => CENAS.reduce((k, inicio, i) => (p >= inicio ? i : k), 0);

// Câmera virtual presa à rolagem do contêiner `rolagem`. O mundo é o SVG
// `mundo`; a câmera é o viewBox dele (tela = mundo - câmera). O carrinho tem
// posição própria no mundo e a câmera o segue, com enquadramentos fixos no
// começo e no fim. Tudo deriva do progresso: nada de timers.
export function useCameraVirtual({ rolagem, janela, mundo, textos, barra, ativo, aoMudarCena }) {
  useLayoutEffect(() => {
    if (!ativo) return undefined;
    const svg = mundo.current;
    const q = (nome) => svg.querySelector(`[data-j="${nome}"]`);
    const carrinho = q("carrinho");
    const giro = q("carrinho-giro");
    const rota = q("rota");
    const entregue = q("entregue");
    const caixas = gsap.utils.toArray(svg.querySelectorAll('[data-j="caixa"]'));
    const blocos = gsap.utils.toArray(textos.current.querySelectorAll('[data-j="texto"]'));
    const linha = barra.current;
    const quadroJanela = janela.current;

    // Tabela de pontos da rota, em coordenadas do mundo (medida uma vez)
    const medida = q("rota-medida");
    const comprimento = medida.getTotalLength();
    const N = 600;
    const tabela = new Float32Array((N + 1) * 2);
    for (let i = 0; i <= N; i += 1) {
      const pt = medida.getPointAtLength((comprimento * i) / N);
      tabela[2 * i] = pt.x;
      tabela[2 * i + 1] = pt.y;
    }
    const ponto = (s) => {
      const f = limitar(s, 0, 1) * N;
      const i = Math.min(N - 1, Math.floor(f));
      const k = f - i;
      return { x: misturar(tabela[2 * i], tabela[2 * i + 2], k), y: misturar(tabela[2 * i + 1], tabela[2 * i + 3], k) };
    };
    const direcao = (s) => {
      const e = 4 / N;
      const a = ponto(Math.max(0, s - e));
      const b = ponto(Math.min(1, s + e));
      return Math.atan2(b.y - a.y, b.x - a.x);
    };

    // Recorte visível do mundo: altura fixa em unidades, largura pela proporção da janela
    let largura = 1000;
    let altura = ALTURA_VISIVEL.larga;
    let tl = null;
    let cenaAtual = -1;

    const desenhar = () => {
      const p = tl ? tl.progress() : 0;
      const s = percurso(p);
      const c = ponto(s);
      const ang = direcao(s);

      // carrinho no mundo
      carrinho.setAttribute("transform", `translate(${c.x.toFixed(2)} ${c.y.toFixed(2)})`);
      giro.setAttribute("transform", `rotate(${((ang * 180) / Math.PI).toFixed(2)})`);
      rota.style.strokeDashoffset = String(1 - s);

      // câmera: enquadramento fixo → acompanha o carrinho (olhando um pouco
      // à frente) → desacelera até o enquadramento do destino
      const seguir = suave(PARTIDA + 0.02, 0.3, p);
      const chegar = suave(0.72, 0.93, p);
      const frente = 90 * seguir * (1 - chegar);
      let cx = misturar(QUADRO_INICIO.x, c.x + Math.cos(ang) * frente, seguir);
      let cy = misturar(QUADRO_INICIO.y, c.y + Math.sin(ang) * frente, seguir);
      cx = misturar(cx, QUADRO_FIM.x, chegar);
      cy = misturar(cy, QUADRO_FIM.y, chegar);
      // nunca mostra além das bordas do mundo
      cx = largura >= MUNDO.largura ? MUNDO.largura / 2 : limitar(cx, largura / 2, MUNDO.largura - largura / 2);
      cy = altura >= MUNDO.altura ? MUNDO.altura / 2 : limitar(cy, altura / 2, MUNDO.altura - altura / 2);
      svg.setAttribute("viewBox", `${(cx - largura / 2).toFixed(2)} ${(cy - altura / 2).toFixed(2)} ${largura.toFixed(2)} ${altura.toFixed(2)}`);

      if (linha) linha.style.transform = `scaleX(${p.toFixed(4)})`;
      const k = cenaDe(p);
      if (k !== cenaAtual) {
        cenaAtual = k;
        aoMudarCena(k);
      }
    };

    const medir = () => {
      const r = quadroJanela.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const estreita = r.width < 640;
      // janela estreita e alta: garante largura para as fachadas e etiquetas
      altura = Math.max(estreita ? ALTURA_VISIVEL.estreita : ALTURA_VISIVEL.larga, estreita ? (LARGURA_MINIMA * r.height) / r.width : 0);
      largura = (altura * r.width) / r.height;
      desenhar();
    };

    const ctx = gsap.context(() => {
      tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        onUpdate: desenhar,
        scrollTrigger: {
          trigger: rolagem.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          invalidateOnRefresh: true,
          onRefresh: () => desenhar(),
        },
      });

      // Textos: uma cena por vez, no mesmo lugar
      gsap.set(blocos, { autoAlpha: 0, y: 20 });
      gsap.set(blocos[0], { autoAlpha: 1, y: 0 });
      CENAS.slice(1).forEach((inicio, i) => {
        tl.to(blocos[i], { autoAlpha: 0, y: -20, duration: 0.025 }, inicio - 0.03)
          .to(blocos[i + 1], { autoAlpha: 1, y: 0, duration: 0.03 }, inicio - 0.008);
      });

      // Caixas: saem da porta da fornecedora e entram na caçamba; no fim saem
      // da caçamba para a porta da solicitante. Coordenadas do carrinho (que
      // está parado e reto nos dois momentos).
      const portaForn = { x: FORNECEDORA.porta.x - INICIO.x, y: FORNECEDORA.porta.y - INICIO.y };
      const portaSol = { x: SOLICITANTE.porta.x - FIM.x, y: SOLICITANTE.porta.y - FIM.y };
      caixas.forEach((caixa, i) => {
        const [vx, vy] = VAGAS[i];
        gsap.set(caixa, { x: portaForn.x - vx, y: portaForn.y - vy, autoAlpha: 0 });
        tl.to(caixa, { autoAlpha: 1, duration: 0.008 }, 0.02 + i * 0.032)
          .to(caixa, { x: 0, y: 0, duration: 0.04, ease: "power1.inOut" }, 0.025 + i * 0.032)
          .to(caixa, { x: portaSol.x - vx, y: portaSol.y - vy, duration: 0.03, ease: "power1.inOut" }, 0.905 + i * 0.014)
          .to(caixa, { autoAlpha: 0, duration: 0.008 }, 0.93 + i * 0.014);
      });

      // Entrega concluída
      gsap.set(entregue, { autoAlpha: 0, scale: 0.5, transformOrigin: "50% 50%" });
      tl.to(entregue, { autoAlpha: 1, scale: 1, duration: 0.03, ease: "back.out(2)" }, 0.955);

      // duração total exatamente 1: o tempo da timeline é o progresso
      tl.set({}, {}, 1);

      tl.progress(tl.scrollTrigger.progress);
    });

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(quadroJanela);
    // fontes e a volta do modo estático mudam alturas acima: recalcula
    let vivo = true;
    document.fonts?.ready.then(() => { if (vivo) ScrollTrigger.refresh(); });
    const quadro = requestAnimationFrame(() => { if (vivo) ScrollTrigger.refresh(); });

    return () => {
      vivo = false;
      cancelAnimationFrame(quadro);
      observador.disconnect();
      ctx.revert();
      // devolve o estado final, que é o que aparece sem animação
      svg.setAttribute("viewBox", `0 0 ${MUNDO.largura} ${MUNDO.altura}`);
      carrinho.setAttribute("transform", `translate(${FIM.x} ${FIM.y})`);
      giro.removeAttribute("transform");
      rota.style.strokeDashoffset = "";
      if (linha) linha.style.transform = "";
    };
  }, [rolagem, janela, mundo, textos, barra, ativo, aoMudarCena]);
}
