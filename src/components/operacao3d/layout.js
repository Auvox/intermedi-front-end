// Planta da farmácia na cena 3D (unidades ≈ metros; x para a direita, z para a
// frente da tela, y para cima). É uma planta estilizada e igual para todas as
// unidades: só o conteúdo (corredores, caixas, equipe, entregas) vem dos dados.
import { CAPACIDADE_VAO, progressoEntrega } from "../../services/operacao";

export const PREDIO = { x0: -15, x1: 15, z0: -10, z1: 10, parede: 2.6 };

// rotuloEm: onde o nome da zona aparece no piso [x, z]
export const ZONAS = {
  estoque: { x0: -14.4, x1: 4.6, z0: -9.4, z1: -0.5, rotulo: "Estoque", rotuloEm: [3.4, -0.9] },
  doca: { x0: 6.4, x1: 14.6, z0: -9.4, z1: -1.4, rotulo: "Doca de recebimento", rotuloEm: [10.6, -8.7] },
  atendimento: { x0: -10.6, x1: 5.6, z0: 0.6, z1: 9.4, rotulo: "Atendimento", rotuloEm: [-2.5, 8.95] },
  gerencia: { x0: 7.2, x1: 14.6, z0: 0.4, z1: 5.4, rotulo: "Gerência", rotuloEm: [12.6, 4.95] },
  equipe: { x0: -14.4, x1: -11.2, z0: 0.6, z1: 9.4, rotulo: "Equipe", rotuloEm: [-12.8, 9.05] },
};

// Balcões de atendimento (frente para +z, onde fica a entrada)
export const BALCOES = [
  { key: "balcao:1", x: -7.2, z: 3 },
  { key: "balcao:2", x: -3.4, z: 3 },
  { key: "balcao:3", x: 0.4, z: 3 },
];
export const ORIENTACAO = { key: "balcao:orientacao", x: 3.4, z: 7.2 };
export const MESA_GERENTE = { x: 11, z: 2.6 };
export const MESA_EQUIPE = { x: -12.8, z: 7.3 };

// Doca: duas portas na parede direita e a rua do lado de fora
export const PORTAS_DOCA = [-7.2, -3.8];
export const CAMINHAO = { naDoca: 18.4, longe: 31 };
// Preparo do envio: as caixas separadas ficam num palete na frente de cada
// porta; o funcionário leva uma por viagem até a traseira do caminhão.
export const SEPARACAO_X = 12.1;
export const TRASEIRA_X = 15.6;
// Paletes de recebimento, entre as duas faixas das portas
export const PALETES_DOCA = [[8.6, -5.5], [10.6, -5.5]];

// Gôndolas do estoque
export const GONDOLA = {
  vao: 1.15,
  profundidade: 0.62,
  niveis: [0.14, 0.62, 1.1, 1.58], // altura do tampo de cada prateleira
  altura: 2.05,
  caixa: [0.48, 0.34, 0.4],
};
const FILEIRAS_Z = [-8.4, -5.2, -2];
const ESTOQUE_X = [-13.9, 4.1];
const ESPACO_ENTRE = 0.9;
const MIN_VAOS = 3;

// Corredores → gôndolas posicionadas em fileiras. Se não couber, estreita os vãos.
export function layoutEstoque(corredores) {
  let vao = GONDOLA.vao;
  for (let tentativa = 0; tentativa < 8; tentativa += 1) {
    const gondolas = [];
    let fileira = 0;
    let x = ESTOQUE_X[0];
    let cabe = true;
    for (const corredor of corredores) {
      const vaos = Math.max(MIN_VAOS, corredor.itens.length);
      const largura = vaos * vao + 0.1;
      if (x + largura > ESTOQUE_X[1] && x > ESTOQUE_X[0]) {
        fileira += 1;
        x = ESTOQUE_X[0];
      }
      if (fileira >= FILEIRAS_Z.length || largura > ESTOQUE_X[1] - ESTOQUE_X[0]) {
        cabe = false;
        break;
      }
      const z = FILEIRAS_Z[fileira];
      gondolas.push({
        key: corredor.key,
        numero: corredor.numero,
        categoria: corredor.categoria,
        x0: x,
        x: x + largura / 2,
        z,
        largura,
        vaos,
        vao,
        itens: corredor.itens.map((item, i) => ({
          key: item.key,
          situacao: item.situacao,
          caixas: item.caixas,
          x: x + 0.05 + i * vao + vao / 2,
          z,
        })),
      });
      x += largura + ESPACO_ENTRE;
    }
    if (cabe) return { gondolas, vao };
    vao *= 0.85;
  }
  return { gondolas: [], vao };
}

// Onde cada caixa fica no vão: 2 por prateleira, de baixo para cima
export function caixasDoVao(item, vao) {
  const escala = vao / GONDOLA.vao;
  const [w, h, d] = GONDOLA.caixa;
  const lista = [];
  for (let i = 0; i < Math.min(item.caixas, CAPACIDADE_VAO); i += 1) {
    const nivel = Math.floor(i / 2);
    const lado = i % 2 === 0 ? -1 : 1;
    lista.push({
      p: [item.x + lado * 0.27 * escala, GONDOLA.niveis[nivel] + 0.03 + h / 2, item.z + 0.03],
      s: [w * escala, h, d],
    });
  }
  return lista;
}

// Posição de cada pessoa da equipe conforme o posto (operacao.funcionarios[].posto)
// em fila ao longo de z: de frente para a câmera, as etiquetas não se cobrem
const LUGARES_EQUIPE = [[-12.9, 1.5], [-12.9, 3.5], [-12.9, 5.5], [-14, 9], [-11.8, 9]];
export function layoutEquipe(funcionarios) {
  const posicoes = new Map();
  let equipe = 0;
  let estoque = 0;
  let apoio = 0;
  for (const f of funcionarios) {
    const { posto } = f;
    let pos;
    if (posto.tipo === "balcao") {
      const b = BALCOES[posto.numero - 1];
      pos = [b.x, 0, b.z - 1.1];
    } else if (posto.tipo === "orientacao") pos = [ORIENTACAO.x, 0, ORIENTACAO.z - 1];
    else if (posto.tipo === "estoque") {
      pos = [-10 + (estoque % 4) * 4.2, 0, estoque < 4 ? -3.6 : -6.8];
      estoque += 1;
    } else if (posto.tipo === "doca") {
      pos = [SEPARACAO_X + 1.8, 0, -5.5];
    } else if (posto.tipo === "apoio") {
      pos = [2.6 + (apoio % 3) * 0.9, 0, 1.2];
      apoio += 1;
    } else {
      const [x, z] = LUGARES_EQUIPE[equipe % LUGARES_EQUIPE.length];
      pos = [x + Math.floor(equipe / LUGARES_EQUIPE.length) * 0.5, 0, z];
      equipe += 1;
    }
    posicoes.set(f.key, pos);
  }
  return posicoes;
}

// Pacientes sendo atendidos (só decoração; aparecem quando o status é "em atendimento")
export function pacientesEmAtendimento(funcionarios, posicoes) {
  return funcionarios
    .filter((f) => f.status.id === "atendimento" && ["balcao", "orientacao"].includes(f.posto.tipo))
    .map((f) => {
      const [x, , z] = posicoes.get(f.key);
      return { key: `paciente-de:${f.key}`, p: [x, 0, z + (f.posto.tipo === "balcao" ? 2.2 : 1.9)] };
    });
}

// Caminhões: até 2, um por porta da doca (pela ordem do pedido, para não
// trocarem de faixa). Sempre andam de frente (a cabine vai na frente):
//   saída (esta farmácia envia): parado na doca de ré enquanto é carregado
//     (estado "aguardando" ou "carregando") e depois segue para a rua;
//   entrada (esta farmácia pediu): vem da rua até a doca.
// rotY: π vira o caminhão para a cabine apontar para a doca.
export function layoutEntregas(entregas, agora) {
  const distancia = CAMINHAO.longe - CAMINHAO.naDoca;
  return entregas
    .map((e) => {
      const p = progressoEntrega(e, agora);
      if (p !== null) {
        const x = e.sentido === "entrada" ? CAMINHAO.longe - p * distancia : CAMINHAO.naDoca + p * distancia;
        return { key: e.key, x, sentido: e.sentido, estado: "viajando", rotY: e.sentido === "entrada" ? Math.PI : 0 };
      }
      if (e.sentido === "saida" && ["aprovada", "preparando"].includes(e.status)) {
        return { key: e.key, x: CAMINHAO.naDoca, sentido: "saida", estado: e.status === "preparando" ? "carregando" : "aguardando", rotY: 0 };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.key.split(":")[1]) - Number(b.key.split(":")[1]))
    .slice(0, PORTAS_DOCA.length)
    .map((c, i) => ({ ...c, z: PORTAS_DOCA[i] }));
}

// Câmera: pontos de vista prontos
export const VISTAS = {
  geral: { rotulo: "Visão geral", posicao: [17, 21, 26.5], alvo: [2, 0, -0.5] },
  estoque: { rotulo: "Estoque", posicao: [-4.5, 15, 9], alvo: [-4.8, 0, -5] },
  atendimento: { rotulo: "Atendimento", posicao: [-2, 12, 17], alvo: [-3, 0, 4.5] },
  doca: { rotulo: "Doca", posicao: [26, 15, 9], alvo: [15, 0, -5] },
  gerencia: { rotulo: "Gerência", posicao: [17, 11, 13], alvo: [10.6, 0, 2.6] },
};

// Ponto para onde a câmera olha ao selecionar algo
export function alvoDoObjeto(chave, cena) {
  if (!chave) return null;
  const [tipo] = chave.split(":");
  if (tipo === "remedio") {
    for (const g of cena.estoque.gondolas) {
      const item = g.itens.find((i) => i.key === chave);
      if (item) return [item.x, 1, item.z];
    }
  }
  if (tipo === "corredor") {
    const g = cena.estoque.gondolas.find((g) => g.key === chave);
    if (g) return [g.x, 1, g.z];
  }
  if (tipo === "funcionario") {
    const p = cena.equipe.get(chave);
    if (p) return [p[0], 1, p[2]];
  }
  if (tipo === "balcao") {
    const b = BALCOES.find((b) => b.key === chave) ?? (chave === ORIENTACAO.key ? ORIENTACAO : null);
    if (b) return [b.x, 0.8, b.z];
  }
  if (tipo === "entrega") {
    const c = cena.caminhoes.find((c) => c.key === chave);
    return c ? [c.x, 1, c.z] : [13, 0, -5.5];
  }
  if (tipo === "chamado") {
    const autor = cena.autorDoChamado.get(chave);
    const p = autor && cena.equipe.get(autor);
    return p ? [p[0], 1, p[2]] : [MESA_GERENTE.x, 1, MESA_GERENTE.z];
  }
  if (tipo === "chamados" || tipo === "gerente") return [MESA_GERENTE.x, 1, MESA_GERENTE.z];
  return null;
}
