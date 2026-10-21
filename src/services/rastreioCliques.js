import { API_URL } from "./api";

// Mapa de calor da aba "Desempenho" do admin (POST /analytics/cliques).
// Guarda os cliques e as visitas às telas numa fila e envia em lote a cada
// 10 s ou quando a pessoa sai da página. Nunca uma requisição por clique.
// PRIVACIDADE: só a posição do clique (em % da tela) e o identificador do
// elemento (atributo data-track). Nunca o que foi digitado nem o texto da tela.

const INTERVALO_ENVIO = 10000;
const MAXIMO_POR_LOTE = 400;
// a própria aba Desempenho fica de fora, pra quem analisa não virar dado
const ROTAS_RASTREADAS = /^\/(admin|gerente|funcionario)(?!\/desempenho(\/|$))(\/|$)/;
const INTERATIVO = "a[href], button, input, select, textarea, label, summary, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [tabindex]:not([tabindex='-1'])";

let cliques = [];
let visitas = [];
let contexto = { usuarioId: null, farmaciaId: null };
let telaAtual = null; // { rota, inicio }
let iniciado = false;

// id aleatório da aba aberta (conta "usuários ativos" mesmo sem login)
function sessao() {
  try {
    let id = sessionStorage.getItem("intermedi.rastreio.sessao");
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^\w-]/g, "").slice(0, 40);
      sessionStorage.setItem("intermedi.rastreio.sessao", id);
    }
    return id;
  } catch {
    return "sem-sessao";
  }
}

const personaDaRota = (rota) => ({ admin: "admin", gerente: "gerente", funcionario: "funcionario" })[rota.split("/")[1]] ?? null;

function dispositivo() {
  const largura = window.innerWidth;
  if (largura < 768) return "celular";
  if (largura < 1024) return "tablet";
  return "desktop";
}

// o mapa de calor abre as telas num <iframe> só para mostrar: lá dentro não rastreia
const ativo = () => typeof window !== "undefined" && window.top === window.self;

// "Novo funcionário" -> "novo-funcionario" (para montar o data-track)
export const paraIdentificador = (texto) =>
  String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// cada layout (gerente, funcionário) informa quem está usando
export function definirContextoRastreio({ usuarioId = null, farmaciaId = null } = {}) {
  contexto = { usuarioId: Number(usuarioId) || null, farmaciaId: Number(farmaciaId) || null };
}

function comum(rota) {
  return {
    rota,
    plataforma: "web",
    persona: personaDaRota(rota),
    usuarioId: contexto.usuarioId,
    farmaciaId: contexto.farmaciaId,
    dispositivo: dispositivo(),
    sessao: sessao(),
  };
}

// identificador do elemento: data-track dele ou de quem o envolve; sem
// data-track, só a tag (ex.: "button"). Nunca o texto.
function identificar(alvo) {
  const marcado = alvo.closest?.("[data-track]");
  if (marcado) return marcado.getAttribute("data-track").slice(0, 80);
  const interativo = alvo.closest?.(INTERATIVO);
  return interativo ? interativo.tagName.toLowerCase() : null;
}

export function registrarClique(evento) {
  if (!ativo() || !telaAtual || !(evento.target instanceof Element)) return;
  const largura = window.innerWidth;
  const altura = window.innerHeight;
  if (!largura || !altura) return;
  cliques.push({
    ...comum(telaAtual.rota),
    x: Math.min(1, Math.max(0, evento.clientX / largura)),
    y: Math.min(1, Math.max(0, evento.clientY / altura)),
    largura,
    altura,
    elemento: identificar(evento.target),
    interativo: Boolean(evento.target.closest(INTERATIVO)),
    em: Date.now(),
  });
  if (cliques.length >= MAXIMO_POR_LOTE) enviar();
}

function fecharVisita(saida) {
  if (!telaAtual) return;
  visitas.push({ ...comum(telaAtual.rota), duracaoMs: Date.now() - telaAtual.inicio, saida, em: telaAtual.inicio });
  telaAtual = null;
}

// troca de tela (chamado a cada mudança de rota)
export function mudarDeTela(caminho) {
  if (!ativo()) return;
  const rota = caminho.replace(/\/+$/, "") || "/";
  if (telaAtual?.rota === rota) return;
  fecharVisita(false);
  if (ROTAS_RASTREADAS.test(rota)) telaAtual = { rota, inicio: Date.now() };
}

function lote() {
  const dados = { cliques: cliques.slice(0, MAXIMO_POR_LOTE), visitas: visitas.slice(0, MAXIMO_POR_LOTE - Math.min(cliques.length, MAXIMO_POR_LOTE)) };
  cliques = cliques.slice(dados.cliques.length);
  visitas = visitas.slice(dados.visitas.length);
  return dados;
}

// saindo da página: sendBeacon chega mesmo com a aba fechando
function enviarAoSair() {
  fecharVisita(true);
  while (cliques.length || visitas.length) {
    const corpo = JSON.stringify(lote());
    // text/plain não precisa de pré-requisição CORS; o back lê o JSON igual
    if (!navigator.sendBeacon?.(`${API_URL}/analytics/cliques`, new Blob([corpo], { type: "text/plain" }))) break;
  }
}

async function enviar() {
  if (!cliques.length && !visitas.length) return;
  const dados = lote();
  try {
    const resposta = await fetch(`${API_URL}/analytics/cliques`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(dados),
      keepalive: true,
    });
    if (resposta.status >= 500) throw new Error(`HTTP ${resposta.status}`);
  } catch {
    // servidor fora do ar: devolve para a fila (com limite) e tenta no próximo envio
    cliques = [...dados.cliques, ...cliques].slice(-2000);
    visitas = [...dados.visitas, ...visitas].slice(-500);
  }
}

export function iniciarRastreio() {
  if (iniciado || !ativo()) return () => {};
  iniciado = true;
  const timer = setInterval(enviar, INTERVALO_ENVIO);
  const aoSair = () => enviarAoSair();
  const aoVoltar = () => {
    if (document.visibilityState === "visible" && !telaAtual) mudarDeTela(window.location.pathname);
  };
  window.addEventListener("pagehide", aoSair);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") enviarAoSair();
    else aoVoltar();
  });
  document.addEventListener("click", registrarClique, { capture: true, passive: true });
  return () => {
    clearInterval(timer);
    window.removeEventListener("pagehide", aoSair);
    document.removeEventListener("click", registrarClique, { capture: true });
    iniciado = false;
  };
}
