import { useRef } from "react";
import foto from "../assets/photos/farmacia-prateleiras.jpg";
import { problemaTexto } from "../content";
import { useMotion, useScrollProgress } from "../hooks";

// O problema: um mural de blocos (frase, palavra, foto) e um texto que se
// acende palavra por palavra conforme a leitura avança.
export default function Problema() {
  const mural = useRef(null);
  const texto = useRef(null);
  const movimento = useMotion();
  useScrollProgress(mural, { ativo: movimento, repouso: 0.5 });
  useScrollProgress(texto, { ativo: movimento, repouso: 1 });
  const palavras = problemaTexto.split(" ");

  return (
    <section id="problema" className="lpx-problema lpx-fundo-gray" data-fundo="gray" aria-labelledby="problema-titulo">
      <div ref={mural} className="lpx-mural">
        <div className="lpx-mural-a" data-reveal>
          <h2 id="problema-titulo" className="lpx-mural-frase">
            <span>Falta aqui.</span> <span>Sobra ali.</span>
          </h2>
        </div>
        <div className="lpx-mural-b" data-reveal style={{ "--d": 1 }}>
          <p className="lpx-mural-palavra" aria-hidden="true">Ruptura</p>
          <p className="lpx-mural-legenda">Quando o remédio acaba na prateleira.</p>
        </div>
        <figure className="lpx-mural-c" data-reveal style={{ "--d": 2 }}>
          <img
            src={foto}
            alt="Prateleiras de farmácia com escaninhos de remédios, vários deles vazios"
            width="1280"
            height="960"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>

      <div className="lpx-problema-texto">
        <p ref={texto} className="lpx-acende" style={{ "--n": palavras.length }}>
          {palavras.map((palavra, i) => (
            <span key={i} style={{ "--i": i }}>{palavra} </span>
          ))}
        </p>
      </div>
    </section>
  );
}
