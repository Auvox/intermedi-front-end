import { Bloco, Contorno } from "./Pecas";
import { COR } from "./paleta";

// Ponto de atendimento: balcão (frente verde da marca, tampo branco, monitor)
// ou a mesa redonda de orientação farmacêutica.
export default function ServicePoint({ p, tipo = "balcao", selecionado, emHover, onClick, onHover, onSair }) {
  const eventos = {
    onClick: (e) => { if (e.delta > 4) return; e.stopPropagation(); onClick(); },
    onPointerOver: (e) => { e.stopPropagation(); onHover(); },
    onPointerOut: onSair,
  };
  if (tipo === "orientacao") {
    return (
      <group position={p} {...eventos}>
        <mesh position-y={0.74}>
          <cylinderGeometry args={[0.85, 0.85, 0.06, 36]} />
          <meshStandardMaterial color={emHover ? "#f2faf5" : COR.jaleco} roughness={0.6} />
        </mesh>
        <mesh position-y={0.36}>
          <cylinderGeometry args={[0.08, 0.2, 0.72, 16]} />
          <meshStandardMaterial color={COR.marcaEscura} />
        </mesh>
        <Bloco p={[0, 0, 0.95]} s={[0.5, 0.46, 0.5]} cor={COR.metal} />
        <Bloco p={[0, 0, -0.95]} s={[0.5, 0.46, 0.5]} cor={COR.metal} />
        {selecionado && <Contorno centro={[0, 0.45, 0]} tamanho={[2, 1, 2.6]} cor={COR.selecao} />}
      </group>
    );
  }
  return (
    <group position={p} {...eventos}>
      <Bloco p={[0, 0, 0.1]} s={[2.5, 1, 0.12]} cor={emHover ? COR.marca : COR.marcaEscura} />
      <Bloco p={[0, 0, -0.18]} s={[2.5, 0.98, 0.5]} cor="#f2f5f3" />
      <Bloco p={[0, 0.98, -0.08]} s={[2.66, 0.07, 0.8]} cor={COR.jaleco} />
      <Bloco p={[-0.55, 1.05, -0.25]} s={[0.6, 0.38, 0.05]} cor={COR.tela} />
      <Bloco p={[-0.55, 1.05, -0.2]} s={[0.08, 0.06, 0.12]} cor={COR.metalEscuro} />
      {selecionado && <Contorno centro={[0, 0.7, -0.08]} tamanho={[2.9, 1.5, 1.1]} cor={COR.selecao} />}
    </group>
  );
}
