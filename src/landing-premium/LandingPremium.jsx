import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AccessibilityMenu from "../components/layout/AccessibilityMenu";
import useAccessibility from "../hooks/useAccessibility";
import { MotionContext, usePrefersReducedMotion, useReveal } from "./hooks";
import PremiumNav from "./components/PremiumNav";
import Hero from "./sections/Hero";
import Problema from "./sections/Problema";
import JornadaEntrega from "./jornada/JornadaEntrega";
import ComoFunciona from "./sections/ComoFunciona";
import Recursos from "./sections/Recursos";
import Demonstracao from "./sections/Demonstracao";
import ChamadaFinal from "./sections/ChamadaFinal";
import Rodape from "./sections/Rodape";
import "./estilos.css";

// Landing page premium: uma história em capítulos de cor. Cada seção tem o
// seu fundo (data-fundo) e a barra de navegação veste o capítulo atual.
export default function LandingPremium() {
  const rootRef = useRef(null);
  const { preferences, toggle, reset } = useAccessibility(rootRef);
  const reduzido = usePrefersReducedMotion();
  const movimento = !reduzido && !preferences.motion;
  const [capitulo, setCapitulo] = useState({ id: "inicio", fundo: "ink" });

  useReveal(rootRef, movimento);

  useEffect(() => {
    document.title = "Intermedi | Interligando medicamentos";
  }, []);

  // Rolagem suave (Lenis) só com movimento permitido; os links de âncora e o
  // pedido "lpx:rolar" (abas da demonstração) passam por ela.
  useEffect(() => {
    if (!movimento) {
      const rolar = (event) => window.scrollTo({ top: event.detail });
      window.addEventListener("lpx:rolar", rolar);
      return () => window.removeEventListener("lpx:rolar", rolar);
    }
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      anchors: { offset: -64 },
      allowNestedScroll: true,
      // o menu de acessibilidade rola por conta própria
      prevent: (node) => Boolean(node.closest?.(".accessibility-panel")),
    });
    // a narrativa do remanejamento (GSAP ScrollTrigger) acompanha cada passo da Lenis
    lenis.on("scroll", ScrollTrigger.update);
    const rolar = (event) => lenis.scrollTo(event.detail, { duration: 1.2 });
    window.addEventListener("lpx:rolar", rolar);
    return () => {
      window.removeEventListener("lpx:rolar", rolar);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, [movimento]);

  // Capítulo atual = a seção que cruza a faixa logo abaixo da barra
  useEffect(() => {
    const secoes = Array.from(rootRef.current.querySelectorAll("[data-fundo]"));
    const observador = new IntersectionObserver((entradas) => {
      const atual = entradas.filter((e) => e.isIntersecting).at(-1);
      if (atual) setCapitulo({ id: atual.target.id, fundo: atual.target.dataset.fundo });
    }, { rootMargin: "-32px 0px -94% 0px" });
    secoes.forEach((secao) => observador.observe(secao));
    return () => observador.disconnect();
  }, []);

  const classesA11y = Object.keys(preferences).filter((key) => preferences[key]).map((key) => `a11y-${key}`).join(" ");

  return (
    <MotionContext.Provider value={movimento}>
      <div ref={rootRef} className={`lpx ${classesA11y}`}>
        <a className="lpx-skip" href="#conteudo">Pular para o conteúdo</a>
        <AccessibilityMenu preferences={preferences} onChange={toggle} onReset={reset} />
        <PremiumNav capitulo={capitulo} />
        <main id="conteudo">
          <Hero />
          <Problema />
          <JornadaEntrega />
          <ComoFunciona />
          <Recursos />
          <Demonstracao />
          <ChamadaFinal />
        </main>
        <Rodape />
      </div>
    </MotionContext.Provider>
  );
}
