// Geometria do mundo 2D da jornada, em unidades do mundo (não em pixels).
// O mundo é uma cidade vertical: a estrada desce de cima para baixo. A câmera
// mostra só um recorte; a escala do recorte vem do tamanho da tela
// (ver useCameraVirtual.js).

export const MUNDO = { largura: 2000, altura: 5200 };
export const CENTRO_X = 1000;

// Pontos de passagem da estrada com a direção em cada um. Cada trecho vira
// uma curva Bézier com as alças na direção da tangente, então as emendas
// não quebram. A progressão é sempre para baixo; as curvas vão aos lados.
const PASSAGENS = [
  { x: 1000, y: 640, tx: 0, ty: 1 },
  { x: 1230, y: 1320, tx: 0.45, ty: 1 },
  { x: 1000, y: 2050, tx: -0.55, ty: 1 },
  { x: 760, y: 2760, tx: 0, ty: 1 },
  { x: 990, y: 3460, tx: 0.5, ty: 1 },
  { x: 1180, y: 4080, tx: 0.1, ty: 1 },
  { x: 1100, y: 4620, tx: 0, ty: 1 },
];

function montarRota(pontos) {
  const unit = ({ tx, ty }) => {
    const n = Math.hypot(tx, ty);
    return { x: tx / n, y: ty / n };
  };
  let d = `M ${pontos[0].x} ${pontos[0].y}`;
  for (let i = 0; i < pontos.length - 1; i += 1) {
    const a = pontos[i];
    const b = pontos[i + 1];
    const alca = Math.hypot(b.x - a.x, b.y - a.y) * 0.36;
    const ta = unit(a);
    const tb = unit(b);
    const c1 = { x: a.x + ta.x * alca, y: a.y + ta.y * alca };
    const c2 = { x: b.x - tb.x * alca, y: b.y - tb.y * alca };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${b.x} ${b.y}`;
  }
  return d;
}

export const ROTA = montarRota(PASSAGENS);
export const INICIO = { x: PASSAGENS[0].x, y: PASSAGENS[0].y };
export const FIM = { x: PASSAGENS.at(-1).x, y: PASSAGENS.at(-1).y };

// A estrada continua antes da fornecedora e depois da solicitante
export const RUAS = [
  `M ${INICIO.x} -700 V ${INICIO.y}`,
  `M ${FIM.x} ${FIM.y} V ${MUNDO.altura}`,
];

// Quarteirões (x, y, largura, altura), nas colunas dos lados da estrada
export const PREDIOS = [
  // esquerda
  [120, 200, 240, 170], [120, 430, 240, 200], [120, 760, 200, 180], [400, 800, 220, 200],
  [120, 1100, 240, 220], [420, 1120, 200, 180], [120, 1380, 260, 200], [440, 1380, 180, 200],
  [80, 1720, 260, 200], [480, 1720, 170, 240], [80, 2000, 260, 260], [480, 2040, 160, 220],
  [80, 2340, 260, 220], [80, 2640, 260, 380], [480, 2660, 160, 200], [480, 2900, 160, 150],
  [80, 3160, 280, 220], [440, 3160, 220, 200], [80, 3440, 280, 260], [440, 3440, 220, 240],
  [80, 3760, 280, 220], [440, 3740, 220, 240], [80, 4020, 280, 230], [440, 4040, 220, 200],
  [80, 4360, 300, 260], [460, 4380, 220, 240], [80, 4700, 300, 240], [460, 4700, 240, 220],
  [80, 5000, 600, 160],
  // direita
  [1340, 110, 240, 180], [1640, 140, 260, 220], [1640, 440, 260, 240], [1440, 760, 160, 240],
  [1640, 760, 260, 260], [1400, 1080, 200, 220], [1640, 1080, 260, 240], [1420, 1380, 180, 220],
  [1660, 1380, 240, 220], [1380, 1720, 220, 220], [1660, 1720, 240, 260], [1360, 2020, 240, 240],
  [1660, 2040, 240, 220], [1340, 2320, 260, 240], [1660, 2320, 240, 260], [1660, 2640, 240, 200],
  [1360, 2880, 240, 160], [1660, 2880, 240, 170], [1340, 3160, 210, 220], [1680, 3160, 240, 240],
  [1360, 3440, 200, 240], [1680, 3460, 240, 220], [1380, 3740, 190, 220], [1680, 3740, 240, 240],
  [1400, 4000, 170, 240], [1680, 4020, 240, 220], [1560, 4380, 340, 240], [1560, 4700, 340, 260],
  [1240, 4820, 240, 200], [1240, 5040, 660, 120],
];

// As duas farmácias, à direita da estrada (a lateral esquerda fica livre
// para os textos). `porta` é onde as caixas passam; `lado` é a parede da porta.
export const FORNECEDORA = {
  nome: "Farmácia Pedro João Neto",
  papel: "Fornecedora",
  x: 1100, y: 400, largura: 280, altura: 240,
  porta: { x: 1100, y: 590 },
  lado: "esquerda",
};
export const SOLICITANTE = {
  nome: "Drogaria Bem Estar",
  papel: "Solicitante",
  x: 1200, y: 4480, largura: 300, altura: 260,
  porta: { x: 1200, y: 4600 },
  lado: "esquerda",
};

// Posições das caixas na caçamba, no sistema do caminhão (centro em 0,0,
// frente para +x)
export const VAGAS = [[-52, -8], [-32, -8], [-12, -8]];

// Enquadramentos fixos do começo e do fim (ponto do mundo que a câmera
// mira): o caminhão e a farmácia de cada ponta
export const QUADRO_INICIO = { x: 1120, y: 520 };
export const QUADRO_FIM = { x: 1220, y: 4600 };

// Campo de visão: altura visível em unidades do mundo e largura mínima
// visível (telas estreitas e altas). Onde o caminhão fica na tela (fração
// da largura e da altura) com e sem espaço lateral para o texto.
export const CAMPO = {
  largo: { altura: 1000, alvoX: 0.6, alvoY: 0.48 },
  estreito: { altura: 960, larguraMinima: 640, alvoX: 0.5, alvoY: 0.64 },
};
