import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Filtros globais da aba Desempenho, salvos na URL (o link pode ser
// compartilhado): ?periodo=hoje|7d|30d|personalizado&inicio=&fim=
// &plataforma=app|web|todas&farmacia=<id>|todas
export const FILTROS = ["periodo", "inicio", "fim", "plataforma", "farmacia"];

const dataLocal = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function useFiltrosDesempenho() {
  const [params, setParams] = useSearchParams();
  const [hoje] = useState(() => dataLocal(Date.now()));
  const periodo = params.get("periodo") || "7d";
  const plataforma = params.get("plataforma") || "todas";
  const farmacia = params.get("farmacia") || "todas";
  const inicio = params.get("inicio") || "";
  const fim = params.get("fim") || "";

  // o que vai para a API (sem os parâmetros de cada sub-aba, como ?rota=)
  const consulta = useMemo(() => ({
    periodo,
    plataforma,
    farmacia,
    ...(periodo === "personalizado" && inicio && fim ? { inicio, fim } : {}),
  }), [periodo, plataforma, farmacia, inicio, fim]);

  // personalizado sem as duas datas ainda não consulta
  const pronto = periodo !== "personalizado" || Boolean(inicio && fim && inicio <= fim);

  // "?periodo=30d&plataforma=app" — para os links entre as sub-abas
  const queryFiltros = useMemo(() => {
    const q = new URLSearchParams();
    for (const chave of FILTROS) if (params.get(chave)) q.set(chave, params.get(chave));
    const texto = q.toString();
    return texto ? `?${texto}` : "";
  }, [params]);

  const definir = useCallback((mudancas) => {
    setParams((atual) => {
      const proximos = new URLSearchParams(atual);
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (valor === null || valor === undefined || valor === "") proximos.delete(chave);
        else proximos.set(chave, valor);
      }
      if (mudancas.periodo === "personalizado" && !proximos.get("inicio")) {
        proximos.set("inicio", dataLocal(Date.now() - 6 * 86400000));
        proximos.set("fim", dataLocal(Date.now()));
      }
      if (mudancas.periodo && mudancas.periodo !== "personalizado") {
        proximos.delete("inicio");
        proximos.delete("fim");
      }
      return proximos;
    }, { replace: true });
  }, [setParams]);

  // link para outra sub-aba levando os filtros e parâmetros extras
  const linkPara = useCallback((caminho, extra = {}) => {
    const q = new URLSearchParams(queryFiltros);
    for (const [chave, valor] of Object.entries(extra)) if (valor !== undefined && valor !== null) q.set(chave, valor);
    const texto = q.toString();
    return `/admin/desempenho${caminho}${texto ? `?${texto}` : ""}`;
  }, [queryFiltros]);

  return { periodo, plataforma, farmacia, inicio, fim, consulta, pronto, queryFiltros, definir, linkPara, params, hoje };
}
