import { useLayoutEffect, useRef } from "react";
import { Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";

// Etiquetas e marcadores em HTML presos a pontos da cena.
//
// Em vez de uma raiz React por etiqueta, todas ficam numa única camada HTML
// sobre o canvas (CamadaRotulos, fora do <Canvas>) e o ProjetorRotulos (dentro
// do <Canvas>) só reposiciona os elementos a cada quadro desenhado, sem
// re-renderizar o React. Como a camada é HTML comum, os botões funcionam com
// teclado e leitor de tela.
//
// rotulos: [{ key, p: [x, y, z], conteudo, ancora: "centro" | "esquerda" | "acima" }]
// Para seguir algo que se move (ex.: o funcionário carregando o caminhão), use
// posicaoRef no lugar de p: um ref com [x, y, z] atualizado pela animação.

// registro: Map(key → elemento), compartilhado pelos dois componentes
export function CamadaRotulos({ rotulos, registro }) {
  return (
    <div className="op3d-camada">
      {rotulos.map((r) => (
        <div
          key={r.key}
          className={`op3d-rotulo op3d-ancora-${r.ancora ?? "centro"}`}
          ref={(el) => {
            if (el) registro.set(r.key, el);
            else registro.delete(r.key);
          }}
        >
          {r.conteudo}
        </div>
      ))}
    </div>
  );
}

const ponto = new Vector3();
export function ProjetorRotulos({ rotulos, registro }) {
  const invalidate = useThree((state) => state.invalidate);
  const ultimo = useRef(new Map());

  // etiquetas novas ou movidas: pede um quadro para posicioná-las
  useLayoutEffect(() => {
    invalidate();
  }, [rotulos, invalidate]);

  useFrame(({ camera, size }) => {
    for (const r of rotulos) {
      const el = registro.get(r.key);
      if (!el) continue;
      const p = r.posicaoRef ? r.posicaoRef.current : r.p;
      ponto.set(p[0], p[1], p[2]).project(camera);
      const visivel = ponto.z < 1 && Math.abs(ponto.x) < 1.2 && Math.abs(ponto.y) < 1.2;
      const x = Math.round((ponto.x * 0.5 + 0.5) * size.width);
      const y = Math.round((-ponto.y * 0.5 + 0.5) * size.height);
      const valor = visivel ? `translate3d(${x}px, ${y}px, 0)` : "none";
      if (ultimo.current.get(r.key) === valor && el.dataset.pos) continue;
      ultimo.current.set(r.key, valor);
      el.dataset.pos = "1";
      el.style.visibility = visivel ? "visible" : "hidden";
      if (visivel) el.style.transform = valor;
      // mais perto da câmera fica por cima
      el.style.zIndex = String(Math.round((1 - ponto.z) * 1000));
    }
  });
  return null;
}
