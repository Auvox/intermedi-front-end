// Cliente único da API do Intermedi. Todas as personas (admin, gerente e
// funcionário) consultam os mesmos endpoints por aqui, para que abas iguais
// mostrem os mesmos dados.
export const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

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

// Cadastros mais novos primeiro: o id maior é o último cadastrado
export const maisNovosPrimeiro = (lista, campoId) =>
  [...lista].sort((a, b) => (Number(b?.[campoId] ?? b?.id) || 0) - (Number(a?.[campoId] ?? a?.id) || 0));

const list = (path, keys, campoId) => async (options) =>
  maisNovosPrimeiro(extractList(await apiRequest(path, options), keys), campoId);

export const listarPacientes = list("/paciente", ["paciente", "pacientes"], "idPaciente");
export const listarFuncionarios = list("/funcionario", ["funcionario", "funcionarios"], "idFuncionario");
export const listarGerentes = list("/gerente", ["gerente", "gerentes"], "idGerente");
export const listarFarmacias = list("/farmacia", ["farmacia", "farmacias"], "idFarmacia");
export const listarServicos = list("/servicos", ["servicos", "servico"], "idServico");

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
  return maisNovosPrimeiro(lista, "idRemedio").map(normalizeRemedio);
}

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body !== undefined && { body: JSON.stringify(body) }),
});

// Monta "?busca=x&situacao=y" ignorando filtros vazios
function query(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && String(valor).trim() !== "") params.set(chave, String(valor).trim());
  });
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

// Foto do remédio vem como caminho relativo ("/uploads/remedios/abc.png") ou null
export const fotoUrl = (foto) => (foto ? `${API_URL}${foto}` : null);
// Fotos de pessoas/farmácias: caminho relativo ("/uploads/fotos/x.png") ou URL completa
export const fotoPessoa = (foto) =>
  !foto ? null : /^(https?:|data:|blob:)/.test(foto) ? foto : `${API_URL}${foto.startsWith("/") ? "" : "/"}${foto}`;

// Catálogo de medicamentos (cadastrado pelo admin)
export const listarCatalogo = (filtros, options) =>
  apiRequest(`/remedios${query(filtros)}`, options).then((data) =>
    Array.isArray(data?.remedios) ? { ...data, remedios: maisNovosPrimeiro(data.remedios, "idRemedio") } : data);
export const buscarRemedio = (idRemedio, options) =>
  apiRequest(`/remedios/${idRemedio}`, options).then((data) => data.resultado);
export const cadastrarRemedio = (dados) => apiRequest("/remedios", json("POST", dados));
export const editarRemedio = (idRemedio, dados) => apiRequest(`/remedios/${idRemedio}`, json("PUT", dados));
export const apagarRemedio = (idRemedio) => apiRequest(`/remedios/${idRemedio}`, { method: "DELETE" });
export function enviarFotoRemedio(idRemedio, arquivo) {
  const form = new FormData();
  form.append("foto", arquivo);
  // Sem Content-Type: o navegador monta o boundary do multipart
  return apiRequest(`/remedios/${idRemedio}/foto`, { method: "PUT", body: form });
}
export const removerFotoRemedio = (idRemedio) => apiRequest(`/remedios/${idRemedio}/foto`, { method: "DELETE" });
export const listarCategorias = (options) =>
  apiRequest("/categorias", options).then((data) => data.categorias ?? []);

// Estoque: o gerente administra o da farmácia dele; o funcionário consulta o da farmácia onde trabalha
export const listarEstoqueGerente = (idGerente, filtros, options) =>
  apiRequest(`/gerente/${idGerente}/estoque${query(filtros)}`, options);
export const adicionarEstoque = (idGerente, dados) => apiRequest(`/gerente/${idGerente}/estoque`, json("POST", dados));
export const atualizarEstoque = (idGerente, idRemedio, dados) =>
  apiRequest(`/gerente/${idGerente}/estoque/${idRemedio}`, json("PUT", dados));
export const removerEstoque = (idGerente, idRemedio) =>
  apiRequest(`/gerente/${idGerente}/estoque/${idRemedio}`, { method: "DELETE" });
export const listarEstoqueFarmacia = (idFarmacia, filtros, options) =>
  apiRequest(`/farmacia/${idFarmacia}/estoque${query(filtros)}`, options);

// Serviços (entrega ao paciente, com baixa no estoque da farmácia)
export const cadastrarServico = (dados) => apiRequest("/servicos", json("POST", dados));
export const buscarServico = (idServico, options) =>
  apiRequest(`/servicos/${idServico}`, options).then((data) => data.resultado);
export const listarServicosDaFarmacia = (idFarmacia, options) =>
  apiRequest(`/servicos${query({ idFarmacia })}`, options).then((data) => extractList(data, ["servicos"]));

// Chamados de reposição: o funcionário solicita e o gerente da farmácia responde.
export const solicitarChamado = (idFuncionario, body) =>
  apiRequest(`/funcionario/${idFuncionario}/chamado`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const listarChamadosFuncionario = (idFuncionario, status, options) =>
  apiRequest(`/funcionario/${idFuncionario}/chamados${status ? `?status=${status}` : ""}`, options);
export const listarChamadosGerente = (idGerente, status, options) =>
  apiRequest(`/gerente/${idGerente}/chamados${status ? `?status=${status}` : ""}`, options);
// A resposta traz { chamado, despacho }: para qual farmácia cada remédio foi pedido
export const responderChamado = (idChamado, body) =>
  apiRequest(`/chamado/${idChamado}/responder`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Redistribuição: pedidos de remédio entre farmácias da rede
export const buscarChamado = (idChamado, options) =>
  apiRequest(`/chamado/${idChamado}`, options);
export const disponibilidadeChamado = (idChamado, idGerente, options) =>
  apiRequest(`/chamado/${idChamado}/disponibilidade?idGerente=${idGerente}`, options);
export const redistribuirChamado = (idChamado, idGerente) =>
  apiRequest(`/chamado/${idChamado}/redistribuir`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idGerente }) });
export const listarPedidosGerente = (idGerente, tipo = "recebidos", status = "", options) =>
  apiRequest(`/gerente/${idGerente}/redistribuicoes?tipo=${tipo}${status ? `&status=${status}` : ""}`, options);
export const buscarPedido = (idRedistribuicao, options) =>
  apiRequest(`/redistribuicao/${idRedistribuicao}`, options);
export const responderPedido = (idRedistribuicao, body) =>
  apiRequest(`/redistribuicao/${idRedistribuicao}/responder`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Preparo do envio (funcionários da farmácia fornecedora). Só o primeiro que
// começar assume; os outros recebem 409 com `preparadoPor` e o pedido atual.
export const listarPreparosFuncionario = (idFuncionario, options) =>
  apiRequest(`/funcionario/${idFuncionario}/preparos`, options);
export async function iniciarPreparo(idRedistribuicao, idFuncionario) {
  try {
    return await apiRequest(`/redistribuicao/${idRedistribuicao}/preparar`, json("POST", { idFuncionario }));
  } catch (error) {
    // apiRequest só guarda a mensagem; o 409 traz quem assumiu no corpo
    if (error.status === 409) {
      const atual = await buscarPedido(idRedistribuicao).catch(() => null);
      throw Object.assign(error, { pedido: atual?.pedido ?? null });
    }
    throw error;
  }
}

export function normalizePaciente(item) {
  return {
    id: String(item.idPaciente ?? item.id ?? ""),
    name: item.nomePaciente ?? item.name ?? item.nome ?? "Paciente",
    photo: fotoPessoa(item.fotoPerfilPaciente) ?? item.photo,
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
    photo: fotoPessoa(item.fotoFuncionario ?? item.fotoPerfilFuncionario) ?? item.photo,
    role: item.cargoFuncionario ?? item.role ?? "Funcionário",
    shift: item.turnoFuncionario ?? item.shift ?? "",
    email: item.emailFuncionario ?? item.email ?? "",
    phone: item.telFuncionario ?? item.phone ?? "",
    matricula: item.matriculaFuncionario ?? item.matricula ?? "",
    farmaciaId: String(item.fkIdFarmacia ?? item.idFarmacia ?? item.farmaciaId ?? ""),
  };
}

// Perfis detalhados: dados + números do período (?periodo=30d ou ?de=&ate=)
const qsPeriodo = (p = {}) => new URLSearchParams(
  p.de ? { de: p.de, ...(p.ate && { ate: p.ate }) } : { periodo: p.periodo || "30d" }).toString();

export const resumoFuncionario = (id, periodo, options) => apiRequest(`/funcionario/${id}/resumo?${qsPeriodo(periodo)}`, options);
export const resumoGerente     = (id, periodo, options) => apiRequest(`/gerente/${id}/resumo?${qsPeriodo(periodo)}`, options);
export const resumoFarmacia    = (id, periodo, options) => apiRequest(`/farmacia/${id}/resumo?${qsPeriodo(periodo)}`, options);
export const resumoRemedio     = (id, periodo, options) => apiRequest(`/remedios/${id}/resumo?${qsPeriodo(periodo)}`, options);
export const resumoPaciente    = (id, periodo, options) => apiRequest(`/paciente/${id}/resumo?${qsPeriodo(periodo)}`, options);

// Fotos de funcionário, gerente e farmácia (multipart, campo "foto"; sem Content-Type manual)
const enviarFoto = (rota) => (id, arquivo) => {
  const form = new FormData();
  form.append("foto", arquivo);
  return apiRequest(`/${rota}/${id}/foto`, { method: "PUT", body: form });
};
const removerFoto = (rota) => (id) => apiRequest(`/${rota}/${id}/foto`, { method: "DELETE" });
export const enviarFotoFuncionario = enviarFoto("funcionario");
export const removerFotoFuncionario = removerFoto("funcionario");
export const enviarFotoGerente = enviarFoto("gerente");
export const removerFotoGerente = removerFoto("gerente");
export const enviarFotoFarmacia = enviarFoto("farmacia");
export const removerFotoFarmacia = removerFoto("farmacia");

// Busca sem acento e sem diferenciar maiúsculas.
export const normalizeText = (value = "") =>
  String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
