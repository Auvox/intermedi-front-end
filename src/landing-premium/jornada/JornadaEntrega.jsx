import { useRef, useState } from "react";
import { useMotion } from "../hooks";
import Mundo from "./Mundo";
import { useCameraVirtual } from "./useCameraVirtual";
import "./jornada.css";

// Textos de cada cena, na ordem da jornada
const CENAS_TEXTO = [
  { titulo: "Da disponibilidade nasce uma conexão.", frase: "Uma farmácia possui medicamentos que podem atender à necessidade de outra." },
  { titulo: "Tudo pronto para o transporte.", frase: "Os medicamentos são preparados para seguir até a farmácia solicitante." },
  { titulo: "Uma jornada que conecta farmácias.", frase: "O Intermedi facilita o remanejamento de medicamentos entre estabelecimentos." },
  { titulo: "O destino está próximo.", frase: "Os medicamentos chegam à farmácia que precisa deles." },
  { titulo: "Uma necessidade atendida.", frase: "Com o Intermedi, medicamentos disponíveis podem ajudar outras farmácias." },
];

// "Uma rede, não uma ilha.": a jornada de uma entrega entre duas farmácias,
// em um mundo 2D maior que a tela. A janela fica presa (sticky) enquanto a
// seção rola, e a câmera virtual acompanha o carrinho. Sem movimento, o mundo
// aparece inteiro com a entrega feita e os textos em sequência.
export default function JornadaEntrega() {
  const rolagem = useRef(null);
  const janela = useRef(null);
  const mundo = useRef(null);
  const textos = useRef(null);
  const barra = useRef(null);
  const movimento = useMotion();
  const [cena, setCena] = useState(0);

  useCameraVirtual({ rolagem, janela, mundo, textos, barra, ativo: movimento, aoMudarCena: setCena });

  return (
    <section id="solucao" className="jx lpx-fundo-green" data-fundo="green" aria-labelledby="solucao-titulo">
      <div ref={rolagem} className={`jx-rolagem ${movimento ? "is-animado" : "is-estatico"}`}>
        <div className="jx-palco">
          <div className="jx-texto">
            <h2 id="solucao-titulo" className="lpx-h2 jx-titulo">Uma rede, não uma ilha.</h2>
            <ol ref={textos} className="jx-cenas" aria-label="A jornada de uma entrega">
              {CENAS_TEXTO.map((c) => (
                <li key={c.titulo} className="jx-cena" data-j="texto">
                  <h3 className="jx-cena-titulo">{c.titulo}</h3>
                  <p className="jx-cena-frase">{c.frase}</p>
                </li>
              ))}
            </ol>
            <p className="lpx-sr" aria-live="polite">
              {movimento ? `${CENAS_TEXTO[cena].titulo} ${CENAS_TEXTO[cena].frase}` : ""}
            </p>
            <span className="jx-progresso" aria-hidden="true"><i ref={barra} /></span>
          </div>
          <div ref={janela} className="jx-janela">
            <Mundo ref={mundo} />
          </div>
        </div>
      </div>
    </section>
  );
}
