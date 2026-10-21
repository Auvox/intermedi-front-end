import { Bloco, Contorno } from "./Pecas";
import { COR, COR_PRIORIDADE } from "./paleta";
import { MESA_GERENTE, ZONAS } from "./layout";
import Employee from "./Employee";

// Gerência: sala de vidro, mesa do gerente e a pilha de chamados pendentes
// (uma ficha por chamado, na cor da prioridade).
export default function ManagerOffice({ gerente, chamados, totalPendentes, selecionado, hover, onSelecionar, onHover }) {
  const { x0, x1, z1 } = ZONAS.gerencia;
  const { x, z } = MESA_GERENTE;
  const pilhaSel = selecionado === "chamados" || chamados.some((c) => c.key === selecionado);
  const abrirChamados = () => onSelecionar(chamados.length === 1 ? chamados[0].key : "chamados");
  return (
    <group>
      {/* divisórias de vidro (com passagem) */}
      <Bloco p={[x0, 0, (ZONAS.gerencia.z0 + z1) / 2 - 0.9]} s={[0.06, 2.1, 3.2]} cor={COR.vidro} transparente={0.35} raycast={() => null} />
      <Bloco p={[(x0 + x1) / 2 + 0.9, 0, z1]} s={[x1 - x0 - 1.8, 2.1, 0.06]} cor={COR.vidro} transparente={0.35} raycast={() => null} />
      <Bloco p={[x0, 2.05, (ZONAS.gerencia.z0 + z1) / 2]} s={[0.08, 0.06, z1 - ZONAS.gerencia.z0]} cor={COR.metal} raycast={() => null} />

      {/* mesa, monitor e cadeira */}
      <Bloco p={[x, 0, z]} s={[2.3, 0.74, 0.9]} cor={COR.madeira} raycast={() => null} />
      <Bloco p={[x + 0.4, 0.74, z - 0.2]} s={[0.8, 0.46, 0.05]} cor={COR.tela} raycast={() => null} />
      <Bloco p={[x, 0, z - 1.1]} s={[0.6, 0.48, 0.6]} cor={COR.metalEscuro} raycast={() => null} />

      {/* pilha de chamados pendentes sobre a mesa */}
      <group
        onClick={(e) => { if (e.delta > 4 || !chamados.length) return; e.stopPropagation(); abrirChamados(); }}
        onPointerOver={(e) => {
          if (!chamados.length) return;
          e.stopPropagation();
          onHover({ key: "chamados", p: [x - 0.6, 1.5, z], texto: `${totalPendentes} ${totalPendentes === 1 ? "chamado pendente" : "chamados pendentes"}` });
        }}
        onPointerOut={() => onHover(null)}
      >
        {chamados.slice(0, 8).map((c, i) => (
          <Bloco
            key={c.key}
            p={[x - 0.6 + (i % 2) * 0.03, 0.74 + i * 0.05, z + 0.05]}
            s={[0.5, 0.04, 0.36]}
            cor={COR_PRIORIDADE[c.prioridade] ?? COR_PRIORIDADE.media}
          />
        ))}
      </group>
      {pilhaSel && <Contorno centro={[x - 0.6, 0.95, z + 0.05]} tamanho={[0.8, 0.5, 0.6]} cor={COR.selecao} />}

      {gerente && (
        <Employee
          p={[x - 0.1, 0, z - 0.85]}
          status="disponivel"
          corpo={COR.jaleco}
          base={COR.marcaEscura}
          selecionado={selecionado === gerente.key}
          emHover={hover?.key === gerente.key}
          onClick={() => onSelecionar(gerente.key)}
          onHover={() => onHover({ key: gerente.key, p: [x - 0.1, 2.7, z - 0.85], texto: `${gerente.nome} · Gerente` })}
          onSair={() => onHover(null)}
        />
      )}
    </group>
  );
}
