import { useCallback, useEffect, useRef, useState } from "react";
import {
  listarChamadosGerente,
  listarFuncionarios,
  listarGerentes,
  listarPedidosGerente,
  normalizeFuncionario,
} from "../services/api";
import { INTERVALO_A_CAMINHO, dataDoChamado, temACaminho } from "../services/chamados";
import { readEmployeeSession } from "../services/employeeSession";

export const INTERVALO_CHAMADOS = 30000;

// Consulta a API ao montar, a cada `interval` ms e quando a aba volta a ficar
// visível. Só a primeira carga mostra "carregando"; as seguintes atualizam em
// silêncio. `fetcher` recebe { signal } e deve ser estável (useCallback).
// `interval` pode ser um número ou uma função (dados) => número, para consultar
// mais rápido enquanto há algo a caminho.
export function usePolling(fetcher, { enabled = true, interval: intervalOpcao = INTERVALO_CHAMADOS } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: "" });
  const controllerRef = useRef(null);
  const interval = typeof intervalOpcao === "function" ? intervalOpcao(state.data) : intervalOpcao;

  const load = useCallback(async () => {
    if (!enabled) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const data = await fetcher({ signal: controller.signal });
      if (!controller.signal.aborted) setState({ data, loading: false, error: "" });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((current) => ({ ...current, loading: false, error: error.message || "Erro ao consultar a API." }));
    }
  }, [fetcher, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const timer = interval ? setInterval(load, interval) : null;
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      controllerRef.current?.abort();
    };
  }, [load, enabled, interval]);

  // "Tentar de novo": volta a mostrar o carregamento
  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    load();
  }, [load]);

  const setData = useCallback(
    (update) => setState((current) => ({ ...current, data: typeof update === "function" ? update(current.data) : update })),
    [],
  );

  return { ...state, reload: load, retry, setData };
}

// Segundos até `dataPrevistaChegada` (UTC), recalculados a cada 1 s no próprio
// navegador — sem chamar a API. null quando não há previsão.
export function useContagemRegressiva(dataPrevistaChegada) {
  const alvo = dataDoChamado(dataPrevistaChegada)?.getTime() ?? null;
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (alvo === null) return undefined;
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [alvo]);
  if (alvo === null) return null;
  return Math.max(0, Math.ceil((alvo - agora) / 1000));
}

// Mensagem temporária (toast) que some sozinha
export function useToast(duracao = 5000) {
  const [message, setMessage] = useState("");
  const timer = useRef(null);
  const show = useCallback(
    (text) => {
      clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(() => setMessage(""), duracao);
    },
    [duracao],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return [message, show];
}

// Enquanto o login das personas não existe, sem sessão a pessoa é escolhida
// numa lista (guardada no navegador). Com sessão, a sessão tem prioridade.
function lerEscolha(chave) {
  try { return localStorage.getItem(chave) || ""; } catch { return ""; }
}
function salvarEscolha(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* só perde a lembrança */ }
  // avisa as outras instâncias do hook na mesma aba (ex.: sino do topo e a página)
  window.dispatchEvent(new CustomEvent(EVENTO_ESCOLHA, { detail: { chave, valor } }));
}
const EVENTO_ESCOLHA = "intermedi:escolha";
// Mantém a escolha sincronizada entre componentes que usam a mesma chave
function useEscolha(chave) {
  const [valor, setValor] = useState(() => lerEscolha(chave));
  useEffect(() => {
    const ouvir = (event) => { if (event.detail?.chave === chave) setValor(event.detail.valor); };
    window.addEventListener(EVENTO_ESCOLHA, ouvir);
    return () => window.removeEventListener(EVENTO_ESCOLHA, ouvir);
  }, [chave]);
  return [valor, setValor];
}

// idGerente do back-end: pelo e-mail da sessão ou, sem sessão, pelo gerente escolhido.
// aguardar=true enquanto a sessão ainda está sendo consultada.
export function useIdGerente(email, { aguardar = false } = {}) {
  const normalizado = String(email || "").trim().toLowerCase();
  const [state, setState] = useState({ gerentes: [], loading: true, error: "" });
  const [tentativa, setTentativa] = useState(0);
  const [escolhido, setEscolhido] = useEscolha("intermedi.teste.gerente");

  useEffect(() => {
    const controller = new AbortController();
    listarGerentes({ signal: controller.signal })
      .then((gerentes) => setState({ gerentes, loading: false, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ gerentes: [], loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [tentativa]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setTentativa((t) => t + 1);
  }, []);
  const escolher = useCallback((id) => {
    setEscolhido(String(id));
    salvarEscolha("intermedi.teste.gerente", String(id));
  }, [setEscolhido]);

  const gerentes = state.gerentes.map((g) => ({
    id: String(g.idGerente ?? g.id),
    nome: g.nomeGerente ?? g.nome ?? "Gerente",
    email: String(g.emailGerente ?? g.email ?? "").trim().toLowerCase(),
    idFarmacia: g.fkIdFarmacia != null ? String(g.fkIdFarmacia) : null,
  }));
  const daSessao = normalizado ? gerentes.find((g) => g.email === normalizado) : null;
  const atual = daSessao ?? gerentes.find((g) => g.id === escolhido) ?? gerentes[0] ?? null;
  const loading = aguardar || state.loading;
  const error = loading ? "" : state.error || (!atual ? "Nenhum gerente cadastrado na API." : "");

  return {
    idGerente: loading ? null : atual?.id ?? null,
    nome: atual?.nome ?? "",
    idFarmacia: loading ? null : atual?.idFarmacia ?? null,
    gerentes,
    temSessao: Boolean(daSessao),
    escolher,
    loading,
    error,
    retry,
  };
}

// Funcionário atual: o da sessão ou, sem sessão, o escolhido na lista.
export function useFuncionarioAtual() {
  const sessionId = readEmployeeSession()?.id;
  const [state, setState] = useState({ funcionarios: [], loading: true, error: "" });
  const [escolhido, setEscolhido] = useEscolha("intermedi.teste.funcionario");

  useEffect(() => {
    const controller = new AbortController();
    listarFuncionarios({ signal: controller.signal })
      .then((lista) => setState({ funcionarios: lista.map(normalizeFuncionario), loading: false, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ funcionarios: [], loading: false, error: error.message });
      });
    return () => controller.abort();
  }, []);

  const escolher = useCallback((id) => {
    setEscolhido(String(id));
    salvarEscolha("intermedi.teste.funcionario", String(id));
  }, [setEscolhido]);

  const { funcionarios } = state;
  const idFuncionario = sessionId
    ? String(sessionId)
    : (funcionarios.find((f) => f.id === escolhido) ?? funcionarios[0])?.id ?? null;
  return { idFuncionario, funcionarios, temSessao: Boolean(sessionId), escolher, loading: !sessionId && state.loading, error: state.error };
}

// Funcionário atual + a farmácia onde ele trabalha (fkIdFarmacia do cadastro ou,
// sem isso, o farmaciasId salvo na sessão).
export function useFarmaciaDoFuncionario() {
  const funcionario = useFuncionarioAtual();
  const atual = funcionario.funcionarios.find((f) => String(f.id) === String(funcionario.idFuncionario));
  const session = readEmployeeSession();
  const idFarmacia = atual?.farmaciaId || String(session?.farmaciasId ?? session?.farmaciaId ?? "") || null;
  return { ...funcionario, idFarmacia };
}

// Todos os chamados da farmácia do gerente (página de chamados e ficha do funcionário)
export function useChamadosGerente(idGerente) {
  const fetcher = useCallback(
    (options) => listarChamadosGerente(idGerente, "", options).then((data) => data.chamados ?? []),
    [idGerente],
  );
  const { data, ...rest } = usePolling(fetcher, {
    enabled: Boolean(idGerente),
    interval: (lista) => (temACaminho(lista ?? []) ? INTERVALO_A_CAMINHO : INTERVALO_CHAMADOS),
  });
  return { chamados: data ?? [], carregado: data !== null, ...rest };
}

// Um gerente da farmácia (para o funcionário consultar os pedidos da unidade dele)
export function useGerenteDaFarmacia(idFarmacia) {
  const [gerentes, setGerentes] = useState([]);
  useEffect(() => {
    if (!idFarmacia) return undefined;
    const controller = new AbortController();
    listarGerentes({ signal: controller.signal }).then(setGerentes).catch(() => {});
    return () => controller.abort();
  }, [idFarmacia]);
  const gerente = gerentes.find((g) => String(g.fkIdFarmacia ?? g.idFarmacia) === String(idFarmacia));
  return gerente ? String(gerente.idGerente ?? gerente.id) : null;
}

// Pedidos de outras farmácias aguardando a resposta desta (sininho do gerente
// fornecedor). Chama onNovoPedido(pedido) quando aparece um idRedistribuicao novo.
export function usePedidosRecebidosPendentes(idGerente, { onNovoPedido } = {}) {
  const fetcher = useCallback(
    (options) => listarPedidosGerente(idGerente, "recebidos", "solicitada", options),
    [idGerente],
  );
  const { data, loading, error, reload, retry } = usePolling(fetcher, { enabled: Boolean(idGerente) });
  const conhecidos = useRef(null);
  const callback = useRef(onNovoPedido);
  useEffect(() => { callback.current = onNovoPedido; });
  useEffect(() => { conhecidos.current = null; }, [idGerente]);

  useEffect(() => {
    if (!data) return;
    const ids = (data.pedidos ?? []).map((p) => p.idRedistribuicao);
    if (conhecidos.current) {
      const novo = (data.pedidos ?? []).find((p) => !conhecidos.current.has(p.idRedistribuicao));
      if (novo) callback.current?.(novo);
    }
    conhecidos.current = new Set(ids);
  }, [data]);

  return {
    totalPendentes: data?.totalPendentes ?? 0,
    pedidos: data?.pedidos ?? [],
    loading,
    error,
    reload,
    retry,
  };
}

// Notificações do gerente: pendentes da farmácia, consultados a cada 30 s.
// Chama onNovaSolicitacao(chamado) quando totalPendentes aumenta.
export function useChamadosPendentes(idGerente, { onNovaSolicitacao } = {}) {
  const fetcher = useCallback(
    (options) => listarChamadosGerente(idGerente, "pendente", options),
    [idGerente],
  );
  const { data, loading, error, reload, retry, setData } = usePolling(fetcher, { enabled: Boolean(idGerente) });
  const anterior = useRef(null);
  const idsAnteriores = useRef([]);
  const callback = useRef(onNovaSolicitacao);
  useEffect(() => { callback.current = onNovaSolicitacao; });
  // Trocar de gerente não é "nova solicitação": recomeça a comparação
  useEffect(() => {
    anterior.current = null;
    idsAnteriores.current = [];
  }, [idGerente]);

  const totalPendentes = data?.totalPendentes ?? 0;
  const pendentes = data?.chamados ?? [];

  useEffect(() => {
    if (!data) return;
    if (anterior.current !== null && data.totalPendentes > anterior.current) {
      const conhecidos = new Set(idsAnteriores.current);
      const novo = data.chamados.find((c) => !conhecidos.has(c.idChamado)) ?? data.chamados[0];
      if (novo) callback.current?.(novo);
    }
    anterior.current = data.totalPendentes;
    idsAnteriores.current = data.chamados.map((c) => c.idChamado);
  }, [data]);

  // Depois de aceitar/recusar: tira da lista e diminui o badge sem esperar a próxima consulta
  const removerPendente = useCallback(
    (idChamado) => {
      setData((current) => {
        if (!current?.chamados.some((c) => c.idChamado === idChamado)) return current;
        const next = {
          ...current,
          totalPendentes: Math.max(0, current.totalPendentes - 1),
          chamados: current.chamados.filter((c) => c.idChamado !== idChamado),
        };
        anterior.current = next.totalPendentes;
        return next;
      });
    },
    [setData],
  );

  return { totalPendentes, pendentes, loading, error, reload, retry, removerPendente };
}
