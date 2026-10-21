import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { preparoDoPedido } from "../../services/rastreio";
import { Bloco } from "./Pecas";
import { COR } from "./paleta";
import { SEPARACAO_X, TRASEIRA_X } from "./layout";
import Employee from "./Employee";

const COR_CAIXA = "#e3d5b8";
const PONTA_PALETE = SEPARACAO_X + 0.9;

// Preparo do envio na doca (esta farmácia é a fornecedora): palete com as
// caixas separadas (50 un. cada) e o funcionário que assumiu o preparo levando
// uma caixa por viagem até a traseira do caminhão. A posição vem do relógio
// (início do preparo + tempo por viagem), então todos que olham a cena veem o
// mesmo momento. Sem "reduzir movimento", anima só enquanto há preparo.
//   posicaoRef: [x, y, z] atualizado a cada quadro para a etiqueta seguir a pessoa
export default function CargaNaDoca({ entrega, z, agora, selecionado, emHover, reduzirMovimento, posicaoRef, onSelecionar, onHover, onSair }) {
  const pessoa = useRef(null);
  const caixaNaMao = useRef(null);
  const prep = preparoDoPedido(entrega, agora);
  const total = prep?.caixas ?? entrega.caixas ?? 1;
  const noPalete = Math.max(0, total - (prep?.carregadas ?? 0));
  const carregando = entrega.status === "preparando" && prep && !prep.terminou;

  useFrame((state) => {
    const g = pessoa.current;
    if (!g || !carregando) return;
    const atual = preparoDoPedido(entrega, Date.now());
    if (!atual || atual.terminou) return;
    // 0 → 0,5: vai com a caixa · 0,5 → 1: volta sem a caixa
    const fase = ((Date.now() - atual.inicio) % atual.viagemMs) / atual.viagemMs;
    const indo = fase < 0.5;
    const f = indo ? fase * 2 : 2 - fase * 2;
    const suave = f * f * (3 - 2 * f); // desacelera ao pegar e ao soltar a caixa
    const x = reduzirMovimento ? (PONTA_PALETE + TRASEIRA_X) / 2 : PONTA_PALETE + (TRASEIRA_X - PONTA_PALETE) * suave;
    g.position.set(x, 0, z);
    if (caixaNaMao.current) caixaNaMao.current.visible = indo && !reduzirMovimento;
    if (posicaoRef) {
      posicaoRef.current[0] = x;
      posicaoRef.current[2] = z;
    }
    if (!reduzirMovimento) state.invalidate();
  });

  return (
    <group>
      {/* palete de separação com as caixas que ainda faltam levar */}
      <Bloco p={[SEPARACAO_X, 0, z]} s={[1.2, 0.14, 1]} cor={COR.madeira} raycast={() => null} />
      {Array.from({ length: Math.min(noPalete, 12) }, (_, i) => (
        <Bloco
          key={i}
          p={[SEPARACAO_X - 0.26 + (i % 2) * 0.52, 0.14 + Math.floor(i / 2) * 0.36, z]}
          s={[0.48, 0.34, 0.42]}
          cor={COR_CAIXA}
          raycast={() => null}
        />
      ))}

      {carregando && (
        <group ref={pessoa} position={[PONTA_PALETE, 0, z]}>
          <Employee
            p={[0, 0, 0]}
            status="atendimento"
            selecionado={selecionado}
            emHover={emHover}
            onClick={onSelecionar}
            onHover={onHover}
            onSair={onSair}
          />
          <group ref={caixaNaMao} position={[0.34, 0.92, 0]}>
            <Bloco p={[0, 0, 0]} s={[0.42, 0.3, 0.38]} cor={COR_CAIXA} raycast={() => null} />
          </group>
        </group>
      )}
    </group>
  );
}
