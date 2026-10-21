import { Suspense } from "react";
import { SRGBColorSpace } from "three";
import { useTexture } from "@react-three/drei";
import logo from "../../assets/logoIntermedi.png";
import { Bloco } from "./Pecas";
import { COR } from "./paleta";
import { MESA_EQUIPE, PALETES_DOCA, PORTAS_DOCA, PREDIO, ZONAS } from "./layout";

// Prédio da farmácia: piso, paredes em corte (só as do fundo têm altura, para
// a câmera enxergar dentro), zonas, rua da doca e mobiliário que não é dado.
export default function PharmacyBuilding() {
  const { x0, x1, z0, z1, parede } = PREDIO;
  const largura = x1 - x0;
  const profundidade = z1 - z0;
  return (
    <group>
      {/* terreno e rua da doca */}
      <Bloco p={[4, -0.06, 0]} s={[70, 0.04, 50]} cor={COR.fundo} raycast={() => null} />
      <Bloco p={[24, -0.04, -5.5]} s={[18, 0.04, 8.6]} cor={COR.rua} raycast={() => null} />
      {[17, 21, 25, 29].map((x) => (
        <Bloco key={x} p={[x, -0.02, -5.5]} s={[2, 0.01, 0.14]} cor={COR.faixaRua} raycast={() => null} />
      ))}

      {/* piso do prédio */}
      <Bloco p={[0, -0.2, 0]} s={[largura, 0.2, profundidade]} cor={COR.piso} raycast={() => null} />
      {Object.entries(ZONAS).map(([id, z]) => (
        <Bloco
          key={id}
          p={[(z.x0 + z.x1) / 2, 0, (z.z0 + z.z1) / 2]}
          s={[z.x1 - z.x0, 0.006, z.z1 - z.z0]}
          cor={COR.zona[id]}
          raycast={() => null}
        />
      ))}
      {/* faixas de segurança da doca */}
      <Bloco p={[10.5, 0.008, -1.55]} s={[8.2, 0.004, 0.1]} cor="#e2c25c" raycast={() => null} />
      <Bloco p={[6.55, 0.008, -5.4]} s={[0.1, 0.004, 7.9]} cor="#e2c25c" raycast={() => null} />

      {/* paredes do fundo (altas) e da frente/direita (rodapé baixo) */}
      <Bloco p={[0, 0, z0 + 0.1]} s={[largura, parede, 0.2]} cor={COR.parede} raycast={() => null} />
      <Bloco p={[x0 + 0.1, 0, 0]} s={[0.2, parede, profundidade]} cor={COR.parede} raycast={() => null} />
      <Bloco p={[0, parede - 0.12, z0 + 0.22]} s={[largura, 0.12, 0.04]} cor={COR.marca} raycast={() => null} />
      <Bloco p={[x0 + 0.22, parede - 0.12, 0]} s={[0.04, 0.12, profundidade]} cor={COR.marca} raycast={() => null} />
      {/* frente: abertura da entrada entre x = -2,4 e 1,9 */}
      <Bloco p={[(x0 - 2.4) / 2, 0, z1 - 0.1]} s={[-2.4 - x0, 0.32, 0.2]} cor={COR.rodape} raycast={() => null} />
      <Bloco p={[(1.9 + x1) / 2, 0, z1 - 0.1]} s={[x1 - 1.9, 0.32, 0.2]} cor={COR.rodape} raycast={() => null} />
      <Bloco p={[-0.25, 0, z1 + 0.6]} s={[4.3, 0.02, 1.2]} cor={COR.marcaClara} raycast={() => null} />
      {/* direita: rodapé com as portas da doca */}
      <Bloco p={[x1 - 0.1, 0, 4.2]} s={[0.2, 0.32, 11.6]} cor={COR.rodape} raycast={() => null} />
      {PORTAS_DOCA.map((z) => (
        <group key={z}>
          <Bloco p={[x1 - 0.1, 0, z - 1.45]} s={[0.24, parede, 0.18]} cor={COR.metal} raycast={() => null} />
          <Bloco p={[x1 - 0.1, 0, z + 1.45]} s={[0.24, parede, 0.18]} cor={COR.metal} raycast={() => null} />
          <Bloco p={[x1 - 0.1, parede - 0.3, z]} s={[0.24, 0.3, 3.1]} cor={COR.marcaEscura} raycast={() => null} />
          <Bloco p={[x1 - 1.1, 0, z]} s={[2, 0.14, 2.6]} cor={COR.metal} raycast={() => null} />
        </group>
      ))}
      <Bloco p={[x1 - 0.1, 0, -1.2]} s={[0.2, 0.32, 1.4]} cor={COR.rodape} raycast={() => null} />
      <Bloco p={[x1 - 0.1, 0, -9.6]} s={[0.2, 0.32, 0.8]} cor={COR.rodape} raycast={() => null} />

      {/* paletes de recebimento */}
      {PALETES_DOCA.map(([x, z]) => (
        <group key={`${x}${z}`}>
          <Bloco p={[x, 0, z]} s={[1.6, 0.16, 1.2]} cor={COR.madeira} raycast={() => null} />
          <Bloco p={[x, 0.16, z]} s={[1.4, 0.7, 1]} cor="#f3efe6" raycast={() => null} />
        </group>
      ))}

      {/* área da equipe: mesa e bancos */}
      <Bloco p={[MESA_EQUIPE.x, 0, MESA_EQUIPE.z]} s={[1.2, 0.74, 2.4]} cor={COR.madeira} raycast={() => null} />
      <Bloco p={[MESA_EQUIPE.x - 0.95, 0, MESA_EQUIPE.z]} s={[0.4, 0.44, 2.2]} cor={COR.metal} raycast={() => null} />
      <Bloco p={[MESA_EQUIPE.x + 0.95, 0, MESA_EQUIPE.z]} s={[0.4, 0.44, 2.2]} cor={COR.metal} raycast={() => null} />

      {/* espera: cadeiras perto da entrada */}
      {[8, 9.1, 10.2, 11.3, 12.4].map((x) => (
        <Bloco key={x} p={[x, 0, 8.4]} s={[0.8, 0.46, 0.7]} cor={COR.metal} raycast={() => null} />
      ))}


      <Suspense fallback={null}>
        <LogoNaParede />
      </Suspense>
    </group>
  );
}

function LogoNaParede() {
  const textura = useTexture(logo, (t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
  });
  return (
    <mesh position={[10.6, 1.25, PREDIO.z0 + 0.21]} raycast={() => null}>
      <planeGeometry args={[3.6, 2.03]} />
      <meshBasicMaterial map={textura} transparent alphaTest={0.05} toneMapped={false} />
    </mesh>
  );
}
