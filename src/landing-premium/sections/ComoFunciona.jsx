import { useRef, useState } from "react";
import { etapas, papeis } from "../content";
import { FormSolicitar, FragPedido, FragPreparo, FragResolvido, FragResponder } from "../ui/Plataforma";
import { IconePapel } from "./Recursos";

// O pedaço de interface que cada etapa mostra, recriado da plataforma
const fragmentos = {
  aberto: () => <div className="pui pui-funcionario pui-cartao"><FormSolicitar compacto /></div>,
  gerente: FragResponder,
  rede: FragPedido,
  transito: FragPreparo,
  resolvido: FragResolvido,
};

// Como funciona: as cinco etapas reais do chamado numa sanfona horizontal,
// do verde mais escuro ao mais claro. A etapa aberta mostra quem age, o
// status que aparece na plataforma e a tela daquela etapa.
export default function ComoFunciona() {
  const [aberta, setAberta] = useState(0);
  const botoes = useRef([]);

  function teclado(event, i) {
    const mapa = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: etapas.length - 1 };
    if (!(event.key in mapa)) return;
    event.preventDefault();
    const alvo = (mapa[event.key] + etapas.length) % etapas.length;
    setAberta(alvo);
    botoes.current[alvo]?.focus();
  }

  return (
    <section id="como-funciona" className="lpx-como lpx-fundo-mint" data-fundo="mint" aria-labelledby="como-titulo">
      <div className="lpx-como-intro">
        <h2 id="como-titulo" className="lpx-h2" data-reveal>Do pedido à entrega.</h2>
        <p className="lpx-corpo" data-reveal style={{ "--d": 1 }}>
          Cada chamado passa pelas mesmas cinco etapas, e todos veem em que ponto ele está: quem pediu, quem aprovou,
          quem prepara e quando chega. Toque numa etapa para ver a tela dela.
        </p>
      </div>

      <ol className="lpx-sanfona" data-reveal style={{ "--d": 2 }}>
        {etapas.map((etapa, i) => {
          const ativa = aberta === i;
          const Fragmento = fragmentos[etapa.id];
          const papel = papeis[etapa.papel];
          return (
            <li key={etapa.id} className={`lpx-etapa lpx-etapa-${i}${ativa ? " is-aberta" : ""}`}>
              <h3 className="lpx-etapa-cabeca">
                <button
                  ref={(el) => { botoes.current[i] = el; }}
                  type="button"
                  id={`etapa-${etapa.id}`}
                  aria-expanded={ativa}
                  aria-controls={`etapa-${etapa.id}-painel`}
                  onClick={() => setAberta(i)}
                  onKeyDown={(event) => teclado(event, i)}
                >
                  {etapa.nome}
                </button>
              </h3>
              <div
                id={`etapa-${etapa.id}-painel`}
                role="region"
                aria-labelledby={`etapa-${etapa.id}`}
                className="lpx-etapa-painel"
                hidden={!ativa}
              >
                <div className="lpx-etapa-texto">
                  <p className={`lpx-chip-papel lpx-cor-${papel.cor}`}><IconePapel papel={etapa.papel} />{etapa.quem}</p>
                  <p className="lpx-etapa-desc">{etapa.texto}</p>
                  <p className="lpx-etapa-status">
                    Status na plataforma <span className={`lpx-badge lpx-badge-${etapa.tom}`}>{etapa.status}</span>
                  </p>
                </div>
                <div className="lpx-etapa-tela" aria-hidden="true" data-ui>
                  {ativa && <Fragmento />}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
