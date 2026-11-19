// Tela de carregamento ligada à resposta do sistema.
// Conta as requisições que a pessoa está esperando:
//   • tudo que muda dados (POST/PUT/DELETE): salvar, aceitar, entrar…
//   • as leituras (GET) feitas logo depois de abrir uma tela
// Leituras de fundo (sininho, presença, cliques) não travam a tela.
// A tela só aparece se a espera passar de ATRASO_MS (sem piscar em respostas
// rápidas) e fica pelo menos MINIMO_MS (sem sumir num estalo).

const ATRASO_MS = 280;
const MINIMO_MS = 450;
const JANELA_NAVEGACAO_MS = 1500;
const IGNORAR = [/\/analytics\/(cliques|telas)/, /\/auth\/presenca/, /\/alertas/, /\/saude/, /\/fotos-padrao\//, /\/uploads\//];

let pendentes = 0;
let suspensas = 0;
let janelaAte = Date.now() + 2500; // a primeira tela aberta também conta
let visivel = false;
let desde = 0;
let timer = null;
const ouvintes = new Set();

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function recalcular() {
  const ocupado = pendentes + suspensas > 0;
  clearTimeout(timer);
  if (ocupado && !visivel) {
    timer = setTimeout(() => {
      visivel = true;
      desde = Date.now();
      avisar();
    }, ATRASO_MS);
  } else if (!ocupado && visivel) {
    timer = setTimeout(() => {
      visivel = false;
      avisar();
    }, Math.max(0, MINIMO_MS - (Date.now() - desde)));
  }
}

export function assinarCarregamento(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export const carregandoAgora = () => visivel;

// Chamado a cada troca de tela: as leituras dos próximos instantes contam
export function marcarNavegacao() {
  janelaAte = Date.now() + JANELA_NAVEGACAO_MS;
}

// Telas baixadas sob demanda (Suspense) também mostram o carregamento
export function inicioSuspensao() {
  suspensas += 1;
  recalcular();
  return () => {
    suspensas = Math.max(0, suspensas - 1);
    recalcular();
  };
}

function deveContar(input, init) {
  const url = typeof input === "string" ? input : input?.url ?? String(input);
  if (IGNORAR.some((padrao) => padrao.test(url))) return false;
  const metodo = (init?.method || (typeof input === "object" && input?.method) || "GET").toUpperCase();
  return metodo !== "GET" || Date.now() < janelaAte;
}

let instalado = false;
export function instalarRastreadorDeRequisicoes() {
  if (instalado || typeof window === "undefined" || !window.fetch) return;
  instalado = true;
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (!deveContar(input, init)) return original(input, init);
    pendentes += 1;
    recalcular();
    const terminar = () => {
      pendentes = Math.max(0, pendentes - 1);
      recalcular();
    };
    return original(input, init).then(
      (resposta) => { terminar(); return resposta; },
      (erro) => { terminar(); throw erro; },
    );
  };
}
