import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const CHAVE = "intermedi:landing-y";

// Lembra até onde o visitante rolou a landing. Ao voltar do login (o login
// navega com state.voltarDoLogin), a página reabre nesse ponto em vez de
// recomeçar do topo. A posição é guardada a cada rolagem, porque ao trocar
// de rota o documento encolhe antes da limpeza do efeito.
export default function useLandingScrollMemory() {
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

  useEffect(() => {
    if (!voltando) return undefined;
    let y = 0;
    try { y = Number(sessionStorage.getItem(CHAVE)) || 0; } catch { /* sem armazenamento */ }
    if (!y) return undefined;
    // dois quadros: as seções já têm altura quando a rolagem é aplicada
    let segundo;
    const primeiro = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
    });
    return () => { cancelAnimationFrame(primeiro); cancelAnimationFrame(segundo); };
  }, [voltando]);
}
