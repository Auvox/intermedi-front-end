import { ContactShadows } from "@react-three/drei";
import { COR } from "./paleta";

// Luz, fundo e sombras suaves. Sem sombras dinâmicas (caras para a GPU): a
// sombra de contato é calculada uma vez e refeita só quando `versao` muda.
export default function SceneEnvironment({ versao }) {
  return (
    <>
      <color attach="background" args={[COR.fundo]} />
      <hemisphereLight args={["#ffffff", "#d9e3dc", 2.1]} />
      <directionalLight position={[14, 24, 12]} intensity={1.5} />
      <directionalLight position={[-18, 12, -6]} intensity={0.35} />
      <ContactShadows
        key={versao}
        position={[0, 0.012, 0]}
        scale={[34, 24]}
        resolution={1024}
        far={4}
        blur={2.2}
        opacity={0.32}
        frames={1}
        color="#1d3a2a"
      />
    </>
  );
}
