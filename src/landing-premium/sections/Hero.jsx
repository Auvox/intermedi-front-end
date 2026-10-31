import { useRef } from "react";
import { Link } from "react-router-dom";
import { capitulos } from "../content";
import { useMotion, useScrollProgress } from "../hooks";

// Hero: fundo escuro, o título e, embaixo, uma pilha de pastas em 3D.
// Cada pasta é um capítulo da página, na cor do fundo da seção para onde
// leva; a da frente já é o começo da próxima seção. Ao rolar, a pilha se
// endireita e abre.
export default function Hero() {
  const ref = useRef(null);
  const movimento = useMotion();
  useScrollProgress(ref, { modo: "exit", ativo: movimento, repouso: 0 });

  // A pilha é desenhada de trás para frente: a primeira seção fica na frente
  const pastas = [...capitulos].reverse();

  function inclinar(event) {
    if (!movimento || event.pointerType !== "mouse") return;
    const caixa = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - caixa.left) / caixa.width - 0.5;
    const y = (event.clientY - caixa.top) / caixa.height - 0.5;
    event.currentTarget.style.setProperty("--tx", x.toFixed(3));
    event.currentTarget.style.setProperty("--ty", y.toFixed(3));
  }

  return (
    <section
      ref={ref}
      id="inicio"
      className="lpx-hero lpx-fundo-ink"
      data-fundo="ink"
      aria-labelledby="hero-titulo"
      onPointerMove={inclinar}
    >
      <div className="lpx-hero-texto">
        <h1 id="hero-titulo" className="lpx-hero-titulo">
          <span className="lpx-linha"><span>Interligando</span></span>
          <span className="lpx-linha"><span>medicamentos.</span></span>
        </h1>
        <p className="lpx-hero-sub">
          O Intermedi é a plataforma que conecta as farmácias da rede: quando falta um remédio em uma, outra envia, do
          chamado à entrega.
        </p>
      </div>

      <nav className="lpx-pastas" aria-label="Capítulos da página">
        <ol className="lpx-pastas-pilha">
          {pastas.map((c, i) => {
            const frente = i === pastas.length - 1;
            return (
              <li
                key={c.id}
                className={`lpx-pasta lpx-fundo-${c.fundo}${frente ? " is-frente" : ""}`}
                style={{ "--i": i, "--n": pastas.length }}
              >
                <a href={`#${c.id}`} className="lpx-pasta-aba">{c.nome}</a>
                {frente && (
                  <div className="lpx-pasta-conteudo">
                    <div className="lpx-pasta-acoes">
                      <Link to="/login" className="lpx-btn lpx-btn-ink">Acessar a plataforma</Link>
                      <a href="#problema" className="lpx-pasta-convite">Role para abrir o chamado</a>
                    </div>
                    {/* Ficha do primeiro chamado da base de demonstração, como aparece na lista do gerente */}
                    <dl className="lpx-ficha" data-ui aria-label="Exemplo de chamado na plataforma">
                      <div><dt>Protocolo</dt><dd>CH-2026-000001</dd></div>
                      <div className="lpx-ficha-titulo"><dt>Chamado</dt><dd>Falta de paracetamol</dd></div>
                      <div><dt>Remédio</dt><dd>Paracetamol · 50 un.</dd></div>
                      <div><dt>Prioridade</dt><dd>Alta</dd></div>
                      <div><dt>Status</dt><dd><span className="lpx-badge lpx-badge-yellow">Pendente</span></dd></div>
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </section>
  );
}
