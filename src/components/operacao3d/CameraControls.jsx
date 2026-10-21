import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { VISTAS, alvoDoObjeto } from "./layout";

const DISTANCIA = [9, 72];
const LIMITE_ALVO = { x: [-16, 32], z: [-12, 12] };
const limitar = (v, [min, max]) => Math.min(max, Math.max(min, v));

// Órbita (girar, aproximar, arrastar no plano do piso) com limites, para a
// câmera nunca "se perder". `foco` muda o ponto de vista com uma transição curta:
//   { tipo: "vista", vista: "estoque" } · { tipo: "objeto", chave } · { tipo: "zoom", fator }
// onDistancia(d): avisa a distância da câmera ao alvo (para o nível de detalhe)
export default function CameraControls({ foco, cenaRef, reduzirMovimento, onDistancia }) {
  const controles = useRef(null);
  const animacao = useRef(null);
  const invalidate = useThree((state) => state.invalidate);
  const aspecto = useThree((state) => state.size.width / Math.max(1, state.size.height));

  // telas mais estreitas pedem a câmera um pouco mais longe para caber tudo
  const afastamento = Math.max(1, 1.6 / aspecto);

  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    const camera = c.object;
    let posicao;
    let alvo;
    if (!foco || foco.tipo === "vista") {
      const vista = VISTAS[foco?.vista ?? "geral"];
      alvo = new Vector3(...vista.alvo);
      posicao = new Vector3(...vista.posicao).sub(alvo).multiplyScalar(afastamento).add(alvo);
      if (!foco) {
        // primeira montagem: posiciona sem animar
        camera.position.copy(posicao);
        c.target.copy(alvo);
        c.update();
        invalidate();
        return;
      }
    } else if (foco.tipo === "objeto") {
      const ponto = alvoDoObjeto(foco.chave, cenaRef.current);
      if (!ponto) return;
      alvo = new Vector3(...ponto);
      const direcao = camera.position.clone().sub(c.target).normalize();
      posicao = alvo.clone().add(direcao.multiplyScalar(limitar(camera.position.distanceTo(c.target), [12, 20])));
    } else if (foco.tipo === "zoom") {
      alvo = c.target.clone();
      const direcao = camera.position.clone().sub(alvo);
      posicao = alvo.clone().add(direcao.setLength(limitar(direcao.length() * foco.fator, DISTANCIA)));
    }
    if (!posicao) return;
    if (reduzirMovimento) {
      camera.position.copy(posicao);
      c.target.copy(alvo);
      c.update();
      animacao.current = null;
    } else {
      animacao.current = { posicao, alvo, tempo: 0 };
    }
    invalidate();
    // o foco é um pedido pontual: só reage quando um novo pedido chega
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco]);

  useFrame((state, delta) => {
    const a = animacao.current;
    const c = controles.current;
    if (!a || !c) return;
    // sob demanda, o 1º quadro depois de parado chega com um delta enorme:
    // limita o passo para a transição não terminar num salto
    const passo = Math.min(delta, 1 / 30);
    const k = 1 - Math.exp(-passo * 5);
    c.object.position.lerp(a.posicao, k);
    c.target.lerp(a.alvo, k);
    c.update();
    a.tempo += passo;
    const chegou = c.object.position.distanceTo(a.posicao) < 0.03 && c.target.distanceTo(a.alvo) < 0.03;
    if (chegou || a.tempo > 2.5) animacao.current = null;
    state.invalidate();
  });

  return (
    <OrbitControls
      ref={controles}
      makeDefault
      enableDamping={!reduzirMovimento}
      dampingFactor={0.12}
      minDistance={DISTANCIA[0]}
      maxDistance={DISTANCIA[1]}
      minPolarAngle={0.3}
      maxPolarAngle={1.18}
      screenSpacePanning={false}
      onStart={() => { animacao.current = null; }}
      onChange={(e) => {
        const alvo = e?.target?.target;
        if (!alvo) return;
        alvo.x = limitar(alvo.x, LIMITE_ALVO.x);
        alvo.z = limitar(alvo.z, LIMITE_ALVO.z);
        onDistancia?.(e.target.object.position.distanceTo(alvo));
      }}
    />
  );
}
