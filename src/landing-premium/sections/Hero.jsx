import { useRef } from "react";
import { Link } from "react-router-dom";
import { capitulos } from "../content";
import { useMotion, useScrollProgress } from "../hooks";
import { LinhaDoTempo, Selo } from "../ui/Plataforma";

// Resumo que aparece no papel de cada pasta quando ela se abre
const resumos = {
  problema: "Falta aqui. Sobra ali.",
  solucao: "Uma rede, não uma ilha.",
  "como-funciona": "Do pedido à entrega, em cinco etapas.",
  recursos: "Um sistema, três plataformas.",
  plataforma: "As telas, por dentro.",
};

// Hero: título e um arquivo de pastas. Cada pasta de trás é um capítulo da
// página e se ergue e entreabre ao apontar. A da frente é um chamado de
// verdade (CH-2026-000001, da base de demonstração): ao rolar, a capa tomba
// e a ficha sobe para fora da pasta.
export default function Hero() {
  const ref = useRef(null);
  const movimento = useMotion();
  useScrollProgress(ref, { modo: "pin", ativo: movimento, repouso: 1 });
  const pastas = [...capitulos].reverse();

  return (
    <section
      ref={ref}
      id="inicio"
      className={`lpx-hero lpx-fundo-ink${movimento ? " is-cena" : ""}`}
      data-fundo="ink"
      aria-labelledby="hero-titulo"
    >
      <div className="lpx-hero-palco">
        <div className="lpx-hero-texto">
          <h1 id="hero-titulo" className="lpx-hero-titulo">
            <span className="lpx-linha"><span>Interligando</span></span>
            <span className="lpx-linha"><span>medicamentos.</span></span>
          </h1>
          <p className="lpx-hero-sub">
            O Intermedi é a plataforma que conecta as farmácias da rede: quando falta um remédio em uma, outra envia, do
            chamado à entrega.
          </p>
          <div className="lpx-hero-acoes">
            <Link to="/login" className="lpx-btn lpx-btn-paper">Acessar a plataforma</Link>
            <a href="#como-funciona" className="lpx-hero-link">Ver como funciona</a>
          </div>
        </div>

        <div className="lpx-arquivo">
          <nav aria-label="Capítulos da página">
            <ol className="lpx-arquivo-pilha">
              {pastas.map((c, i) => (
                <li key={c.id} className={`lpx-pasta lpx-fundo-${c.fundo}`} style={{ "--i": i }}>
                  <a href={`#${c.id}`} className="lpx-pasta-link">
                    <span className="lpx-pasta-aba">{c.nome}</span>
                    <span className="lpx-pasta-papel" aria-hidden="true">{resumos[c.id]}</span>
                    <span className="lpx-pasta-capa" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="lpx-pasta lpx-pasta-chamado" style={{ "--i": pastas.length }}>
            <span className="lpx-pasta-aba" aria-hidden="true">CH-2026-000001</span>
            <article className="lpx-ficha" aria-label="Exemplo de chamado: Falta de paracetamol, pendente, aberto por Lucas Pereira na Farmácia Pedro João Neto">
              <div className="lpx-ficha-topo">
                <span><small>Relatório de chamado · Farmácia Pedro João Neto</small><strong>Falta de paracetamol</strong></span>
                <Selo tom="yellow">Pendente</Selo>
              </div>
              <dl className="lpx-ficha-dados">
                <div><dt>Solicitante</dt><dd>Lucas Pereira</dd></div>
                <div><dt>Remédio</dt><dd>Paracetamol 750mg · 50 un.</dd></div>
                <div><dt>Prioridade</dt><dd>Alta</dd></div>
              </dl>
              <div className="pui"><LinhaDoTempo atual={1} /></div>
            </article>
            <span className="lpx-pasta-capa" aria-hidden="true">
              <span className="lpx-etiqueta">
                <strong>Chamado de reposição</strong>
                <span>Role para abrir</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
