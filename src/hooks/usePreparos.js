import { useCallback, useEffect, useRef } from "react";
import { listarPreparosFuncionario } from "../services/api";
import { usePolling } from "./useChamados";

// Avisos de preparo da farmácia do funcionário (quando ela é a fornecedora de
// um pedido da rede). Consulta a cada 4 s: quando um colega aperta "Começar",
// o aviso dos outros vira "Fulano aceitou" em poucos segundos.
// onNovo(pedido) é chamado quando aparece um pedido novo aguardando preparo.
export default function usePreparos(idFuncionario, { onNovo } = {}) {
  const fetcher = useCallback(
    (options) => listarPreparosFuncionario(idFuncionario, options),
    [idFuncionario],
  );
  const { data, loading, error, reload, retry } = usePolling(fetcher, { enabled: Boolean(idFuncionario), interval: 4000 });

  const conhecidos = useRef(null);
  const callback = useRef(onNovo);
  useEffect(() => { callback.current = onNovo; });
  useEffect(() => { conhecidos.current = null; }, [idFuncionario]);
  useEffect(() => {
    if (!data) return;
    const aguardando = (data.pedidos ?? []).filter((p) => p.status === "aprovada");
    if (conhecidos.current) {
      const novo = aguardando.find((p) => !conhecidos.current.has(p.idRedistribuicao));
      if (novo) callback.current?.(novo);
    }
    conhecidos.current = new Set(aguardando.map((p) => p.idRedistribuicao));
  }, [data]);

  return {
    pedidos: data?.pedidos ?? [],
    totalAguardando: data?.totalAguardando ?? 0,
    carregado: data !== null,
    loading,
    error,
    reload,
    retry,
  };
}
