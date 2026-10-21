import { useMemo } from "react";
import { Color } from "three";
import { CaixasInstanciadas, Contorno } from "./Pecas";
import { COR, COR_SITUACAO } from "./paleta";
import { GONDOLA, caixasDoVao } from "./layout";
import MedicineBoxes from "./MedicineBoxes";

// Estoque: uma gôndola por corredor (categoria), com um vão por remédio.
// Estrutura das gôndolas e caixas são instanciadas: poucas chamadas de desenho
// mesmo com muitos itens.
export default function StorageArea({ estoque, itensPorKey, selecionado, destacados, hover, onSelecionar, onHover }) {
  const { gondolas, vao } = estoque;

  // peças da estrutura: base, fundo, colunas e prateleiras de todas as gôndolas
  const { pecas, donoDaPeca } = useMemo(() => {
    const lista = [];
    const dono = [];
    const meio = GONDOLA.profundidade / 2;
    gondolas.forEach((g, gi) => {
      const add = (p, s, cor, topo = false) => { lista.push({ p, s, cor }); dono.push({ gi, topo }); };
      add([g.x, 0.05, g.z], [g.largura, 0.1, GONDOLA.profundidade + 0.08], COR.metalEscuro);
      add([g.x, GONDOLA.altura / 2, g.z - meio + 0.02], [g.largura, GONDOLA.altura, 0.04], COR.prateleira);
      for (let v = 0; v <= g.vaos; v += 1) {
        add([g.x0 + 0.05 + v * g.vao, GONDOLA.altura / 2, g.z], [0.05, GONDOLA.altura, GONDOLA.profundidade], COR.metal);
      }
      GONDOLA.niveis.forEach((y) => add([g.x, y, g.z], [g.largura - 0.04, 0.04, GONDOLA.profundidade], COR.prateleira));
      // faixa de identificação no topo, com a cor da marca
      add([g.x, GONDOLA.altura + 0.08, g.z], [g.largura, 0.16, GONDOLA.profundidade + 0.04], COR.marcaEscura, true);
    });
    return { pecas: lista, donoDaPeca: dono };
  }, [gondolas]);

  // caixas de todos os vãos (cor pela situação; destaque no hover/seleção)
  const { caixas, itemDaCaixa } = useMemo(() => {
    const lista = [];
    const dono = [];
    const claro = new Color("#ffffff");
    gondolas.forEach((g) => g.itens.forEach((item) => {
      const base = new Color(COR_SITUACAO[item.situacao] ?? COR_SITUACAO.ok);
      const realce = item.key === selecionado || item.key === hover?.key || destacados.has(item.key) || hover?.key === g.key;
      const cor = `#${(realce ? base.clone().lerp(claro, 0.32) : base).getHexString()}`;
      caixasDoVao(item, vao).forEach((c) => { lista.push({ ...c, cor }); dono.push(item.key); });
    }));
    return { caixas: lista, itemDaCaixa: dono };
  }, [gondolas, vao, selecionado, hover, destacados]);

  // Na estrutura, o ponto atingido diz o vão: prateleiras e colunas na frente de
  // uma caixa (vista de cima) contam como clique no remédio; a faixa do topo e
  // os vãos vazios selecionam o corredor.
  function alvoNaGondola(i, e) {
    const { gi, topo } = donoDaPeca[i];
    const g = gondolas[gi];
    const vao = Math.floor((e.point.x - g.x0 - 0.05) / g.vao);
    const item = topo ? null : g.itens[vao];
    if (item) {
      const dados = itensPorKey.get(item.key);
      return { key: item.key, p: [item.x, GONDOLA.altura + 0.5, item.z], texto: `${dados?.nomeCompleto ?? "Remédio"} · ${dados?.quantidade ?? 0} un.` };
    }
    return { key: g.key, p: [g.x, GONDOLA.altura + 0.6, g.z], texto: `Corredor ${String(g.numero).padStart(2, "0")} · ${g.categoria}` };
  }

  const gondolaSel = gondolas.find((g) => g.key === selecionado);
  const vaosEmDestaque = gondolas.flatMap((g) => g.itens
    .filter((i) => i.key === selecionado || destacados.has(i.key))
    .map((i) => ({ ...i, sel: i.key === selecionado })));

  return (
    <group>
      <CaixasInstanciadas
        itens={pecas}
        onClick={(i, e) => onSelecionar(alvoNaGondola(i, e).key)}
        onHover={(i, e) => onHover(alvoNaGondola(i, e))}
        onSair={() => onHover(null)}
      />
      <MedicineBoxes
        caixas={caixas}
        onClick={(i) => onSelecionar(itemDaCaixa[i])}
        onHover={(i) => {
          const key = itemDaCaixa[i];
          const item = itensPorKey.get(key);
          const local = gondolas.flatMap((g) => g.itens).find((x) => x.key === key);
          if (item && local) onHover({ key, p: [local.x, GONDOLA.altura + 0.5, local.z], texto: `${item.nomeCompleto} · ${item.quantidade} un.` });
        }}
        onSair={() => onHover(null)}
      />

      {/* vão vazio de remédio zerado: marcação no piso da prateleira */}
      {gondolas.flatMap((g) => g.itens.filter((i) => i.caixas === 0).map((i) => (
        <mesh key={`vazio-${i.key}`} position={[i.x, GONDOLA.niveis[0] + 0.03, i.z]} rotation-x={-Math.PI / 2}
          onClick={(e) => { if (e.delta > 4) return; e.stopPropagation(); onSelecionar(i.key); }}>
          <planeGeometry args={[vao * 0.8, GONDOLA.profundidade * 0.8]} />
          <meshBasicMaterial color={COR_SITUACAO.zerado} transparent opacity={0.35} />
        </mesh>
      )))}


      {gondolaSel && (
        <Contorno
          centro={[gondolaSel.x, GONDOLA.altura / 2 + 0.05, gondolaSel.z]}
          tamanho={[gondolaSel.largura + 0.12, GONDOLA.altura + 0.3, GONDOLA.profundidade + 0.2]}
          cor={COR.selecao}
        />
      )}
      {vaosEmDestaque.map((i) => (
        <Contorno
          key={`sel-${i.key}`}
          centro={[i.x, GONDOLA.altura / 2 + 0.02, i.z]}
          tamanho={[vao - 0.02, GONDOLA.altura + 0.1, GONDOLA.profundidade + 0.16]}
          cor={i.sel ? COR.selecao : COR.destaque}
        />
      ))}
    </group>
  );
}
