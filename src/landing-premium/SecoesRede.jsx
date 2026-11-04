import { useRef } from "react";
import { MotionContext, usePrefersReducedMotion, useReveal } from "./hooks";
import Problema from "./sections/Problema";
import JornadaEntrega from "./jornada/JornadaEntrega";
import "./secoes.css";

// "Falta aqui. Sobra ali." e a jornada da entrega ("Uma rede, não uma ilha."),
// vindas da landing premium. Sem movimento (sistema ou "Parar animações" do
// menu de acessibilidade), as duas aparecem paradas e completas.
export default function SecoesRede({ paused = false }) {
  const raiz = useRef(null);
  const reduzido = usePrefersReducedMotion();
  const movimento = !reduzido && !paused;

  useReveal(raiz, movimento);

  return (
    <MotionContext.Provider value={movimento}>
      <div ref={raiz} className={`lpx${paused ? " a11y-motion" : ""}`}>
        <Problema />
        <JornadaEntrega />
      </div>
    </MotionContext.Provider>
  );
}
