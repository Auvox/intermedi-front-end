import { Bloco } from "./Pecas";
import { COR, COR_STATUS } from "./paleta";

// Figura estilizada (sem rosto nem tom de pele: é um marcador de pessoa).
// O anel no chão mostra o status; o nome fica na camada de rótulos.
export default function Employee({ p, status, corpo = COR.jaleco, base = COR.calca, selecionado, emHover, onClick, onHover, onSair }) {
  const interativo = Boolean(onClick);
  const cor = COR_STATUS[status] ?? COR.marca;
  const raio = selecionado ? 0.62 : emHover ? 0.54 : 0.46;
  return (
    <group
      position={p}
      onClick={interativo ? (e) => { if (e.delta > 4) return; e.stopPropagation(); onClick(); } : undefined}
      onPointerOver={interativo ? (e) => { e.stopPropagation(); onHover?.(); } : undefined}
      onPointerOut={interativo ? onSair : undefined}
    >
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} raycast={interativo ? undefined : () => null}>
        <ringGeometry args={[raio - 0.11, raio, 40]} />
        <meshBasicMaterial color={selecionado ? COR.selecao : cor} transparent opacity={status === "fora" ? 0.55 : 0.95} />
      </mesh>
      <mesh position-y={0.42} raycast={interativo ? undefined : () => null}>
        <cylinderGeometry args={[0.17, 0.2, 0.84, 18]} />
        <meshStandardMaterial color={base} roughness={0.8} />
      </mesh>
      <mesh position-y={1.12} raycast={interativo ? undefined : () => null}>
        <capsuleGeometry args={[0.25, 0.42, 6, 16]} />
        <meshStandardMaterial color={corpo} roughness={0.75} />
      </mesh>
      <mesh position-y={1.72} raycast={interativo ? undefined : () => null}>
        <sphereGeometry args={[0.19, 20, 16]} />
        <meshStandardMaterial color={COR.cabeca} roughness={0.7} />
      </mesh>
    </group>
  );
}

// Paciente sendo atendido: só decoração (não clicável)
export function Patient({ p }) {
  return (
    <group position={p}>
      <Bloco p={[0, 0, 0]} s={[0.36, 0.84, 0.36]} cor="#5f7487" raycast={() => null} />
      <mesh position-y={1.12} raycast={() => null}>
        <capsuleGeometry args={[0.24, 0.4, 6, 16]} />
        <meshStandardMaterial color={COR.paciente} roughness={0.8} />
      </mesh>
      <mesh position-y={1.7} raycast={() => null}>
        <sphereGeometry args={[0.18, 18, 14]} />
        <meshStandardMaterial color={COR.cabeca} roughness={0.7} />
      </mesh>
    </group>
  );
}
