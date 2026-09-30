// Rótulos, datas e regras de exibição de medicamentos e estoque,
// compartilhados por admin, gerente e funcionário.

export const TARJAS = {
  sem_tarja: { label: "Venda livre", tone: "livre" },
  vermelha: { label: "Tarja vermelha · Venda sob prescrição", tone: "vermelha" },
  vermelha_retencao: { label: "Tarja vermelha · Retenção de receita", tone: "retencao" },
  preta: { label: "Tarja preta · Controlado", tone: "preta" },
};

export const TIPOS = {
  referencia: "Referência",
  generico: "Genérico",
  similar: "Similar",
};

export const SITUACOES = {
  ok: { label: "Em estoque", tone: "green" },
  critico: { label: "Crítico", tone: "orange" },
  zerado: { label: "Zerado", tone: "red" },
};

export const FORMAS_FARMACEUTICAS = [
  "comprimido", "comprimido revestido", "cápsula", "xarope", "solução oral",
  "suspensão", "gotas", "pomada", "creme", "injetável",
];
export const VIAS_ADMINISTRACAO = ["oral", "tópica", "injetável", "nasal", "oftálmica", "retal"];

export const tarja = (valor) => TARJAS[valor] ?? TARJAS.sem_tarja;
export const tipo = (valor) => TIPOS[valor] ?? valor ?? "";
export const situacao = (valor) => SITUACOES[valor] ?? { label: valor || "—", tone: "neutral" };

// Datas de cadastro vêm em UTC ("AAAA-MM-DD HH:MM:SS")
export function formatarDataHora(valor) {
  if (!valor) return "—";
  const data = new Date(`${String(valor).replace(" ", "T")}Z`);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR");
}

// Validade é só data ("AAAA-MM-DD"): exibe sem converter fuso
export function formatarValidade(valor) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || "");
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : "—";
}

// Registro ANVISA: 13 dígitos no formato 9.9999.9999.999-9
export const digitosAnvisa = (valor) => String(valor || "").replace(/\D/g, "").slice(0, 13);
export function mascaraAnvisa(valor) {
  const d = digitosAnvisa(valor);
  const partes = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 9), d.slice(9, 12)].filter(Boolean);
  let texto = partes.join(".");
  if (d.length > 12) texto += `-${d.slice(12)}`;
  return texto;
}

// Foto do remédio: JPEG, PNG ou WebP até 5 MB (mesma regra do back)
export function validarFoto(arquivo) {
  if (!arquivo) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) return "Use uma imagem JPEG, PNG ou WebP.";
  if (arquivo.size > 5 * 1024 * 1024) return "A foto deve ter no máximo 5 MB.";
  return "";
}

// Vencidos, zerados e críticos primeiro; depois por nome
const peso = (item) => (item.vencido ? 0 : item.situacao === "zerado" ? 1 : item.situacao === "critico" ? 2 : 3);
export const ordenarEstoque = (itens = []) =>
  [...itens].sort((a, b) => peso(a) - peso(b) || String(a.nomeRemedio).localeCompare(String(b.nomeRemedio), "pt-BR"));

// Sugestão de reposição: o suficiente para chegar ao dobro do mínimo
export const quantidadeReposicao = (item) => Math.max(Number(item.estoqueMinimo) * 2 - Number(item.quantidade), 1);
export const precisaReposicao = (item) => item.situacao === "critico" || item.situacao === "zerado";
export const prioridadeReposicao = (item) => (item.situacao === "zerado" ? "urgente" : "alta");

// Pedido de reposição já preenchido a partir de itens do estoque (críticos/zerados)
export function reposicaoDoEstoque(itens) {
  return {
    itensIniciais: itens.map((item) => ({ idRemedio: item.idRemedio, quantidade: quantidadeReposicao(item) })),
    prioridadeInicial: itens.some((item) => item.situacao === "zerado" || Number(item.quantidade) === 0)
      ? "urgente"
      : prioridadeReposicao(itens[0]),
  };
}

export const nomeComDosagem = (item) =>
  [item.nomeRemedio, item.dosagemRemedio].filter(Boolean).join(" ");
