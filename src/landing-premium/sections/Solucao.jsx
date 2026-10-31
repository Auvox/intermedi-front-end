import { useEffect, useRef, useState } from "react";
import { farmacias, passosSimulacao, simulacoes } from "../content";
import { useMotion } from "../hooks";
import { Icone } from "../ui/Plataforma";

const ULTIMO = passosSimulacao.length;
const INTERVALO = 1300;

// Ficha de uma farmácia na simulação, com a barra do estoque e o mínimo
function FichaFarmacia({ papel, farmacia, remedio, quantidade, minimo, escala, selo, tom }) {
  return (
    <div className={`lpx-simf lpx-simf-${papel} is-${tom}`}>
      <p className="lpx-simf-papel">{papel === "precisa" ? "Precisa" : "Tem em estoque"}</p>
      <p className="lpx-simf-nome"><Icone nome="pharmacy" tamanho={18} />{farmacia.nome}</p>
      <p className="lpx-simf-bairro">{farmacia.bairro} · São Paulo</p>
      <p className="lpx-simf-qtd"><strong>{quantidade}</strong> un. de {remedio}</p>
      <span className="lpx-simf-barra">
        <i style={{ transform: `scaleX(${Math.min(1, quantidade / escala)})` }} />
        <b style={{ left: `${(minimo / escala) * 100}%` }} />
      </span>
      <p className="lpx-simf-rodape"><span>mínimo {minimo}</span><span className={`lpx-simf-selo is-${tom}`}>{selo}</span></p>
    </div>
  );
}

// A solução: uma simulação com faltas reais do estoque de demonstração.
// Quem precisa abre o chamado, o pedido vai para quem tem e a caixa volta.
export default function Solucao() {
  const ref = useRef(null);
  const movimento = useMotion();
  const [escolha, setEscolha] = useState(0);
  const [etapa, setPasso] = useState(0);
  const [rodada, setRodada] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const sim = simulacoes[escolha];
  // Sem movimento, a simulação já aparece concluída
  const passo = movimento ? etapa : ULTIMO;

  useEffect(() => {
    const observador = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.35 });
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, []);

  // Avança uma etapa por vez enquanto a simulação está na tela
  useEffect(() => {
    if (!movimento || !visivel || passo >= ULTIMO) return undefined;
    const t = setTimeout(() => setPasso((p) => p + 1), passo === 0 ? 500 : INTERVALO);
    return () => clearTimeout(t);
  }, [movimento, visivel, passo, rodada]);

  function escolher(i) {
    setEscolha(i);
    setPasso(0);
    setRodada((r) => r + 1);
  }

  const enviado = passo >= 3;
  const entregue = passo >= 4;
  const qtdPrecisa = sim.falta.tem + (entregue ? sim.pede : 0);
  const qtdTem = sim.envia.tem - (enviado ? sim.pede : 0);
  const escala = Math.max(sim.envia.tem, sim.falta.tem + sim.pede) * 1.08;
  const fase = passo >= 3 ? "volta" : passo >= 1 ? "ida" : "parado";

  return (
    <section ref={ref} id="solucao" className="lpx-solucao lpx-fundo-green" data-fundo="green" aria-labelledby="solucao-titulo">
      <div className="lpx-solucao-texto">
        <h2 id="solucao-titulo" className="lpx-h2" data-reveal>Uma rede, não uma ilha.</h2>
        <p className="lpx-corpo" data-reveal style={{ "--d": 1 }}>
          O Intermedi liga as farmácias da rede em um só sistema. Quando falta um remédio, o gerente vê quem tem e faz o
          pedido ali mesmo. Quem tem envia, e todos acompanham até a entrega.
        </p>
        <fieldset className="lpx-sim-escolha" data-reveal style={{ "--d": 2 }}>
          <legend>Faltas reais da base de demonstração. Escolha uma:</legend>
          <div className="lpx-sim-opcoes">
            {simulacoes.map((s, i) => (
              <button key={s.remedio} type="button" aria-pressed={escolha === i} onClick={() => escolher(i)}>
                {s.remedio.split(" ")[0]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="lpx-sim" data-ui data-reveal style={{ "--d": 1 }}>
        <div className="lpx-sim-quadro" data-fase={fase}>
          <FichaFarmacia
            papel="precisa"
            farmacia={farmacias[sim.falta.id]}
            remedio={sim.remedio}
            quantidade={qtdPrecisa}
            minimo={sim.falta.minimo}
            escala={escala}
            selo={entregue ? "Reposto" : "Crítico"}
            tom={entregue ? "ok" : "critico"}
          />
          <div className="lpx-sim-trilho" aria-hidden="true">
            <span className="lpx-sim-linha" />
            <span key={`${rodada}-${fase}`} className={`lpx-sim-viajante is-${fase}`}>
              {fase === "volta"
                ? <><Icone nome="box" tamanho={16} /><span>{sim.pede} un.</span></>
                : <><Icone nome="ticket" tamanho={16} /><span>Pedido</span></>}
            </span>
          </div>
          <FichaFarmacia
            papel="tem"
            farmacia={farmacias[sim.envia.id]}
            remedio={sim.remedio}
            quantidade={qtdTem}
            minimo={sim.envia.minimo}
            escala={escala}
            selo={`${qtdTem - sim.envia.minimo} disponíveis`}
            tom="ok"
          />
        </div>
        <ol className="lpx-sim-passos">
          {passosSimulacao.map((p, i) => (
            <li key={p} className={passo > i ? "is-feito" : passo === i + 1 ? "is-atual" : undefined}>{p}</li>
          ))}
        </ol>
        <p className="lpx-sim-resultado" aria-live="polite">
          {entregue
            ? `${farmacias[sim.envia.id].nome} enviou ${sim.pede} un. de ${sim.remedio}. A ${farmacias[sim.falta.id].nome} passou de ${sim.falta.tem} para ${sim.falta.tem + sim.pede} un.`
            : `${farmacias[sim.falta.id].nome} tem ${sim.falta.tem} un. de ${sim.remedio}, abaixo do mínimo de ${sim.falta.minimo}.`}
          {movimento && entregue && (
            <button type="button" className="lpx-sim-repetir" onClick={() => { setPasso(0); setRodada((r) => r + 1); }}>Ver de novo</button>
          )}
        </p>
      </div>
    </section>
  );
}
