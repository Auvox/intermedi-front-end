import { useCallback, useEffect, useState } from "react";

// Carrega uma lista da API (ex.: listarRemedios) com estados de carregamento,
// erro e uma função reload para buscar de novo após um cadastro.
export default function useApiList(loader, map = (item) => item) {
  const [state, setState] = useState({ items: [], loading: true, error: "" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loader({ signal: controller.signal })
      .then((items) => setState({ items: items.map(map), loading: false, error: "" }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ items: [], loading: false, error: error.message || "Erro ao consultar a API." });
      });
    return () => controller.abort();
    // loader e map são funções de módulo estáveis; version força a recarga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setVersion((v) => v + 1);
  }, []);

  return { ...state, reload };
}
