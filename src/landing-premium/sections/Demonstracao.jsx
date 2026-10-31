import { useCallback, useEffect, useRef, useState } from "react";
import { telas } from "../content";
import { useMediaQuery, useMotion, useScrollProgress } from "../hooks";

// Fração da rolagem fixa gasta para a tela crescer até ocupar a janela;
// o resto passa pelas telas, uma de cada vez.
const CRESCER = 0.3;

// Demonstração: uma tela da plataforma que cresce com a rolagem até ocupar a
// janela inteira e depois passa pelas telas reais (gerente, funcionário,
// admin, Operação 3D). As abas trocam a tela na hora.
export default function Demonstracao() {
  const fixa = useRef(null);
  const video = useRef(null);
  const movimento = useMotion();
  const largo = useMediaQuery("(min-width: 900px)");
  const comCena = movimento && largo;
  const [atual, setAtual] = useState(0);

  const aoRolar = useCallback((p) => {
    const passo = Math.max(0, p - CRESCER) / (1 - CRESCER);
    setAtual(Math.min(telas.length - 1, Math.floor(passo * telas.length)));
  }, []);
  useScrollProgress(fixa, { modo: "pin", ativo: comCena, repouso: 1, aoMudar: comCena ? aoRolar : undefined });

  // Com a cena, clicar numa aba leva a rolagem até a vez daquela tela
  function escolher(i) {
    if (!comCena) { setAtual(i); return; }
    const el = fixa.current;
    const curso = el.offsetHeight - window.innerHeight;
    const alvo = CRESCER + ((i + 0.5) / telas.length) * (1 - CRESCER);
    const topo = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: topo + curso * alvo, behavior: "smooth" });
    setAtual(i);
  }

  const tela = telas[atual];

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (movimento) v.play().catch(() => {});
    else v.pause();
  }, [tela, movimento]);

  return (
    <section id="plataforma" className="lpx-demo lpx-fundo-paper" data-fundo="paper" aria-labelledby="demo-titulo">
      <div className="lpx-demo-intro">
        <h2 id="demo-titulo" className="lpx-h2" data-reveal>A plataforma, por dentro.</h2>
        <p className="lpx-corpo" data-reveal style={{ "--d": 1 }}>
          Telas reais do Intermedi nas três plataformas, com os dados da base de demonstração. Role para abrir, ou
          escolha uma tela.
        </p>
      </div>

      <div ref={fixa} className={`lpx-demo-fixa${comCena ? " is-cena" : ""}`}>
        <div className="lpx-demo-palco">
          <div className="lpx-demo-janela">
            {telas.map((t, i) => (
              t.video ? (
                <video
                  key={t.id}
                  ref={i === atual ? video : undefined}
                  className={`lpx-demo-midia${i === atual ? " is-atual" : ""}`}
                  src={i === atual ? t.video : undefined}
                  poster={t.src}
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-label={t.alt}
                  controls={!movimento}
                />
              ) : (
                <img
                  key={t.id}
                  className={`lpx-demo-midia${i === atual ? " is-atual" : ""}`}
                  style={t.posicao ? { objectPosition: t.posicao } : undefined}
                  src={t.src}
                  alt={i === atual ? t.alt : ""}
                  width="1440"
                  height="900"
                  loading="lazy"
                  decoding="async"
                />
              )
            ))}
          </div>
          <div className="lpx-demo-abas" role="group" aria-label="Telas da plataforma">
            {telas.map((t, i) => (
              <button key={t.id} type="button" aria-pressed={i === atual} onClick={() => escolher(i)}>
                <span>{t.nome}</span>
                <small>{t.papel}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
