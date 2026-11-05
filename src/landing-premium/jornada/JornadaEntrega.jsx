import { useRef, useState } from "react";
import { useMotion } from "../hooks";
import Mundo from "./Mundo";
import { useCameraVirtual } from "./useCameraVirtual";
import "./jornada.css";

// Textos de cada cena, na ordem da jornada (o primeiro é o título da seção)
const CENAS_TEXTO = [
  { titulo: "Uma rede, não uma ilha.", frase: "Uma farmácia possui medicamentos que podem atender à necessidade de outra." },
  { titulo: "A conexão começa aqui.", frase: "Os medicamentos estão prontos para seguir até quem precisa." },
  { titulo: "Conectando necessidades e soluções.", frase: "O Intermedi facilita o remanejamento de medicamentos entre farmácias." },
  { titulo: "Cada entrega faz a diferença.", frase: "O transporte se aproxima da farmácia solicitante." },
  { titulo: "Uma necessidade atendida.", frase: "Medicamentos disponíveis chegam à farmácia que precisa deles." },
];

// "Uma rede, não uma ilha.": a página vira uma cidade e o visitante desce
// junto com um caminhão que leva medicamentos de uma farmácia para outra.
// O cenário ocupa a tela inteira (sticky) enquanto a seção rola; a câmera
// virtual acompanha o caminhão. Sem movimento, o mapa aparece inteiro com a
// entrega feita e os textos em sequência.
export default function JornadaEntrega() {
  const rolagem = useRef(null);
  const palco = useRef(null);
  const mundo = useRef(null);
  const textos = useRef(null);
  const indicador = useRef(null);
  const saida = useRef(null);
  const movimento = useMotion();
  const [cena, setCena] = useState(0);

  useCameraVirtual({ rolagem, palco, mundo, textos, indicador, saida, ativo: movimento, aoMudarCena: setCena });

  return (
    <section id="solucao" className="jx lpx-fundo-nevoa" data-fundo="nevoa" aria-labelledby="solucao-titulo">
      <div ref={rolagem} className={`jx-rolagem ${movimento ? "is-animado" : "is-estatico"}`}>
        <div ref={palco} className="jx-palco">
          <Mundo ref={mundo} />
          {/* saída: cobre o cenário com a cor da seção seguinte no fim da rolagem */}
          <div ref={saida} className="jx-saida" aria-hidden="true" />

          <ol ref={textos} className="jx-narrativa" aria-label="A jornada de uma entrega">
            {CENAS_TEXTO.map((c, i) => (
              <li key={c.titulo} className="jx-cena" data-j="texto">
                {i === 0
                  ? <h2 id="solucao-titulo" className="jx-cena-titulo">{c.titulo}</h2>
                  : <h3 className="jx-cena-titulo">{c.titulo}</h3>}
                <p className="jx-cena-frase">{c.frase}</p>
              </li>
            ))}
          </ol>
          <p className="lpx-sr" aria-live="polite">
            {movimento && cena > 0 ? `${CENAS_TEXTO[cena].titulo} ${CENAS_TEXTO[cena].frase}` : ""}
          </p>

          <p ref={indicador} className="jx-convite" aria-hidden="true">
            <span>Role para acompanhar a jornada</span>
            <svg viewBox="0 0 24 24"><path d="M12 5v14m-6-6 6 6 6-6" /></svg>
          </p>
        </div>
      </div>
    </section>
  );
}
