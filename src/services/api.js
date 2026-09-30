// Cliente único da API do Intermedi. Todas as personas (admin, gerente e
// funcionário) consultam os mesmos endpoints por aqui, para que abas iguais
// mostrem os mesmos dados.
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...options.headers },
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error(`Não foi possível conectar ao servidor (${API_URL}).`, { cause: error });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // status permite tratar casos específicos (ex.: 409 chamado já respondido)
    throw Object.assign(
      new Error(payload.error || payload.message || payload.mensagem || `Erro ${response.status} na API.`),
      { status: response.status },
    );
  }
  return payload;
}

// A API responde listas de formas diferentes: array puro ou { remedios: [...] },
// { paciente: [...] } etc. Esta função aceita todas.
function extractList(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of [...keys, "data", "resultados"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  throw new Error("O servidor não retornou uma lista válida.");
}

const list = (path, keys) => async (options) => extractList(await apiRequest(path, options), keys);

export const listarPacientes = list("/paciente", ["paciente", "pacientes"]);
export const listarFuncionarios = list("/funcionario", ["funcionario", "funcionarios"]);
export const listarGerentes = list("/gerente", ["gerente", "gerentes"]);
export const listarFarmacias = list("/farmacia", ["farmacia", "farmacias"]);
export const listarServicos = list("/servicos", ["servicos", "servico"]);

// Estoque e validade ainda não existem na API; ficam null até o endpoint de
// estoque por farmácia ser criado.
export function normalizeRemedio(item) {
  const quantity = item.quantidade ?? item.quantity;
  const minimum = item.estoque_minimo ?? item.estoqueMinimo ?? item.minimum;
  return {
    id: String(item.idRemedio ?? item.id_remedio ?? item.id ?? ""),
    name: item.nomeRemedio ?? item.nome ?? item.name ?? "Medicamento sem nome",
    dose: item.dosagemRemedio ?? item.dosagem ?? item.dose ?? "",
    manufacturer: item.fabricanteRemedio ?? item.fabricante ?? "",
    description: item.descRemedio ?? item.descricao ?? "",
    categories: item.categorias ?? "",
    unit: item.nomeFarmacia ?? item.unit ?? null,
    quantity: quantity === null || quantity === undefined || quantity === "" ? null : Number(quantity),
    minimum: minimum === null || minimum === undefined || minimum === "" ? null : Number(minimum),
    expiry: item.validade ?? item.expiry ?? null,
  };
}

export async function listarRemedios(options) {
  const lista = extractList(await apiRequest("/remedios", options), ["remedios", "remedio"]);
  return lista.map(normalizeRemedio);
}

export function cadastrarRemedio(dados) {
  return apiRequest("/remedios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
}

// Chamados de reposição: o funcionário solicita e o gerente da farmácia responde.
export const solicitarChamado = (idFuncionario, body) =>
  apiRequest(`/funcionario/${idFuncionario}/chamado`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const listarChamadosFuncionario = (idFuncionario, status, options) =>
  apiRequest(`/funcionario/${idFuncionario}/chamados${status ? `?status=${status}` : ""}`, options);
export const listarChamadosGerente = (idGerente, status, options) =>
  apiRequest(`/gerente/${idGerente}/chamados${status ? `?status=${status}` : ""}`, options);
export const responderChamado = (idChamado, body) =>
  apiRequest(`/chamado/${idChamado}/responder`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export function normalizePaciente(item) {
  return {
    id: String(item.idPaciente ?? item.id ?? ""),
    name: item.nomePaciente ?? item.name ?? item.nome ?? "Paciente",
    photo: item.fotoPerfilPaciente ?? item.photo,
    cpf: item.cpfPaciente ?? item.cpf ?? "",
    email: item.emailPaciente ?? item.email ?? "",
    phone: item.telPaciente ?? item.telefonePaciente ?? item.phone ?? "",
    city: item.cidadePaciente ?? item.cidade ?? "",
    state: item.estadoPaciente ?? item.estado ?? "",
    frequentMedicine: item.medicamentoFrequentePaciente ?? "",
    createdAt: item.createdAtPaciente ?? item.createdAt ?? "",
  };
}

export function normalizeFuncionario(item) {
  return {
    id: String(item.idFuncionario ?? item.id ?? ""),
    name: item.nomeFuncionario ?? item.name ?? item.nome ?? "Funcionário",
    photo: item.fotoPerfilFuncionario ?? item.photo,
    role: item.cargoFuncionario ?? item.role ?? "Funcionário",
    shift: item.turnoFuncionario ?? item.shift ?? "",
    email: item.emailFuncionario ?? item.email ?? "",
    phone: item.telFuncionario ?? item.phone ?? "",
    matricula: item.matriculaFuncionario ?? item.matricula ?? "",
    farmaciaId: String(item.fkIdFarmacia ?? item.idFarmacia ?? item.farmaciaId ?? ""),
  };
}

// Busca sem acento e sem diferenciar maiúsculas.
export const normalizeText = (value = "") =>
  String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
