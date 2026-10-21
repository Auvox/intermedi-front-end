import { BoxGeometry, EdgesGeometry, MeshStandardMaterial } from "three";

export { COR, COR_SITUACAO, COR_STATUS, COR_PRIORIDADE } from "./cores";

// Geometrias e materiais compartilhados: muitas peças, poucos objetos na GPU
export const CUBO = new BoxGeometry(1, 1, 1);
export const ARESTAS_CUBO = new EdgesGeometry(CUBO);

const materiais = new Map();
export function material(cor, { transparente = 0 } = {}) {
  const chave = `${cor}:${transparente}`;
  if (!materiais.has(chave)) {
    materiais.set(chave, new MeshStandardMaterial({
      color: cor,
      roughness: 0.85,
      metalness: 0,
      ...(transparente && { transparent: true, opacity: transparente, depthWrite: false }),
    }));
  }
  return materiais.get(chave);
}
