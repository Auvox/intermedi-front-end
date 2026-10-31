import { useCallback, useRef, useState } from "react";
import { papeis, telas } from "../content";
import { useMediaQuery, useMotion, useScrollProgress } from "../hooks";
import { Escala, TelaDesempenho, TelaOperacao, TelaPainel, TelaRelatorio, TelaSolicitar } from "../ui/Plataforma";
import { IconePapel } from "./Recursos";
import videoOperacao from "../assets/media/operacao-3d.mp4";
import posterOperacao from "../assets/media/operacao-3d-poster.jpg";

// Fração da rolagem fixa gasta para a tela crescer até ocupar a janela;
// o resto passa pelas telas, uma de cada vez.
const CRESCER = 0.22;
const LARGURA = 1280;
const ALTURA = 800;

function Tela({ id, ativa, movimento }) {
  if (id === "painel") return <TelaPainel />;
  if (id === "relatorio") return <TelaRelatorio />;
  if (id === "solicitar") return <TelaSolicitar />;
  if (id === "operacao") return <TelaOperacao video={videoOperacao} poster={posterOperacao} tocar={ativa && movimento} />;
  return <TelaDesempenho />;
}

// Demonstração: a plataforma recriada em HTML cresce com a rolagem até ocupar
// a janela e passa pelas telas de cada papel, cada uma com uma legenda que
// diz o que ela é. As abas trocam a tela na hora.
export default function Demonstracao() {
  const fixa = useRef(null);
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
    setAtual(i);
    if (!comCena) return;
    const el = fixa.current;
    const curso = el.offsetHeight - window.innerHeight;
    const alvo = CRESCER + ((i + 0.5) / telas.length) * (1 - CRESCER);
    const topo = el.getBoundingClientRect().top + window.scrollY;
    window.dispatchEvent(new CustomEvent("lpx:rolar", { detail: topo + curso * alvo }));
  }

  const tela = telas[atual];
  const papel = papeis[tela.papel];

  return (
    <section id="plataforma" className="lpx-demo lpx-fundo-paper" data-fundo="paper" aria-labelledby="demo-titulo">
      <div className="lpx-demo-intro">
        <h2 id="demo-titulo" className="lpx-h2" data-reveal>A plataforma, por dentro.</h2>
        <p className="lpx-corpo" data-reveal style={{ "--d": 1 }}>
          As telas das três plataformas, com os dados da base de demonstração. Role para abrir, ou escolha uma tela.
        </p>
      </div>

      <div ref={fixa} className={`lpx-demo-fixa${comCena ? " is-cena" : ""}`}>
        <div className="lpx-demo-palco">
          <div className="lpx-demo-janela">
            {telas.map((t, i) => (
              <div key={t.id} className={`lpx-demo-tela${i === atual ? " is-atual" : ""}`} inert>
                <Escala largura={LARGURA} altura={ALTURA} preencher={comCena}>
                  <Tela id={t.id} ativa={i === atual} movimento={movimento} />
                </Escala>
              </div>
            ))}
          </div>
          <div key={tela.id} className="lpx-demo-legenda" aria-live="polite">
            <p className={`lpx-chip-papel lpx-cor-${papel.cor}`}><IconePapel papel={tela.papel} />{papel.nome} · {tela.nome}</p>
            <p className="lpx-demo-legenda-titulo">{tela.titulo}</p>
            <p className="lpx-demo-legenda-frase">{tela.frase}</p>
          </div>
          <div className="lpx-demo-abas" role="group" aria-label="Telas da plataforma">
            {telas.map((t, i) => (
              <button key={t.id} type="button" aria-pressed={i === atual} onClick={() => escolher(i)}>
                <span>{t.nome}</span>
                <small>{papeis[t.papel].nome}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
