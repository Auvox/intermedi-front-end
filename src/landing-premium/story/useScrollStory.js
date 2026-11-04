import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const TOTAL_ETAPAS = 8;
// A etapa k ocupa o trecho [k - 0.5, k + 0.5) da timeline: transição na
// primeira metade, tempo de leitura na segunda. Ela passa a contar como
// atual um pouco antes do fim da transição.
const VIRA_ETAPA = 0.35;
const DURACAO = TOTAL_ETAPAS - 1 + 0.6;

// Monta a timeline da narrativa presa à rolagem do contêiner alto `rolagem`.
// A posição da rolagem é a fonte da verdade: scrub para frente e para trás,
// nada de timers. `aoMudarEtapa` só é chamado quando a etapa muda.
export function useScrollStory({ raiz, rolagem, historia, ativo, aoMudarEtapa }) {
  useLayoutEffect(() => {
    if (!ativo) return undefined;
    const root = raiz.current;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ largo: "(min-width: 900px)", estreito: "(max-width: 899.98px)" }, (contexto) => {
        const { largo } = contexto.conditions;
        const um = (nome) => root.querySelector(`[data-story="${nome}"]`);
        const todos = (nome) => gsap.utils.toArray(root.querySelectorAll(`[data-story="${nome}"]`));

        const textos = todos("texto");
        const redeOutras = todos("rede-outra");
        const [redeSol, redeForn, redeLinhas] = [um("rede-sol"), um("rede-forn"), um("rede-linhas")];
        const [cardSol, cardForn] = [um("card-sol"), um("card-forn")];
        const [numSol, numForn] = [um("num-sol"), um("num-forn")];
        const [barraSol, barraForn] = [um("barra-sol"), um("barra-forn")];
        const [avisoSol, avisoOkSol] = [um("aviso-sol"), um("aviso-ok-sol")];
        const [okSol, okForn] = [um("ok-sol"), um("ok-forn")];
        const trilho = um("trilho");
        const [linhaPedido, linhaEnvio] = [um("linha-pedido"), um("linha-envio")];
        const [gerente, gerenteOk] = [um("gerente"), um("gerente-ok")];
        const [chamado, chamadoA, chamadoB, caixa] = [um("chamado"), um("chamado-a"), um("chamado-b"), um("caixa")];
        const [rotuloPedido, rotuloEnvio] = [um("rotulo-pedido"), um("rotulo-envio")];
        const [preparo, preparoBarra] = [um("preparo"), um("preparo-barra")];
        const resultado = um("resultado");
        const progresso = um("progresso");

        // No computador o trilho é horizontal; no celular, vertical
        const eixo = largo ? "x" : "y";
        const desenha = largo ? "scaleX" : "scaleY";
        const tamanho = (el) => (largo ? el.offsetWidth : el.offsetHeight);
        const comprimento = () => (largo ? trilho.clientWidth : trilho.clientHeight);
        // o chamado parte do começo do trilho; a caixa parte do fim (CSS)
        const meioDoChamado = () => comprimento() / 2 - tamanho(chamado) / 2;
        const fimDoChamado = () => comprimento() - tamanho(chamado);
        const inicioDaCaixa = () => -(comprimento() - tamanho(caixa));

        const { solicitante: sol, fornecedora: forn, escala } = historia;
        // Números por interpolação determinística: a timeline anima este
        // objeto e o texto é reescrito a partir dele, nos dois sentidos.
        const valores = { sol: sol.inicial, forn: forn.inicial };
        const escrever = () => {
          numSol.textContent = String(Math.round(valores.sol));
          numForn.textContent = String(Math.round(valores.forn));
        };

        // Estado da etapa 0
        gsap.set(textos, { autoAlpha: 0, y: 24 });
        gsap.set(textos[0], { autoAlpha: 1, y: 0 });
        gsap.set([cardSol, cardForn], { autoAlpha: 0, y: 36 });
        gsap.set(cardForn, { scale: 0.94 });
        gsap.set([barraSol, barraForn, preparoBarra, progresso], { scaleX: 0 });
        gsap.set([linhaPedido, linhaEnvio], { [desenha]: 0 });
        gsap.set([chamado, caixa, gerente, rotuloPedido, rotuloEnvio, okSol, okForn, resultado, preparo, avisoSol, avisoOkSol, chamadoB], { autoAlpha: 0 });
        gsap.set(gerenteOk, { autoAlpha: 0, scale: 0.4 });
        gsap.set([chamado, caixa], { x: 0, y: 0 });
        escrever();

        let atual = -1;
        let tl = null;
        // Etapa e números a partir do tempo da timeline. Também é chamado depois
        // de saltos (criação, refresh), em que o GSAP não dispara callbacks.
        const sincronizar = () => {
          if (!tl) return;
          const t = tl.time();
          let k = 0;
          for (let i = 1; i < TOTAL_ETAPAS; i += 1) if (t >= i - VIRA_ETAPA) k = i;
          if (k !== atual) {
            atual = k;
            aoMudarEtapa(k);
          }
        };
        tl = gsap.timeline({
          defaults: { duration: 0.3, ease: "power2.out" },
          onUpdate: sincronizar,
          scrollTrigger: {
            trigger: rolagem.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            invalidateOnRefresh: true,
            onRefresh: () => { sincronizar(); escrever(); },
          },
        });

        // Linha de progresso contínua, do começo ao fim
        tl.to(progresso, { scaleX: 1, ease: "none", duration: TOTAL_ETAPAS - 1 }, 0);

        // Texto narrativo: um bloco por etapa, sempre no mesmo lugar
        for (let k = 1; k < TOTAL_ETAPAS; k += 1) {
          tl.to(textos[k - 1], { autoAlpha: 0, y: -24, duration: 0.2 }, k - 0.5)
            .to(textos[k], { autoAlpha: 1, y: 0, duration: 0.3 }, k - 0.38);
        }

        // 1 · Necessidade: a rede recua e a solicitante aparece com o estoque baixo
        tl.to(redeOutras, { autoAlpha: 0.25, scale: 0.9 }, 0.5)
          .to(redeLinhas, { autoAlpha: 0.35 }, 0.5)
          .to(redeSol, { autoAlpha: 0, scale: 0.8, duration: 0.2 }, 0.55)
          .to(cardSol, { autoAlpha: 1, y: 0, duration: 0.35 }, 0.6)
          .to(barraSol, { scaleX: sol.inicial / escala }, 0.78)
          .to(avisoSol, { autoAlpha: 1, duration: 0.2 }, 0.88);

        // 2 · Conexão: a fornecedora entra e a ligação é desenhada
        tl.to([redeOutras, redeLinhas], { autoAlpha: 0, duration: 0.2 }, 1.5)
          .to(redeForn, { autoAlpha: 0, scale: 0.8, duration: 0.2 }, 1.52)
          .to(cardForn, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4 }, 1.55)
          .to(barraForn, { scaleX: forn.inicial / escala }, 1.72)
          .to(linhaPedido, { [desenha]: 1, ease: "none", duration: 0.3 }, 1.7);

        // 3 · Chamado: sai da solicitante e para no gerente da unidade
        tl.to(gerente, { autoAlpha: 1, duration: 0.2 }, 2.5)
          .to([rotuloPedido, chamado], { autoAlpha: 1, duration: 0.15 }, 2.55)
          .to(chamado, { [eixo]: meioDoChamado, ease: "power1.inOut", duration: 0.35 }, 2.62);

        // 4 · Aprovação: o gerente aceita e o pedido segue para a fornecedora
        tl.to(gerenteOk, { autoAlpha: 1, scale: 1, ease: "back.out(2)", duration: 0.2 }, 3.5)
          .to(chamadoA, { autoAlpha: 0, duration: 0.12 }, 3.55)
          .to(chamadoB, { autoAlpha: 1, duration: 0.12 }, 3.6)
          .to(chamado, { [eixo]: fimDoChamado, ease: "power1.inOut", duration: 0.32 }, 3.66);

        // 5 · Preparação: a fornecedora aceita, separa as unidades e prepara
        tl.to([chamado, rotuloPedido], { autoAlpha: 0, duration: 0.18 }, 4.5)
          .to(cardForn, { scale: 1.03, duration: 0.18 }, 4.5)
          .to(cardForn, { scale: 1, duration: 0.22 }, 4.72)
          .to(preparo, { autoAlpha: 1, duration: 0.2 }, 4.55)
          .to(preparoBarra, { scaleX: 1, ease: "none", duration: 0.4 }, 4.6)
          .to(valores, { forn: forn.final, ease: "none", duration: 0.32, onUpdate: escrever }, 4.62)
          .to(barraForn, { scaleX: forn.final / escala, duration: 0.32 }, 4.62)
          .to(caixa, { autoAlpha: 1, duration: 0.15 }, 4.82);

        // 6 · Entrega: a caixa volta pelo trilho e o estoque da solicitante sobe
        tl.to([gerente, preparo], { autoAlpha: 0, duration: 0.18 }, 5.5)
          .to(rotuloEnvio, { autoAlpha: 1, duration: 0.15 }, 5.5)
          .to(caixa, { [eixo]: inicioDaCaixa, ease: "power1.inOut", duration: 0.42 }, 5.55)
          .to(linhaEnvio, { [desenha]: 1, ease: "power1.inOut", duration: 0.42 }, 5.55)
          .to(valores, { sol: sol.final, ease: "none", duration: 0.25, onUpdate: escrever }, 5.94)
          .to(barraSol, { scaleX: sol.final / escala, duration: 0.25 }, 5.94)
          .to(avisoSol, { autoAlpha: 0, duration: 0.15 }, 5.98)
          .to(avisoOkSol, { autoAlpha: 1, duration: 0.2 }, 6.05);

        // 7 · Conclusão: selos de concluído e o resultado
        tl.to([caixa, rotuloEnvio], { autoAlpha: 0, duration: 0.18 }, 6.5)
          .to([okSol, okForn], { autoAlpha: 1, duration: 0.25, stagger: 0.06 }, 6.55)
          .to(resultado, { autoAlpha: 1, duration: 0.3 }, 6.62)
          .to({}, { duration: DURACAO - 6.92 }, 6.92);

        // Ao montar no meio da seção (recarregar, trocar o remédio), entra já na posição certa
        tl.progress(tl.scrollTrigger.progress);
        sincronizar();
        escrever();
      });

      // O título sobe linha a linha enquanto a seção chega
      gsap.fromTo(root.querySelectorAll('[data-story="titulo-linha"]'), { yPercent: 105 }, {
        yPercent: 0,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: { trigger: rolagem.current, start: "top 90%", end: "top 30%", scrub: 0.5 },
      });
    }, root);
    // as fontes mudam a altura das seções de cima; recalcula as posições quando chegam
    let vivo = true;
    document.fonts?.ready.then(() => { if (vivo) ScrollTrigger.refresh(); });
    return () => {
      vivo = false;
      ctx.revert();
    };
  }, [raiz, rolagem, historia, ativo, aoMudarEtapa]);
}
