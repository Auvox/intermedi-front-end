import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloco, Contorno } from "./Pecas";
import { COR } from "./paleta";

// Doca: caminhões das entregas entre farmácias (dados reais dos pedidos da
// rede): parados na doca enquanto esta farmácia prepara o envio e na estrada
// quando estão a caminho. Os avisos ficam na camada de rótulos da cena.
export default function DeliveryDock({ caminhoes, entregas, selecionado, hover, reduzirMovimento, onSelecionar, onHover }) {
  const porKey = new Map(entregas.map((e) => [e.key, e]));
  return (
    <group>
      {caminhoes.map((c) => {
        const e = porKey.get(c.key);
        return (
          <Truck
            key={c.key}
            x={c.x}
            z={c.z}
            rotY={c.rotY}
            selecionado={selecionado === c.key}
            emHover={hover?.key === c.key}
            reduzirMovimento={reduzirMovimento}
            rotulo={`${e.sentido === "entrada" ? "Chegando" : c.estado === "viajando" ? "Saindo" : "Na doca"}: ${e.quantidade}× ${e.nomeRemedio}`}
            onClick={() => onSelecionar(c.key)}
            onHover={() => onHover({ key: c.key, p: [c.x, 3.4, c.z], texto: textoDoCaminhao(c, e) })}
            onSair={() => onHover(null)}
          />
        );
      })}
    </group>
  );
}

function textoDoCaminhao(c, e) {
  const item = `${e.quantidade}× ${e.nomeRemedio}`;
  if (c.estado === "aguardando") return `Aguardando a equipe preparar · ${item} para ${e.outraFarmacia}`;
  if (c.estado === "carregando") return `Sendo carregado por ${e.nomeFuncionarioPreparo ?? "um funcionário"} · ${item}`;
  return `${e.sentido === "entrada" ? "Chegando de" : "Indo para"} ${e.outraFarmacia} · ${item}`;
}

// Caminhão da rede Intermedi (cabine verde, baú branco). Ao mudar de posição,
// desliza até ela em vez de saltar (sem animação contínua). rotY = π vira a
// cabine para o lado da doca (caminhão chegando de frente).
function Truck({ x, z, rotY = 0, selecionado, emHover, reduzirMovimento, rotulo, onClick, onHover, onSair }) {
  const ref = useRef(null);
  const alvo = useRef(x);
  // posição inicial fixa: as seguintes chegam pelo useFrame (sem salto)
  const [xInicial] = useState(x);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    alvo.current = x;
    invalidate();
  }, [x, invalidate]);
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const falta = alvo.current - g.position.x;
    if (Math.abs(falta) < 0.005) return;
    g.position.x = reduzirMovimento ? alvo.current : g.position.x + falta * Math.min(1, Math.min(delta, 1 / 30) * 3);
    state.invalidate();
  });
  return (
    <group
      ref={ref}
      position={[xInicial, 0, z]}
      rotation-y={rotY}
      onClick={(e) => { if (e.delta > 4) return; e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(); }}
      onPointerOut={onSair}
      name={rotulo}
    >
      {/* baú (de costas para a doca) e faixa da marca */}
      <Bloco p={[-0.3, 0.55, 0]} s={[3.8, 2, 2.1]} cor={emHover ? "#f4fbf7" : COR.jaleco} />
      <Bloco p={[-0.3, 1.1, 1.06]} s={[3.8, 0.22, 0.02]} cor={COR.marca} />
      <Bloco p={[-0.3, 1.1, -1.06]} s={[3.8, 0.22, 0.02]} cor={COR.marca} />
      {/* cabine */}
      <Bloco p={[2.35, 0.55, 0]} s={[1.4, 1.5, 2]} cor={COR.marcaEscura} />
      <Bloco p={[2.95, 1.25, 0]} s={[0.22, 0.6, 1.7]} cor={COR.tela} />
      {[-1.4, 0.8, 2.4].map((wx) => [-1.02, 1.02].map((wz) => (
        <mesh key={`${wx}${wz}`} position={[wx, 0.38, wz]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.38, 0.38, 0.26, 18]} />
          <meshStandardMaterial color={COR.pneu} roughness={0.9} />
        </mesh>
      )))}
      {selecionado && <Contorno centro={[0.2, 1.3, 0]} tamanho={[5.6, 2.8, 2.5]} cor={COR.selecao} />}
    </group>
  );
}
