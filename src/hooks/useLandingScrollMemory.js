import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const CHAVE = "intermedi:landing-y";

// Lembra até onde o visitante rolou a landing. Ao voltar do login (o login
// navega com state.voltarDoLogin), a página reabre nesse ponto em vez de
// recomeçar do topo. A posição é guardada a cada rolagem, porque ao trocar
// de rota o documento encolhe antes da limpeza do efeito.
//
// Na volta, a landing fica invisível (data-lp-volta="espera") até a rolagem
// ser restaurada, e então aparece num fade único (data-lp-volta="entra").
// Assim o visitante nunca vê o texto no topo, o salto de rolagem nem as
// entradas de bloco disparando atrás do fade. Quando tudo está no lugar, a
// raiz recebe o evento "lp:retomado" (o useLandingReveal escuta).
export default function useLandingScrollMemory(rootRef) {
  const location = useLocation();
  const voltando = Boolean(location.state?.voltarDoLogin);

  useEffect(() => {
    let quadro;
    const guardar = () => {
      quadro = undefined;
      // a landing já saiu do DOM: essa rolagem é o documento encolhendo no login
      if (!document.querySelector(".lp-root")) return;
      try { sessionStorage.setItem(CHAVE, String(Math.round(window.scrollY))); } catch { /* sem armazenamento: só não lembra */ }
    };
    const agendar = () => { if (quadro === undefined) quadro = requestAnimationFrame(guardar); };
    window.addEventListener("scroll", agendar, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", agendar);
    };
  }, []);

  // layout effect: roda antes da primeira pintura, então a landing nunca aparece "crua"
  useLayoutEffect(() => {
    const raiz = rootRef?.current;
    if (!voltando || !raiz) return undefined;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let y = 0;
    try { y = Number(sessionStorage.getItem(CHAVE)) || 0; } catch { /* sem armazenamento */ }

    let concluido = false;
    let quadro1;
    let quadro2;
    let limite;
    let fim;
    const aplicar = () => { if (y) window.scrollTo({ top: y, behavior: "instant" }); };
    const concluir = () => {
      if (concluido) return;
      concluido = true;
      aplicar();
      raiz.dispatchEvent(new CustomEvent("lp:retomado"));
      if (reduzido) { delete raiz.dataset.lpVolta; return; }
      raiz.dataset.lpVolta = "entra";
      fim = window.setTimeout(() => { delete raiz.dataset.lpVolta; }, 560);
    };

    if (reduzido) {
      concluir();
    } else {
      raiz.dataset.lpVolta = "espera";
      aplicar();
      // dois quadros: as seções já têm altura quando a rolagem é aplicada de novo
      quadro1 = requestAnimationFrame(() => {
        aplicar();
        quadro2 = requestAnimationFrame(concluir);
      });
      // rede de segurança: se a aba estiver em segundo plano, os quadros não rodam
      limite = window.setTimeout(concluir, 400);
    }
    return () => {
      cancelAnimationFrame(quadro1);
      cancelAnimationFrame(quadro2);
      window.clearTimeout(limite);
      window.clearTimeout(fim);
      delete raiz.dataset.lpVolta;
    };
  }, [voltando, rootRef]);
}
