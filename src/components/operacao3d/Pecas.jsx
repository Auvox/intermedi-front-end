import { useLayoutEffect, useRef } from "react";
import { Color, Matrix4, Quaternion, Vector3 } from "three";
import { useThree } from "@react-three/fiber";
import { ARESTAS_CUBO, CUBO, material } from "./paleta";

// Peças básicas da cena, reaproveitadas por todos os componentes.

// Caixa com a base apoiada em y (p = [x, yBase, z], s = [largura, altura, profundidade])
export function Bloco({ p, s, cor, transparente, ...props }) {
  return (
    <mesh
      geometry={CUBO}
      material={material(cor, { transparente })}
      position={[p[0], p[1] + s[1] / 2, p[2]]}
      scale={s}
      {...props}
    />
  );
}

// Contorno de seleção (arestas de uma caixa)
export function Contorno({ centro, tamanho, cor, opacidade = 1 }) {
  return (
    <lineSegments geometry={ARESTAS_CUBO} position={centro} scale={tamanho} raycast={() => null}>
      <lineBasicMaterial color={cor} transparent={opacidade < 1} opacity={opacidade} depthTest={false} />
    </lineSegments>
  );
}

// Muitas caixas iguais em uma só chamada de desenho (InstancedMesh).
// itens: [{ p, s, cor }] com p no centro · onClick/onHover recebem (índice, evento).
const m4 = new Matrix4();
const q = new Quaternion();
const vp = new Vector3();
const vs = new Vector3();
const cor = new Color();
export function CaixasInstanciadas({ itens, corBase = "#ffffff", onClick, onHover, onSair }) {
  const ref = useRef(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    itens.forEach((item, i) => {
      vp.set(item.p[0], item.p[1], item.p[2]);
      vs.set(item.s[0], item.s[1], item.s[2]);
      m4.compose(vp, q, vs);
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, cor.set(item.cor ?? corBase));
    });
    mesh.count = itens.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [itens, corBase, invalidate]);

  if (!itens.length) return null;
  return (
    <instancedMesh
      // recria só quando a quantidade de caixas aumenta além do reservado
      key={Math.ceil(itens.length / 32)}
      ref={ref}
      args={[CUBO, material("#ffffff"), Math.ceil(itens.length / 32) * 32]}
      onClick={onClick && ((e) => {
        if (e.delta > 4 || e.instanceId == null) return;
        e.stopPropagation();
        onClick(e.instanceId, e);
      })}
      onPointerMove={onHover && ((e) => {
        if (e.instanceId == null) return;
        e.stopPropagation();
        onHover(e.instanceId, e);
      })}
      onPointerOut={onSair}
    />
  );
}
