import { useCallback, useEffect, useRef, useState } from "react";
import { listarChamadosGerente, listarFuncionarios, listarGerentes, normalizeFuncionario } from "../services/api";
import { readEmployeeSession } from "../services/employeeSession";

export const INTERVALO_CHAMADOS = 30000;

// Consulta a API ao montar, a cada `interval` ms e quando a aba volta a ficar
// visível. Só a primeira carga mostra "carregando"; as seguintes atualizam em
// silêncio. `fetcher` recebe { signal } e deve ser estável (useCallback).
export function usePolling(fetcher, { enabled = true, interval = INTERVALO_CHAMADOS } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: "" });
  const controllerRef = useRef(null);

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
}

// idGerente do back-end: pelo e-mail da sessão ou, sem sessão, pelo gerente escolhido.
// aguardar=true enquanto a sessão ainda está sendo consultada.
export function useIdGerente(email, { aguardar = false } = {}) {
  const normalizado = String(email || "").trim().toLowerCase();
  const [state, setState] = useState({ gerentes: [], loading: true, error: "" });
  const [tentativa, setTentativa] = useState(0);
  const [escolhido, setEscolhido] = useState(() => lerEscolha("intermedi.teste.gerente"));

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
  }, []);

  const gerentes = state.gerentes.map((g) => ({
    id: String(g.idGerente ?? g.id),
    nome: g.nomeGerente ?? g.nome ?? "Gerente",
    email: String(g.emailGerente ?? g.email ?? "").trim().toLowerCase(),
  }));
  const daSessao = normalizado ? gerentes.find((g) => g.email === normalizado) : null;
  const atual = daSessao ?? gerentes.find((g) => g.id === escolhido) ?? gerentes[0] ?? null;
  const loading = aguardar || state.loading;
  const error = loading ? "" : state.error || (!atual ? "Nenhum gerente cadastrado na API." : "");

  return {
    idGerente: loading ? null : atual?.id ?? null,
    nome: atual?.nome ?? "",
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
  const [escolhido, setEscolhido] = useState(() => lerEscolha("intermedi.teste.funcionario"));

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
  }, []);

  const { funcionarios } = state;
  const idFuncionario = sessionId
    ? String(sessionId)
    : (funcionarios.find((f) => f.id === escolhido) ?? funcionarios[0])?.id ?? null;
  return { idFuncionario, funcionarios, temSessao: Boolean(sessionId), escolher, loading: !sessionId && state.loading, error: state.error };
}

// Todos os chamados da farmácia do gerente (página de chamados e ficha do funcionário)
export function useChamadosGerente(idGerente) {
  const fetcher = useCallback(
    (options) => listarChamadosGerente(idGerente, "", options).then((data) => data.chamados ?? []),
    [idGerente],
  );
  const { data, ...rest } = usePolling(fetcher, { enabled: Boolean(idGerente) });
  return { chamados: data ?? [], carregado: data !== null, ...rest };
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
