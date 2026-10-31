import { useRef } from "react";
import PersonaIcon from "../../components/PersonaIcon";
import { papeis, recursos } from "../content";
import { useMotion, useScrollProgress } from "../hooks";

// Silhueta de cada papel, a mesma das plataformas
export function IconePapel({ papel, tamanho = 18 }) {
  return <PersonaIcon role={papel} size={tamanho} className="lpx-icone-papel" />;
}

// Recursos: um mural de blocos quadrados, cada um com uma palavra grande e a
// cor e o ícone da plataforma onde o recurso vive. Os blocos entram em
// diagonal, presos à rolagem.
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
          <ul className="lpx-legenda" aria-label="Cor de cada plataforma">
            {Object.entries(papeis).map(([id, p]) => (
              <li key={id} className={`lpx-chip-papel lpx-cor-${p.cor}`}><IconePapel papel={id} />{p.nome}</li>
            ))}
          </ul>
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
              <h3 className="lpx-bloco-nome">
                {r.nome}
                <span className="lpx-bloco-papel"><IconePapel papel={r.papel} tamanho={16} />{papel.nome}</span>
              </h3>
              <p className="lpx-bloco-texto">{r.texto}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
