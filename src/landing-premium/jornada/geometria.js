// Geometria do mundo 2D da jornada, em unidades do mundo (não em pixels).
// A câmera mostra só um recorte dele; a escala do recorte vem do tamanho da
// janela na tela (ver useCameraVirtual.js).

export const MUNDO = { largura: 3400, altura: 1500 };

// Rota do carrinho: curvas Bézier com as tangentes casadas em cada emenda,
// começando e terminando na horizontal (o carrinho estaciona reto).
export const ROTA = [
  "M 520 1000",
  "C 760 1000 860 1000 980 900",
  "C 1100 800 1120 640 1280 600",
  "C 1440 560 1640 600 1760 700",
  "C 1880 800 1900 980 2100 1020",
  "C 2300 1060 2480 980 2600 860",
  "C 2700 760 2760 700 2900 700",
  "L 2980 700",
].join(" ");

export const INICIO = { x: 520, y: 1000 };
export const FIM = { x: 2980, y: 700 };

// Ruas: a rota é a rua principal; as outras dão a ideia de bairro e cruzamentos
export const RUAS = [
  "M 160 1000 H 520",
  "M 2980 700 H 3400",
  "M 760 1000 V 1500",
  "M 1280 600 V 120",
  "M 860 360 H 2380",
  "M 2100 1020 V 1500",
  "M 2600 860 V 1500",
];

// Quarteirões (x, y, largura, altura), longe das ruas
export const PREDIOS = [
  [110, 700, 170, 190], [110, 1110, 230, 180], [430, 1100, 250, 190],
  [820, 1090, 230, 200], [1100, 1100, 300, 230], [1000, 430, 210, 140],
  [1330, 410, 200, 120], [1440, 760, 230, 200], [1730, 1140, 290, 200],
  [1590, 410, 200, 130], [1900, 430, 240, 170], [2200, 1120, 300, 200],
  [2310, 560, 210, 170], [2680, 900, 240, 210], [2700, 1180, 300, 190],
  [2430, 120, 260, 170], [3200, 840, 170, 220], [3200, 200, 170, 230],
  [880, 120, 300, 170], [1360, 120, 280, 170], [1760, 120, 300, 170],
];

// Árvores (x, y, raio)
export const ARVORES = [
  [330, 940, 20], [690, 930, 18], [700, 1320, 24], [960, 1000, 0],
  [1060, 980, 22], [1180, 760, 18], [1360, 680, 20], [1700, 585, 18],
  [1640, 1000, 26], [1850, 640, 18], [1990, 1110, 22], [2240, 960, 18],
  [2420, 1080, 24], [2560, 760, 18], [2820, 620, 20], [3130, 760, 22],
  [920, 300, 18], [1540, 300, 20], [2140, 300, 22], [2860, 1110, 22],
  [400, 1360, 26], [1500, 1380, 24], [2350, 1400, 26], [3250, 1150, 24],
].filter(([, , r]) => r > 0);

// Placas nos cruzamentos (x, y)
export const PLACAS = [[1310, 560], [2130, 1060], [790, 1050]];

// As duas farmácias: fachada voltada para a rua, porta onde as caixas passam
export const FORNECEDORA = {
  nome: "Farmácia Pedro João Neto",
  papel: "Fornecedora",
  x: 340, y: 700, largura: 300, altura: 200,
  porta: { x: 490, y: 900 },
};
export const SOLICITANTE = {
  nome: "Drogaria Bem Estar",
  papel: "Solicitante",
  x: 2860, y: 400, largura: 300, altura: 200,
  porta: { x: 3010, y: 600 },
};

// Posições das três caixas na caçamba, no sistema do carrinho (centro em 0,0,
// frente para +x)
export const VAGAS = [[-32, -7], [-16, -7], [0, -7]];

// Enquadramentos fixos do começo e do fim (centro da câmera)
export const QUADRO_INICIO = { x: 520, y: 880 };
export const QUADRO_FIM = { x: 3000, y: 620 };

// Quanto do mundo cabe na altura da janela (o resto da escala sai da largura)
export const ALTURA_VISIVEL = { larga: 640, estreita: 540 };
// Em janelas estreitas, nunca menos que isto de largura visível
export const LARGURA_MINIMA = 480;
