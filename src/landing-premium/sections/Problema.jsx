import { useRef } from "react";
import foto from "../assets/photos/farmacia-prateleiras.jpg";
import { useMotion, useScrollProgress } from "../hooks";

// O problema: um mural de blocos (frase, palavra, foto) e duas frases curtas
// que explicam o que acontece hoje sem uma ligação entre as farmácias.
export default function Problema() {
  const mural = useRef(null);
  const movimento = useMotion();
  useScrollProgress(mural, { ativo: movimento, repouso: 0.5 });

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
        <p className="lpx-problema-frase" data-reveal>
          Uma farmácia fica sem o remédio enquanto outra unidade da mesma rede tem caixas paradas.
        </p>
        <p className="lpx-corpo" data-reveal style={{ "--d": 1 }}>
          Sem um caminho entre as duas, o pedido vira telefonema e planilha, ninguém sabe quem tem nem quando chega, e o
          paciente volta para casa sem o medicamento.
        </p>
      </div>
    </section>
  );
}
