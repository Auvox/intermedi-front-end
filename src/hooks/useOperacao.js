import { useCallback, useMemo } from "react";
import { listarCatalogo, listarEstoqueGerente, resumoGerente } from "../services/api";
import { montarOperacao } from "../services/operacao";
import { useChamadosGerente, usePolling } from "./useChamados";
import { useRelogio } from "./useRastreio";

// Dados da tela Operação 3D. Reaproveita o que o layout do gerente já consulta
// (chamados pendentes e pedidos da rede, via Outlet) e busca só o que falta:
// estoque (30 s), resumo da unidade com a equipe (60 s), chamados da farmácia
// e o catálogo, de onde vêm as categorias (uma vez).
export default function useOperacao({ gerente, pendentes, pedidosRastreio }) {
  const { idGerente = null, nome: nomeGerente = "", idFarmacia = null } = gerente ?? {};
  const ativo = Boolean(idGerente);

  const buscarEstoque = useCallback(
    (options) => listarEstoqueGerente(idGerente, {}, options),
    [idGerente],
  );
  const buscarResumo = useCallback(
    (options) => resumoGerente(idGerente, { periodo: "30d" }, options),
    [idGerente],
  );
  const buscarCatalogo = useCallback(
    (options) => listarCatalogo({}, options).then((data) => data.remedios ?? []),
    [],
  );

  const estoque = usePolling(buscarEstoque, { enabled: ativo });
  const resumo = usePolling(buscarResumo, { enabled: ativo, interval: 60000 });
  const catalogo = usePolling(buscarCatalogo, { interval: 0 });
  const { chamados, carregado: chamadosCarregados } = useChamadosGerente(idGerente);
  // relógio: turnos, validade e indicadores dependem da hora. A cada 1 min; a
  // cada 5 s enquanto um pedido está em preparo (a saída do caminhão muda o fluxo)
  const emPreparo = (pedidosRastreio?.pedidos ?? []).some((p) => p.status === "preparando");
  const agora = useRelogio(true, emPreparo ? 5000 : 60000);

  const listaPendentes = pendentes?.pendentes;
  const totalPendentes = pendentes?.totalPendentes;
  const pedidos = pedidosRastreio?.pedidos;
  const operacao = useMemo(
    () => (estoque.data
      ? montarOperacao({
        estoque: estoque.data.estoque ?? [],
        catalogo: catalogo.data ?? [],
        resumo: resumo.data,
        chamados: chamadosCarregados ? chamados : [],
        pendentes: { pendentes: listaPendentes ?? [], totalPendentes },
        pedidos: pedidos ?? [],
        gerente: { idGerente, nome: nomeGerente, idFarmacia },
        agora,
      })
      : null),
    [estoque.data, catalogo.data, resumo.data, chamadosCarregados, chamados, listaPendentes, totalPendentes,
      pedidos, idGerente, nomeGerente, idFarmacia, agora],
  );

  const { retry: repetirEstoque } = estoque;
  const { retry: repetirResumo } = resumo;
  const retry = useCallback(() => {
    repetirEstoque();
    repetirResumo();
  }, [repetirEstoque, repetirResumo]);

  return {
    operacao,
    loading: !ativo || estoque.loading,
    // o estoque é a base da cena; sem o resumo a cena aparece sem a equipe
    error: estoque.error,
    avisoResumo: resumo.error,
    retry,
  };
}
