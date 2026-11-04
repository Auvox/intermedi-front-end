import { createContext, useContext, useEffect, useState } from "react";

// Movimento permitido? Falso com "reduzir movimento" do sistema ou com
// "Parar animações" do menu de acessibilidade (passado pelo contexto).
export const MotionContext = createContext(true);
export const useMotion = () => useContext(MotionContext);

export function usePrefersReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

// Um único laço de rolagem para a página toda. Cada elemento registrado
// recebe a variável CSS --p (0 a 1) e, se quiser, um callback.
//   enter: 0 quando o topo entra por baixo, 1 quando o fim sai por cima
//   pin:   0 a 1 enquanto a seção alta rola com o conteúdo fixo (sticky)
//   exit:  0 no início, 1 quando a seção inteira já passou do topo
const itens = new Set();
let quadro = null;

function progresso(item, alturaTela) {
  const caixa = item.el.getBoundingClientRect();
  if (item.modo === "pin") {
    const curso = caixa.height - alturaTela;
    return curso > 0 ? -caixa.top / curso : 0;
  }
  if (item.modo === "exit") return -caixa.top / Math.max(1, caixa.height);
  return (alturaTela - caixa.top) / (alturaTela + caixa.height);
}

function atualizar() {
  quadro = null;
  const alturaTela = window.innerHeight;
  for (const item of itens) {
    if (!item.visivel) continue;
    const p = Math.min(1, Math.max(0, progresso(item, alturaTela)));
    if (Math.abs(p - item.ultimo) < 0.0005) continue;
    item.ultimo = p;
    item.el.style.setProperty("--p", p.toFixed(4));
    item.aoMudar?.(p);
  }
}

function agendar() {
  if (quadro === null) quadro = requestAnimationFrame(atualizar);
}

export function useScrollProgress(ref, { modo = "enter", ativo = true, repouso = 1, aoMudar } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!ativo) {
      el.style.setProperty("--p", String(repouso));
      aoMudar?.(repouso);
      return undefined;
    }
    const item = { el, modo, visivel: true, ultimo: -1, aoMudar };
    const observador = new IntersectionObserver(([entrada]) => {
      item.visivel = entrada.isIntersecting;
      agendar();
    }, { rootMargin: "20% 0px" });
    observador.observe(el);
    if (itens.size === 0) {
      window.addEventListener("scroll", agendar, { passive: true });
      window.addEventListener("resize", agendar);
    }
    itens.add(item);
    agendar();
    return () => {
      observador.disconnect();
      itens.delete(item);
      if (itens.size === 0) {
        window.removeEventListener("scroll", agendar);
        window.removeEventListener("resize", agendar);
      }
    };
    // aoMudar costuma ser uma função nova a cada render; o registro não muda por ela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, modo, ativo, repouso]);
}

// Entrada das partes de cada seção: [data-reveal] ganha .is-in uma vez,
// quando a seção aparece. Sem script, nada fica escondido (o CSS só esconde
// dentro de .lpx-anima, classe posta aqui).
export function useReveal(ref, ativo = true) {
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz || !ativo) return undefined;
    raiz.classList.add("lpx-anima");
    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.classList.add("is-in");
        observador.unobserve(entrada.target);
      }
    }, { rootMargin: "0px 0px -12% 0px" });
    raiz.querySelectorAll("[data-reveal]").forEach((el) => observador.observe(el));
    return () => {
      observador.disconnect();
      raiz.classList.remove("lpx-anima");
    };
  }, [ref, ativo]);
}
