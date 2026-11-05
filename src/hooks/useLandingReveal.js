import { useEffect } from "react";

// Entradas da landing: cada bloco aparece quando chega na tela, em cascata
// dentro da sua seção. Títulos sobem de dentro de uma máscara; textos e
// cartões sobem e aparecem. Os blocos são achados pelos seletores abaixo,
// então as seções não precisam saber disso. O Matches (MapSection) tem a
// sua própria entrada (.reveal), e o problema e a jornada também.
const BLOCOS = [
  [".lp-hero-title, .lp-section-title, .lp-footer-intro h2", "titulo"],
  [".lp-hero-sub, .lp-hero-actions, .hero-signature, .lp-section-sub, .lp-footer-intro > :not(h2)", "texto"],
  [".lp-hero-visual, .benefit-card, .journey-stop, .partner-card, .lp-footer-brand, .lp-footer-col, .lp-footer-panel", "bloco"],
];
const SECOES = ".lp-hero, .lp-section, .lp-footer";

export default function useLandingReveal(rootRef, ativo = true) {
  useEffect(() => {
    const raiz = rootRef.current;
    if (!raiz) return undefined;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ativo || reduzido) return undefined;

    const marcados = [];
    for (const [seletor, tipo] of BLOCOS) {
      raiz.querySelectorAll(seletor).forEach((el) => {
        el.dataset.lpEntra = tipo;
        marcados.push(el);
      });
    }
    // ordem de entrada dentro de cada seção, na ordem do documento
    raiz.querySelectorAll(SECOES).forEach((secao) => {
      secao.querySelectorAll("[data-lp-entra]").forEach((el, i) => {
        el.style.setProperty("--lp-i", String(Math.min(i, 6)));
      });
    });
    // atributo, não classe: o React reescreve a className da raiz
    raiz.dataset.lpAnima = "";

    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        // atributo, não classe: cartões como o benefit-card trocam de className no hover
        entrada.target.dataset.lpVisto = "";
        observador.unobserve(entrada.target);
      }
    }, { rootMargin: "0px 0px -12% 0px" });
    marcados.forEach((el) => observador.observe(el));

    return () => {
      observador.disconnect();
      delete raiz.dataset.lpAnima;
      marcados.forEach((el) => {
        delete el.dataset.lpVisto;
        delete el.dataset.lpEntra;
        el.style.removeProperty("--lp-i");
      });
    };
  }, [rootRef, ativo]);
}
