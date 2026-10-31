import { useEffect, useRef, useState } from "react";
import { farmacias, ligacoes, simulacoes } from "../content";
import { useMotion, useScrollProgress } from "../hooks";

const porId = Object.fromEntries(farmacias.map((f) => [f.id, f]));

// A solução: a rede de farmácias num plano inclinado em 3D. As ligações se
// desenham com a rolagem; escolher um remédio mostra o pedido saindo de quem
// tem e chegando a quem precisa.
export default function Solucao() {
  const ref = useRef(null);
  const ponto = useRef(null);
  const movimento = useMotion();
  const [escolha, setEscolha] = useState(0);
  const sim = simulacoes[escolha];
  const de = porId[sim.tem];
  const para = porId[sim.falta];
  useScrollProgress(ref, { ativo: movimento, repouso: 0.6 });

  // Caixa viajando de quem tem até quem precisa (só transform)
  useEffect(() => {
    const el = ponto.current;
    if (!el) return undefined;
    const plano = el.parentElement;
    const mover = (x, y) => {
      el.style.transform = `translate(${(x / 100) * plano.clientWidth}px, ${(y / 100) * plano.clientHeight}px)`;
    };
    if (!movimento) {
      mover(para.x, para.y);
      return undefined;
    }
    let quadro = null;
    let inicio;
    const duracao = 2600;
    // Só anima com a cena na tela
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting && quadro === null) quadro = requestAnimationFrame(passo);
      if (!entrada.isIntersecting) { cancelAnimationFrame(quadro); quadro = null; }
    });
    const passo = (agora) => {
      inicio ??= agora;
      const t = ((agora - inicio) % (duracao + 700)) / duracao;
      const k = Math.min(1, t);
      const suave = k * k * (3 - 2 * k);
      mover(de.x + (para.x - de.x) * suave, de.y + (para.y - de.y) * suave);
      quadro = requestAnimationFrame(passo);
    };
    observador.observe(plano);
    return () => { observador.disconnect(); cancelAnimationFrame(quadro); };
  }, [de, para, movimento]);

  return (
    <section ref={ref} id="solucao" className="lpx-solucao lpx-fundo-green" data-fundo="green" aria-labelledby="solucao-titulo">
      <div className="lpx-solucao-texto">
        <h2 id="solucao-titulo" className="lpx-h2" data-reveal>Uma rede, não uma ilha.</h2>
        <p className="lpx-corpo" data-reveal style={{ "--d": 1 }}>
          O Intermedi liga as farmácias da rede em um só sistema. Cada unidade mostra o que tem em estoque. Quando falta
          um remédio, o gerente vê quem pode atender e faz o pedido ali mesmo. Quem tem envia, e todos acompanham até a
          entrega.
        </p>
        <fieldset className="lpx-sim" data-reveal style={{ "--d": 2 }}>
          <legend>Simulação: escolha o que faltou</legend>
          <div className="lpx-sim-opcoes">
            {simulacoes.map((s, i) => (
              <button
                key={s.remedio}
                type="button"
                aria-pressed={escolha === i}
                onClick={() => setEscolha(i)}
              >
                {s.remedio}
              </button>
            ))}
          </div>
          <p className="lpx-sim-resultado" aria-live="polite">
            <strong>{para.nome}</strong> pede {sim.quantidade} un. de {sim.remedio}. <strong>{de.nome}</strong> tem em estoque e envia.
          </p>
        </fieldset>
      </div>

      <div className="lpx-rede" aria-hidden="true">
        <div className="lpx-rede-plano">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="lpx-rede-linhas">
            {ligacoes.map(([a, b]) => (
              <line key={a + b} x1={porId[a].x} y1={porId[a].y} x2={porId[b].x} y2={porId[b].y} pathLength="1" />
            ))}
            <line
              key={sim.remedio}
              className="lpx-rede-rota"
              x1={de.x}
              y1={de.y}
              x2={para.x}
              y2={para.y}
              pathLength="1"
            />
          </svg>
          {farmacias.map((f) => {
            const estado = f.id === sim.falta ? "falta" : f.id === sim.tem ? "tem" : "";
            return (
              <div key={f.id} className={`lpx-no${estado ? ` is-${estado}` : ""}`} style={{ left: `${f.x}%`, top: `${f.y}%` }}>
                <span className="lpx-no-bloco"><i /><i /><i /></span>
                <span className="lpx-no-rotulo">
                  {f.nome}
                  {estado === "falta" && <em>Falta {sim.remedio}</em>}
                  {estado === "tem" && <em>Tem em estoque</em>}
                </span>
              </div>
            );
          })}
          <span ref={ponto} className="lpx-rede-caixa" />
        </div>
      </div>
    </section>
  );
}
