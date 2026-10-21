import { useCallback, useEffect, useRef, useState } from "react";
import { usePolling } from "./useChamados";
import { aoMudarToken, buscarAlertas, tokenAdmin } from "../services/desempenho";

// Admin logado na aba Desempenho (o token fica na aba do navegador)
export function useTokenAdmin() {
  const [token, setToken] = useState(tokenAdmin);
  useEffect(() => aoMudarToken(setToken), []);
  return token;
}

// Alertas ativos da saúde do sistema (sino do topo, toast e banner).
// Consulta a cada 15 s; onCritico(alerta) é chamado quando surge um crítico novo.
export function useAlertas({ onCritico } = {}) {
  const token = useTokenAdmin();
  const fetcher = useCallback((options) => buscarAlertas("ativo", options), []);
  const consulta = usePolling(fetcher, { enabled: Boolean(token), interval: 15000 });
  const alertas = token ? consulta.data?.alertas ?? [] : [];

  const vistos = useRef(null);
  const callback = useRef(onCritico);
  useEffect(() => {
    callback.current = onCritico;
  });
  useEffect(() => {
    if (!consulta.data) return;
    const criticos = (consulta.data.alertas ?? []).filter((a) => a.severidade === "critico");
    // pela chave, não pelo id: o alerta guardado em memória com o banco travado
    // ganha outro id quando é gravado, mas é o mesmo problema (não avisa duas vezes)
    const chave = (a) => a.chave ?? a.id;
    // na primeira consulta só memoriza (não avisa do que já estava aberto)
    if (vistos.current) {
      for (const alerta of criticos) if (!vistos.current.has(chave(alerta))) callback.current?.(alerta);
    }
    vistos.current = new Set(criticos.map(chave));
  }, [consulta.data]);

  return {
    logado: Boolean(token),
    alertas,
    criticos: alertas.filter((a) => a.severidade === "critico"),
    carregando: Boolean(token) && consulta.loading,
    erro: consulta.error,
    recarregar: consulta.reload,
  };
}
