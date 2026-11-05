import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CAMPO, CENTRO_X, FIM, FORNECEDORA, INICIO, MUNDO, QUADRO_FIM, QUADRO_INICIO, SOLICITANTE, VAGAS } from "./geometria";

gsap.registerPlugin(ScrollTrigger);

// Fases no progresso normalizado da seção (0 a 1)
export const PARTIDA = 0.15; // fim do carregamento: o caminhão começa a descer
export const CHEGADA = 0.84; // o caminhão para na porta da solicitante
export const ENTREGUE = 0.92; // caixas na farmácia e selo de concluído
export const SAIDA = 0.93; // daqui até 1 o cenário dá lugar à cor da seção seguinte
// Começo de cada cena do texto
export const CENAS = [0, 0.12, 0.28, 0.66, 0.84];
// Até onde a câmera pode ir além do mundo (além das bordas há só chão)
const LIMITES = { topo: -500, base: MUNDO.altura + 100, esquerda: -700, direita: MUNDO.largura + 700 };

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const misturar = (a, b, t) => a + (b - a) * t;
const suave = (a, b, v) => {
  const t = limitar((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Quanto da estrada (0 a 1) o caminhão já percorreu: parado no carregamento,
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

// Desloca um vetor do mundo para o sistema do caminhão (girado de `ang`)
const paraOCaminhao = (dx, dy, ang) => ({
  x: dx * Math.cos(ang) + dy * Math.sin(ang),
  y: -dx * Math.sin(ang) + dy * Math.cos(ang),
});

// Câmera virtual presa à rolagem do contêiner `rolagem`. Quatro grandezas:
//   progresso      0 a 1, da rolagem da seção (scrub da timeline)
//   noMundo        posição do caminhão no mundo, pela estrada
//   camera         centro da vista no mundo (segue o caminhão, com limites)
//   naTela         onde o caminhão cai na tela (fração 0 a 1), usada para
//                  garantir que ele nunca saia do enquadramento
// A tela é o viewBox do SVG: tela = mundo - câmera. Nada de timers.
// Cor de fundo da primeira seção depois da jornada (subindo até achar um
// elemento seguinte e descendo pelos primeiros filhos até um fundo opaco)
function corDaProximaSecao(secao) {
  let el = secao;
  while (el && !el.nextElementSibling) el = el.parentElement;
  for (let alvo = el?.nextElementSibling; alvo; alvo = alvo.firstElementChild) {
    const cor = getComputedStyle(alvo).backgroundColor;
    if (cor && cor !== "transparent" && !/rgba\(.*,\s*0\)$/.test(cor)) return cor;
  }
  return null;
}

export function useCameraVirtual({ rolagem, palco, mundo, textos, indicador, saida, ativo, aoMudarCena }) {
  useLayoutEffect(() => {
    if (!ativo) return undefined;
    const svg = mundo.current;
    const quadro = palco.current;
    const q = (nome) => svg.querySelector(`[data-j="${nome}"]`);
    const caminhao = q("carrinho");
    const giro = q("carrinho-giro");
    const rota = q("rota");
    const entregue = q("entregue");
    const caixas = gsap.utils.toArray(svg.querySelectorAll('[data-j="caixa"]'));
    const blocos = gsap.utils.toArray(textos.current.querySelectorAll('[data-j="texto"]'));
    const convite = indicador.current;

    // Tabela de pontos da estrada, em coordenadas do mundo (medida uma vez)
    const medida = q("rota-medida");
    const comprimento = medida.getTotalLength();
    const N = 900;
    const tabela = new Float32Array((N + 1) * 2);
    for (let i = 0; i <= N; i += 1) {
      const pt = medida.getPointAtLength((comprimento * i) / N);
      tabela[2 * i] = pt.x;
      tabela[2 * i + 1] = pt.y;
    }
    const pontoNaEstrada = (s) => {
      const f = limitar(s, 0, 1) * N;
      const i = Math.min(N - 1, Math.floor(f));
      const k = f - i;
      return { x: misturar(tabela[2 * i], tabela[2 * i + 2], k), y: misturar(tabela[2 * i + 1], tabela[2 * i + 3], k) };
    };
    const direcao = (s) => {
      const e = 4 / N;
      const a = pontoNaEstrada(Math.max(0, s - e));
      const b = pontoNaEstrada(Math.min(1, s + e));
      return Math.atan2(b.y - a.y, b.x - a.x);
    };

    // Campo de visão (unidades do mundo), recalculado com o tamanho da tela
    const campo = { largura: 1600, altura: 1000, alvoX: 0.5, alvoY: 0.5, seguirX: 0.3, margemTopo: 0.1, margemEsquerda: 0.12 };
    let tl = null;
    let cenaAtual = -1;

    const posicaoDaCamera = (p, noMundo) => {
      const seguir = suave(PARTIDA + 0.02, 0.3, p);
      // parada antes da saída: em 0,88 a câmera já está no quadro final
      const chegar = suave(0.68, 0.88, p);
      // a mira acompanha o caminhão na vertical; na horizontal, só uma parte
      // das curvas, para ele oscilar de leve em torno do centro
      const seguidoX = CENTRO_X + (noMundo.x - CENTRO_X) * campo.seguirX;
      let mx = misturar(QUADRO_INICIO.x, seguidoX, seguir);
      let my = misturar(QUADRO_INICIO.y, noMundo.y, seguir);
      mx = misturar(mx, QUADRO_FIM.x, chegar);
      my = misturar(my, QUADRO_FIM.y, chegar);
      // a mira fica no ponto (alvoX, alvoY) da tela
      let x = mx + (0.5 - campo.alvoX) * campo.largura;
      let y = my + (0.5 - campo.alvoY) * campo.altura;
      // garante o caminhão dentro do quadro, com folga
      const esquerda = x - campo.largura / 2;
      const topo = y - campo.altura / 2;
      const naTela = { x: (noMundo.x - esquerda) / campo.largura, y: (noMundo.y - topo) / campo.altura };
      if (naTela.x < campo.margemEsquerda) x -= (campo.margemEsquerda - naTela.x) * campo.largura;
      if (naTela.x > 0.88) x += (naTela.x - 0.88) * campo.largura;
      if (naTela.y < campo.margemTopo) y -= (campo.margemTopo - naTela.y) * campo.altura;
      if (naTela.y > 0.86) y += (naTela.y - 0.86) * campo.altura;
      // limites do mundo
      const metadeL = campo.largura / 2;
      const metadeA = campo.altura / 2;
      x = LIMITES.direita - LIMITES.esquerda <= campo.largura ? MUNDO.largura / 2 : limitar(x, LIMITES.esquerda + metadeL, LIMITES.direita - metadeL);
      y = limitar(y, LIMITES.topo + metadeA, LIMITES.base - metadeA);
      return { x, y };
    };

    const desenhar = () => {
      const p = tl ? tl.progress() : 0;
      const s = percurso(p);
      const noMundo = pontoNaEstrada(s);
      const ang = direcao(s);
      caminhao.setAttribute("transform", `translate(${noMundo.x.toFixed(2)} ${noMundo.y.toFixed(2)})`);
      giro.setAttribute("transform", `rotate(${((ang * 180) / Math.PI).toFixed(2)})`);
      rota.style.strokeDashoffset = String(1 - s);

      const camera = posicaoDaCamera(p, noMundo);
      svg.setAttribute(
        "viewBox",
        `${(camera.x - campo.largura / 2).toFixed(2)} ${(camera.y - campo.altura / 2).toFixed(2)} ${campo.largura.toFixed(2)} ${campo.altura.toFixed(2)}`,
      );

      const k = cenaDe(p);
      if (k !== cenaAtual) {
        cenaAtual = k;
        aoMudarCena(k);
      }
    };

    const medir = () => {
      const r = quadro.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const largo = r.width >= 900;
      const c = largo ? CAMPO.largo : CAMPO.estreito;
      campo.altura = Math.max(c.altura, c.larguraMinima ? (c.larguraMinima * r.height) / r.width : 0);
      campo.largura = (campo.altura * r.width) / r.height;
      campo.alvoX = c.alvoX;
      campo.alvoY = c.alvoY;
      // em telas estreitas a câmera acompanha mais as curvas
      campo.seguirX = limitar((1400 - campo.largura) / 1000, 0.3, 0.9);
      // o caminhão nunca entra na área do texto: à esquerda no computador,
      // no topo no celular
      const narrativa = textos.current.getBoundingClientRect();
      campo.margemEsquerda = largo ? Math.max(0.12, (narrativa.right - r.left + 70) / r.width) : 0.12;
      campo.margemTopo = largo ? 0.12 : 0.44;
      const cor = corDaProximaSecao(rolagem.current.closest("section"));
      if (cor) quadro.style.setProperty("--jx-saida", cor);
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

      // Convite para rolar: some assim que a jornada começa
      tl.to(convite, { autoAlpha: 0, y: 12, duration: 0.03 }, 0.005);

      // Textos: uma cena por vez, sobre o cenário
      gsap.set(blocos, { autoAlpha: 0, y: 24 });
      gsap.set(blocos[0], { autoAlpha: 1, y: 0 });
      CENAS.slice(1).forEach((inicio, i) => {
        tl.to(blocos[i], { autoAlpha: 0, y: -24, duration: 0.025 }, inicio - 0.03)
          .to(blocos[i + 1], { autoAlpha: 1, y: 0, duration: 0.03 }, inicio - 0.008);
      });

      // Caixas: saem da porta da fornecedora e entram na caçamba; no fim saem
      // da caçamba para a porta da solicitante. Coordenadas do caminhão.
      const angInicio = direcao(0);
      const angFim = direcao(1);
      caixas.forEach((caixa, i) => {
        const [vx, vy] = VAGAS[i];
        const daPorta = paraOCaminhao(FORNECEDORA.porta.x - INICIO.x, FORNECEDORA.porta.y - INICIO.y, angInicio);
        const paraPorta = paraOCaminhao(SOLICITANTE.porta.x - FIM.x, SOLICITANTE.porta.y - FIM.y, angFim);
        gsap.set(caixa, { x: daPorta.x - vx, y: daPorta.y - vy, autoAlpha: 0 });
        tl.to(caixa, { autoAlpha: 1, duration: 0.008 }, 0.025 + i * 0.03)
          .to(caixa, { x: 0, y: 0, duration: 0.04, ease: "power1.inOut" }, 0.03 + i * 0.03)
          .to(caixa, { x: paraPorta.x - vx, y: paraPorta.y - vy, duration: 0.026, ease: "power1.inOut" }, CHEGADA + 0.008 + i * 0.012)
          .to(caixa, { autoAlpha: 0, duration: 0.008 }, CHEGADA + 0.03 + i * 0.012);
      });

      // Entrega concluída
      gsap.set(entregue, { autoAlpha: 0, scale: 0.5, transformOrigin: "50% 50%" });
      tl.to(entregue, { autoAlpha: 1, scale: 1, duration: 0.024, ease: "back.out(2)" }, ENTREGUE - 0.024);

      // Saída (0,93 a 1): a camada ganha a cor da seção seguinte enquanto o
      // cenário sobe um pouco; o texto sai por último. Tudo pela rolagem,
      // então volta ao contrário quando se rola para cima.
      tl.fromTo(saida.current, { opacity: 0 }, { opacity: 1, duration: 1 - SAIDA, ease: "power1.inOut" }, SAIDA)
        .fromTo(svg, { y: 0 }, { y: -28, duration: 1 - SAIDA, ease: "power1.in" }, SAIDA)
        .to(textos.current, { autoAlpha: 0, y: -12, duration: 0.03, ease: "power1.in" }, 0.965);

      // duração total exatamente 1: o tempo da timeline é o progresso
      tl.set({}, {}, 1);
      tl.progress(tl.scrollTrigger.progress);
    });

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(quadro);
    // fontes e a volta do modo estático mudam alturas acima: recalcula
    let vivo = true;
    document.fonts?.ready.then(() => { if (vivo) ScrollTrigger.refresh(); });
    const proximo = requestAnimationFrame(() => { if (vivo) ScrollTrigger.refresh(); });

    return () => {
      vivo = false;
      cancelAnimationFrame(proximo);
      observador.disconnect();
      ctx.revert();
      // devolve o estado final, que é o que aparece sem animação
      svg.setAttribute("viewBox", `0 0 ${MUNDO.largura} ${MUNDO.altura}`);
      caminhao.setAttribute("transform", `translate(${FIM.x} ${FIM.y})`);
      giro.setAttribute("transform", "rotate(90)");
      rota.style.strokeDashoffset = "";
    };
  }, [rolagem, palco, mundo, textos, indicador, saida, ativo, aoMudarCena]);
}
