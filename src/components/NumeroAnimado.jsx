import { useEffect, useRef, useState } from "react";

const DURACAO = 700;
const suavizar = (t) => 1 - (1 - t) ** 3;

function movimentoReduzido(el) {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    Boolean(el?.closest(".a11y-motion"))
  );
}

// Número de métrica que conta até o valor quando chega (e quando muda).
// Valores que não são número (ex.: "—") aparecem como vieram.
export default function NumeroAnimado({ valor }) {
  const alvo = typeof valor === "number" && Number.isFinite(valor) ? valor : null;
  const ref = useRef(null);
  const atual = useRef(0);
  const [exibido, setExibido] = useState(0);

  useEffect(() => {
    if (alvo === null) return undefined;
    const inicio = atual.current;
    // Com movimento reduzido o valor final aparece já no primeiro quadro
    const duracao = movimentoReduzido(ref.current) ? 0 : DURACAO;
    let quadro;
    const comeco = performance.now();
    const passo = (agora) => {
      const t = duracao ? Math.min(1, (agora - comeco) / duracao) : 1;
      const v = Math.round(inicio + (alvo - inicio) * suavizar(t));
      atual.current = v;
      setExibido(v);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo]);

  if (alvo === null) return valor;
  return (
    <span ref={ref}>
      {/* leitores de tela recebem só o valor final */}
      <span aria-hidden="true">{exibido.toLocaleString("pt-BR")}</span>
      <span className="skel-sr">{alvo.toLocaleString("pt-BR")}</span>
    </span>
  );
}
