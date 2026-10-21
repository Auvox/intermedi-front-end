import { API_URL, apiRequest } from "./api";

// Cliente da aba "Desempenho" do admin. As rotas de analytics e saúde só
// respondem ao admin logado (back: services/acesso.service.mjs), então a aba
// pede o login do admin (CPF + matrícula + senha) e guarda o token só nesta
// aba do navegador (sessionStorage).

const CHAVE_TOKEN = "intermedi.desempenho.token";
const ouvintes = new Set();

export function tokenAdmin() {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

function definirToken(token) {
  try {
    if (token) sessionStorage.setItem(CHAVE_TOKEN, token);
    else sessionStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // modo privado sem storage: o login vale até recarregar
  }
  ouvintes.forEach((ouvinte) => ouvinte(token));
}

// avisa quando o admin entra ou sai (sino do topo e a própria aba)
export function aoMudarToken(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export async function entrarComoAdmin({ cpf, matricula, senha }) {
  const dados = await apiRequest("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf, matricula, senha }),
  });
  if (dados.usuario?.papel !== "admin") {
    throw new Error("Esta conta não é de admin. Só o admin vê o desempenho do sistema.");
  }
  definirToken(dados.token);
  return dados.usuario;
}

export function sairDoDesempenho() {
  definirToken(null);
}

async function pedido(caminho, options = {}) {
  const token = tokenAdmin();
  if (!token) throw Object.assign(new Error("Entre como admin para ver o desempenho."), { status: 401 });
  try {
    return await apiRequest(caminho, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  } catch (error) {
    // sessão vencida ou encerrada: pede o login de novo
    if (error.status === 401) definirToken(null);
    throw error;
  }
}

const comFiltros = (caminho, filtros, extra = {}) => {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...filtros, ...extra })) {
    if (valor !== undefined && valor !== null && valor !== "") params.set(chave, valor);
  }
  const query = params.toString();
  return query ? `${caminho}?${query}` : caminho;
};

export const buscarResumo = (filtros, options) => pedido(comFiltros("/analytics/resumo", filtros), options);
export const buscarRotas = (filtros, options) => pedido(comFiltros("/analytics/rotas", filtros), options).then((d) => d.rotas ?? []);
export const buscarPontos = (filtros, extra, options) => pedido(comFiltros("/analytics/cliques", filtros, extra), options);
export const buscarSaude = (filtros, options) => pedido(comFiltros("/saude", filtros), options);
export const buscarAlertas = (status = "ativo", options) => pedido(`/alertas?status=${status}`, options);
export const resolverAlerta = (id) => pedido(`/alertas/${encodeURIComponent(id)}/resolver`, { method: "PUT" });
export const silenciarAlerta = (id, minutos = 60) =>
  pedido(`/alertas/${encodeURIComponent(id)}/silenciar`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ minutos }),
  });

// captura da tela do app (fundo do mapa de calor), enviada pelo admin
export async function enviarCapturaApp(rota, arquivo) {
  const dados = new FormData();
  dados.append("foto", arquivo);
  const medidas = await new Promise((resolve) => {
    const imagem = new Image();
    imagem.onload = () => resolve({ largura: imagem.naturalWidth, altura: imagem.naturalHeight });
    imagem.onerror = () => resolve({});
    imagem.src = URL.createObjectURL(arquivo);
  });
  const query = new URLSearchParams({ rota, ...(medidas.largura && { largura: medidas.largura, altura: medidas.altura }) });
  return pedido(`/analytics/telas?${query}`, { method: "POST", body: dados });
}

export const urlDaCaptura = (url) => (url ? `${API_URL}${url}` : null);

// ------------------------------------------------------------ formatos

// nomes das telas em linguagem simples (o resto aparece como a rota)
const NOMES_WEB = {
  "/admin": "Admin · Visão geral",
  "/admin/medicamentos": "Admin · Medicamentos",
  "/admin/farmacias": "Admin · Farmácias",
  "/admin/gerentes": "Admin · Gerentes",
  "/admin/pacientes": "Admin · Pacientes",
  "/admin/chamados": "Admin · Solicitações",
  "/gerente": "Gerente · Visão geral",
  "/gerente/funcionarios": "Gerente · Funcionários",
  "/gerente/pacientes": "Gerente · Pacientes",
  "/gerente/remedios": "Gerente · Remédios",
  "/gerente/chamados": "Gerente · Chamados",
  "/gerente/servicos": "Gerente · Serviços",
  "/gerente/pedidos": "Gerente · Pedidos da rede",
  "/gerente/operacao": "Gerente · Operação 3D",
  "/funcionario": "Funcionário · Visão geral",
  "/funcionario/pacientes": "Funcionário · Pacientes",
  "/funcionario/funcionarios": "Funcionário · Equipe",
  "/funcionario/remedios": "Funcionário · Remédios",
  "/funcionario/chamados": "Funcionário · Solicitações",
  "/funcionario/servicos": "Funcionário · Serviços",
};
const NOMES_APP = {
  "/": "Início",
  "/buscar-medicamentos": "Remédios",
  "/farmacias": "Farmácias",
  "/favoritos": "Favoritos",
  "/perfil": "Perfil",
  "/broto": "Mascote",
  "/pesquisa": "Pesquisa",
  "/medicamento/:id": "Detalhe do remédio",
  "/farmacia/:id": "Detalhe da farmácia",
  "/rota": "Rota até a farmácia",
  "/semana": "Rotina da semana",
  "/comprimidos": "Comprimidos",
  "/notificacoes": "Notificações",
  "/meus-dados": "Meus dados",
  "/configuracoes": "Configurações",
  "/login": "Entrar",
  "/welcome": "Boas-vindas",
};

export function nomeDaTela(rota, plataforma) {
  const nome = (plataforma === "app" ? NOMES_APP : NOMES_WEB)[rota];
  return nome ?? rota;
}

export const PLATAFORMAS = { app: "App do paciente", web: "Web (painel)" };

export const numero = (valor) => (valor === null || valor === undefined ? "—" : Number(valor).toLocaleString("pt-BR"));

export function duracao(ms) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const segundos = ms / 1000;
  if (segundos < 60) return `${segundos.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
  const minutos = Math.floor(segundos / 60);
  return `${minutos} min ${Math.round(segundos % 60)} s`;
}

export const porcentagem = (valor) =>
  valor === null || valor === undefined ? "—" : `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// rótulo do eixo do gráfico: hora (períodos curtos) ou dia
// a última faixa pode estar pela metade (o dia de hoje ainda não acabou):
// o rótulo avisa, pra queda no fim do gráfico não parecer um problema
export function rotuloTempo(inicio, passo, parcial = false) {
  const data = new Date(inicio);
  if (passo < 86400000) {
    const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return parcial ? `${hora} (até agora)` : hora;
  }
  return parcial ? "Hoje (até agora)" : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function horario(ms) {
  return new Date(ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
