import { useRef } from "react";
import { papeis, recursos } from "../content";
import { useMotion, useScrollProgress } from "../hooks";

// Recursos: um mural de blocos quadrados, cada um com uma palavra grande e a
// cor da plataforma onde o recurso vive. Os blocos entram em diagonal,
// presos à rolagem.
export default function Recursos() {
  const ref = useRef(null);
  const movimento = useMotion();
  useScrollProgress(ref, { ativo: movimento, repouso: 1 });
  const colunas = 4;

  return (
    <section ref={ref} id="recursos" className="lpx-recursos lpx-fundo-graphite" data-fundo="graphite" aria-labelledby="recursos-titulo">
      <ul className="lpx-blocos">
        <li className="lpx-bloco lpx-bloco-titulo" style={{ "--k": 0 }}>
          <h2 id="recursos-titulo">Um sistema, três plataformas.</h2>
          <p>
            Azul é do funcionário, verde é do gerente e grafite é do admin. Cada recurso tem a cor de onde ele vive.
          </p>
        </li>
        {recursos.map((r, i) => {
          const papel = papeis[r.papel];
          // o título ocupa as duas primeiras casas
          const posicao = i + 2;
          const diagonal = Math.floor(posicao / colunas) + (posicao % colunas);
          return (
            <li key={r.nome} className={`lpx-bloco lpx-cor-${papel.cor}`} style={{ "--k": diagonal }}>
              <p className="lpx-bloco-palavra" aria-hidden="true">
                {r.palavra}
                {r.unidade && <small>{r.unidade}</small>}
              </p>
              <h3 className="lpx-bloco-nome">{r.nome}</h3>
              <p className="lpx-bloco-texto">{r.texto}</p>
              <p className="lpx-bloco-papel">{papel.nome}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
