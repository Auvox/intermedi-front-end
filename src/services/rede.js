import { apiRequest } from "./api";
import { tokenAdmin } from "./desempenho";
import MUNICIPIOS_SP from "../data/municipiosSP";
import DIVISOES_MUNICIPIOS from "../data/divisoesMunicipios";

// Aba "Simulação em tempo real" do admin: as farmácias no mapa de SP e os
// pedidos entre elas, ao vivo ou em qualquer momento do passado.

// farmácias e pedidos (com todos os horários) dos últimos `dias`
export function buscarRede(dias, options = {}) {
  const token = tokenAdmin();
  const headers = token ? { ...options.headers, Authorization: `Bearer ${token}` } : options.headers;
  return apiRequest(`/analytics/rede?dias=${dias}`, { ...options, headers });
}

// --- mapa ---------------------------------------------------------------

// O mapa-svg.svg é o mapa de localização de SP da Wikipédia (equirretangular).
// Calibrado com as sedes dos 645 municípios (IBGE): erro mediano de ~4 km.
export const projetar = (lat, lon) => [31324.91 * lon + 1667119.79, -33831.57 * lat - 666423.65];

// enquadramentos prontos (viewBox do mapa-svg.svg; mesma proporção do estado)
const PROPORCAO = 279280 / 186672;
function enquadrar(latNorte, lonOeste, latSul, lonLeste) {
  const [x1, y1] = projetar(latNorte, lonOeste);
  const [x2, y2] = projetar(latSul, lonLeste);
  let largura = x2 - x1;
  let altura = y2 - y1;
  if (largura / altura > PROPORCAO) altura = largura / PROPORCAO;
  else largura = altura * PROPORCAO;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return [cx - largura / 2, cy - altura / 2, largura, altura];
}
export const ENQUADRAMENTOS = {
  estado: [4140, 2966, 279280, 186672],
  grandeSp: enquadrar(-23.25, -47.0, -24.05, -45.95),
};

// enquadra todas as farmácias da rede, com folga (no mínimo ~3 km de largura)
export function enquadrarFarmacias(farmacias) {
  const comLugar = farmacias.filter((f) => f.latitude != null && f.longitude != null);
  if (!comLugar.length) return ENQUADRAMENTOS.estado;
  const lats = comLugar.map((f) => f.latitude);
  const lons = comLugar.map((f) => f.longitude);
  const [norte, sul, oeste, leste] = [Math.max(...lats), Math.min(...lats), Math.min(...lons), Math.max(...lons)];
  const folga = Math.max(0.012, (leste - oeste) * 0.6, (norte - sul) * 0.6);
  return enquadrar(norte + folga, oeste - folga, sul - folga, leste + folga);
}

const normalizar = (texto) =>
  String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const CODIGO_POR_NOME = new Map(Object.entries(MUNICIPIOS_SP).map(([codigo, nome]) => [normalizar(nome), codigo]));
export const codigoDoMunicipio = (cidade) => CODIGO_POR_NOME.get(normalizar(cidade)) ?? null;
export const nomeDoMunicipio = (codigo) => MUNICIPIOS_SP[codigo] ?? "";
// todas as cidades, em ordem alfabética (busca no mapa)
export const LISTA_MUNICIPIOS = Object.entries(MUNICIPIOS_SP)
  .map(([codigo, nome]) => ({ codigo, nome }))
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

// --- pedidos no tempo ----------------------------------------------------

const ms = (iso) => (iso ? Date.parse(iso) : null);
const ENCERRADOS = new Set(["recusada", "cancelada"]);

export function prepararRede({ farmacias = [], pedidos = [] }) {
  const lista = farmacias.map((f) => {
    const temCoordenada = f.latitude != null && f.longitude != null;
    const [x, y] = temCoordenada ? projetar(f.latitude, f.longitude) : [null, null];
    return { ...f, x, y, codigo: codigoDoMunicipio(f.cidade) };
  });
  const porId = new Map(lista.map((f) => [f.idFarmacia, f]));
  return {
    farmacias: lista,
    porId,
    pedidos: pedidos
      .map((p) => ({
        ...p,
        sol: ms(p.solicitadoEm),
        env: ms(p.enviadoEm),
        prev: ms(p.previstoEm),
        rec: ms(p.recebidoEm),
        origem: porId.get(p.idOrigem),
        destino: porId.get(p.idDestino),
      }))
      .filter((p) => p.origem && p.destino),
  };
}

// quando o pedido saiu e quando chegou (ou deve chegar)
const chegada = (p) => p.rec ?? p.prev;

// o pedido está na estrada no instante t?
export function estaACaminho(p, t) {
  if (p.env == null || p.env > t || ENCERRADOS.has(p.status)) return false;
  const fim = chegada(p);
  return fim == null ? p.status !== "recebida" : t < fim;
}

// quanto do caminho já percorreu (0 a 1); sem previsão, null
export function progresso(p, t) {
  const fim = chegada(p);
  if (p.env == null || fim == null || fim <= p.env) return null;
  return Math.min(1, Math.max(0, (t - p.env) / (fim - p.env)));
}

// marcos de cada pedido na linha do tempo
export function eventosDoPedido(p) {
  const eventos = [{ tipo: "pedido", em: p.sol }];
  if (p.env != null && !ENCERRADOS.has(p.status)) eventos.push({ tipo: "envio", em: p.env });
  const fim = p.rec ?? (p.status === "recebida" ? p.prev : null);
  if (fim != null) eventos.push({ tipo: "chegada", em: fim });
  return eventos.filter((e) => e.em != null).map((e) => ({ ...e, pedido: p }));
}

// --- métricas por município ----------------------------------------------

// quando o pedido conta para cada métrica e em qual ponta (origem ou destino)
export const METRICAS = {
  recebeu: {
    rotulo: "Recebeu",
    titulo: "Onde mais recebe remédios",
    unidade: "unidades recebidas",
    lado: "destino",
    parceiro: "origem",
    quando: (p) => (ENCERRADOS.has(p.status) ? null : p.rec ?? (p.status === "recebida" ? p.prev : null)),
    valor: (p) => p.quantidade,
  },
  enviou: {
    rotulo: "Enviou",
    titulo: "Onde mais envia remédios",
    unidade: "unidades enviadas",
    lado: "origem",
    parceiro: "destino",
    quando: (p) => (ENCERRADOS.has(p.status) ? null : p.env),
    valor: (p) => p.quantidade,
  },
  pediu: {
    rotulo: "Pediu",
    titulo: "Onde mais pede à rede",
    unidade: "pedidos feitos",
    lado: "destino",
    parceiro: "origem",
    quando: (p) => p.sol,
    valor: () => 1,
  },
};

// soma da métrica por município entre `inicio` e `fim` (com o filtro de remédio);
// `chave` troca o agrupamento (ex.: por distrito da farmácia)
export function agregarPorMunicipio(pedidos, { metrica, idRemedio, inicio, fim, chave = (f) => f.codigo }) {
  const m = METRICAS[metrica];
  const porMunicipio = new Map();
  for (const p of pedidos) {
    if (idRemedio && String(p.idRemedio) !== String(idRemedio)) continue;
    const em = m.quando(p);
    if (em == null || em < inicio || em > fim) continue;
    const farmacia = p[m.lado];
    const codigo = chave(farmacia);
    if (!codigo) continue;
    const atual = porMunicipio.get(codigo) ?? { valor: 0, pedidos: 0, porFarmacia: new Map(), porRemedio: new Map(), parceiros: new Map() };
    const valor = m.valor(p);
    atual.valor += valor;
    atual.pedidos += 1;
    atual.porFarmacia.set(farmacia.idFarmacia, (atual.porFarmacia.get(farmacia.idFarmacia) ?? 0) + valor);
    const remedio = `${p.nomeRemedio}${p.dosagemRemedio ? ` ${p.dosagemRemedio}` : ""}`;
    atual.porRemedio.set(remedio, (atual.porRemedio.get(remedio) ?? 0) + valor);
    const parceiro = p[m.parceiro].cidade || "—";
    atual.parceiros.set(parceiro, (atual.parceiros.get(parceiro) ?? 0) + valor);
    porMunicipio.set(codigo, atual);
  }
  return porMunicipio;
}

// sobra (envia mais do que recebe) ou falta, por farmácia, até `fim`
export function saldoPorFarmacia(pedidos, { idRemedio, inicio, fim }) {
  const saldo = new Map();
  for (const p of pedidos) {
    if (idRemedio && String(p.idRemedio) !== String(idRemedio)) continue;
    const enviado = METRICAS.enviou.quando(p);
    if (enviado != null && enviado >= inicio && enviado <= fim) {
      saldo.set(p.idOrigem, (saldo.get(p.idOrigem) ?? 0) + p.quantidade);
    }
    const recebido = METRICAS.recebeu.quando(p);
    if (recebido != null && recebido >= inicio && recebido <= fim) {
      saldo.set(p.idDestino, (saldo.get(p.idDestino) ?? 0) - p.quantidade);
    }
  }
  return saldo;
}

// tons de amarelo, do mais claro ao mais escuro (todos os remédios)
export const ESCALA_AMARELO = ["#fdf4cf", "#fae39a", "#f5c94f", "#e0a213", "#b27500"];

// filtrando um remédio, o mapa ganha a cor dele: [matiz, saturação] em HSL
const COR_REMEDIO = {
  paracetamol: [270, 65], // roxo
  dipirona: [215, 75], // azul
  amoxicilina: [140, 55], // verde
  losartana: [355, 70], // vermelho
  metformina: [22, 85], // laranja
  omeprazol: [325, 65], // rosa
  ibuprofeno: [190, 75], // ciano
  loratadina: [90, 55], // verde-limão
  azitromicina: [240, 60], // índigo
  nimesulida: [28, 40], // marrom
  cetirizina: [168, 60], // turquesa
  enalapril: [340, 55], // vinho
  "vitamina c": [300, 55], // magenta
  simeticona: [200, 60], // azul-céu
  dexclorfeniramina: [152, 55], // esmeralda
};
const LUZ = [93, 81, 66, 50, 35];
export function escalaDoRemedio(nome) {
  if (!nome) return ESCALA_AMARELO;
  const texto = normalizar(nome);
  const chave = Object.keys(COR_REMEDIO).find((k) => texto.startsWith(k));
  const [matiz, saturacao] = COR_REMEDIO[chave] ?? [[...texto].reduce((s, c) => s + c.charCodeAt(0) * 7, 0) % 360, 60];
  return LUZ.map((luz) => `hsl(${matiz} ${saturacao}% ${luz}%)`);
}

export function corDoValor(valor, maximo, escala = ESCALA_AMARELO) {
  if (!valor || !maximo) return null;
  const nivel = Math.min(escala.length - 1, Math.floor(Math.sqrt(valor / maximo) * escala.length));
  return escala[nivel];
}

// --- distritos (zoom numa cidade) ------------------------------------------

// cidades com divisão interna desenhada (bairros ou distritos do Censo 2022 do
// IBGE, já nas coordenadas do mapa), baixada só quando a cidade é aberta
export const temDistritos = (codigo) => Boolean(DIVISOES_MUNICIPIOS[codigo]);
// "96 distritos", "23 bairros"
export const nomeDivisao = (codigo) => {
  const divisao = DIVISOES_MUNICIPIOS[codigo];
  return divisao ? `${divisao[1]} ${divisao[0]}` : "";
};

// busca do mapa: as 645 cidades e, depois, cada bairro ou distrito desenhado
const SINGULAR = { bairros: "Bairro", distritos: "Distrito" };
export const LISTA_BUSCA = [
  ...LISTA_MUNICIPIOS.map((m) => ({ id: m.codigo, codigo: m.codigo, nome: m.nome, detalhe: nomeDivisao(m.codigo) || "Cidade" })),
  ...Object.entries(DIVISOES_MUNICIPIOS)
    .flatMap(([codigo, [tipo, , nomes]]) =>
      nomes.map((nome) => ({ id: `${codigo}:${nome}`, codigo, divisao: nome, nome, detalhe: `${SINGULAR[tipo]} de ${MUNICIPIOS_SP[codigo]}` })))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
];

export async function carregarDistritos(codigo) {
  if (!temDistritos(codigo)) return null;
  const resposta = await fetch(`/divisoes/${codigo}.json`);
  if (!resposta.ok) return null;
  const lista = await resposta.json();
  return lista.map(({ nome, d }) => {
    const aneis = d.split("Z").filter(Boolean).map((anel) =>
      anel.replace("M", "").split("L").map((par) => par.split(",").map(Number)));
    const pontos = aneis.flat();
    const xs = pontos.map(([x]) => x);
    const ys = pontos.map(([, y]) => y);
    const caixa = [Math.min(...xs), Math.min(...ys)];
    caixa.push(Math.max(...xs) - caixa[0], Math.max(...ys) - caixa[1]);
    return { nome, d, aneis, caixa };
  });
}

// distrito que contém o ponto (raio cruzando as bordas)
export function distritoDoPonto(distritos, x, y) {
  const dentro = (anel) => {
    let sim = false;
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const [xi, yi] = anel[i];
      const [xj, yj] = anel[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) sim = !sim;
    }
    return sim;
  };
  return distritos.find((d) => d.aneis.some(dentro))?.nome ?? null;
}
