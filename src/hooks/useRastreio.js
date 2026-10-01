import { useCallback, useEffect, useRef, useState } from "react";
import { listarChamadosFuncionario, listarFarmacias, listarPedidosGerente } from "../services/api";
import { INTERVALO_A_CAMINHO } from "../services/chamados";
import { emAndamento, eventosRastreio, proximosMarcos, textoEventos } from "../services/rastreio";
import { INTERVALO_CHAMADOS, usePolling } from "./useChamados";

// ---------------------------------------------------------------------
//  Endereço (bairro/cidade) das farmácias — carregado uma vez por sessão
// ---------------------------------------------------------------------
let enderecosCarregados = null;
let promessaEnderecos = null;
function carregarEnderecos() {
  promessaEnderecos ??= listarFarmacias()
    .then((lista) => {
      enderecosCarregados = Object.fromEntries(
        lista.map((f) => [
          String(f.idFarmacia ?? f.id),
          { bairro: f.bairroFarmacia ?? f.bairro ?? "", cidade: f.cidadeFarmacia ?? f.cidade ?? "", uf: f.ufFarmacia ?? f.uf ?? "" },
        ]),
      );
      return enderecosCarregados;
    })
    .catch(() => {
      // sem endereços o rastreio usa só o nome das farmácias; tenta de novo depois
      promessaEnderecos = null;
      return {};
    });
  return promessaEnderecos;
}

export function useEnderecosFarmacias() {
  const [enderecos, setEnderecos] = useState(() => enderecosCarregados ?? {});
  useEffect(() => {
    let ativo = true;
    carregarEnderecos().then((dados) => { if (ativo) setEnderecos(dados); });
    return () => { ativo = false; };
  }, []);
  return enderecos;
}

// ---------------------------------------------------------------------
//  Relógios
// ---------------------------------------------------------------------

// Hora atual, atualizada a cada `passo` ms enquanto `ativo` (caminhão andando)
export function useRelogio(ativo, passo = 1000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ativo) return undefined;
    const timer = setInterval(() => setAgora(Date.now()), passo);
    return () => clearInterval(timer);
  }, [ativo, passo]);
  return agora;
}

// Hora atual, atualizada só quando o próximo marco de algum pedido é alcançado
// (a notificação sai no instante certo sem redesenhar a tela a cada segundo).
// Um pedido novo com marcos já passados também agenda (com espera 0) a atualização.
function useAgoraNosMarcos(pedidos) {
  const [agora, setAgora] = useState(() => Date.now());
  const proximo = Math.min(...proximosMarcos(pedidos, agora));
  useEffect(() => {
    if (!Number.isFinite(proximo)) return undefined;
    const timer = setTimeout(() => setAgora(Date.now()), Math.max(0, proximo - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [proximo]);
  return agora;
}

// Enquanto `ativo`, chama atualizar() a cada `intervalo` ms (e ao voltar para a aba)
export function useAtualizacaoPeriodica(ativo, atualizar, intervalo = INTERVALO_A_CAMINHO) {
  const ref = useRef(atualizar);
  useEffect(() => { ref.current = atualizar; });
  useEffect(() => {
    if (!ativo) return undefined;
    const timer = setInterval(() => ref.current?.(), intervalo);
    const visivel = () => { if (document.visibilityState === "visible") ref.current?.(); };
    document.addEventListener("visibilitychange", visivel);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visivel);
    };
  }, [ativo, intervalo]);
}

// Perspectiva de quem vê um pedido: o gerente da farmácia de origem é o fornecedor
export const perspectivaDe = (pedido, idFarmaciaAtual) =>
  idFarmaciaAtual && String(pedido.idFarmaciaOrigem) === String(idFarmaciaAtual) ? "fornecedor" : "solicitante";

// ---------------------------------------------------------------------
//  Notificações dos marcos (sino + aviso na hora)
// ---------------------------------------------------------------------

function lerLido(chave) {
  try { return Number(localStorage.getItem(chave)) || 0; } catch { return 0; }
}
function salvarLido(chave, valor) {
  try { localStorage.setItem(chave, String(valor)); } catch { /* só perde a lembrança */ }
}

// pedidos: lista com `perspectiva` (solicitante | fornecedor | unidade).
// escopo: quem está vendo (as notificações lidas ficam guardadas por escopo).
// pronto: a primeira consulta terminou (antes disso nada é "novo").
// onNovos(texto, eventos): marco alcançado com a tela aberta.
export function useNotificacoesRastreio(pedidos, { escopo, pronto = true, onNovos } = {}) {
  const enderecos = useEnderecosFarmacias();
  const agora = useAgoraNosMarcos(pedidos);
  const eventos = eventosRastreio(pedidos, enderecos, agora);

  // aviso na hora: compara com os eventos já conhecidos nesta sessão
  const conhecidos = useRef(null);
  const callback = useRef(onNovos);
  useEffect(() => { callback.current = onNovos; });
  useEffect(() => { conhecidos.current = null; }, [escopo]);
  const chaves = eventos.map((e) => e.chave).join("|");
  useEffect(() => {
    if (!pronto) return;
    const atuais = chaves ? chaves.split("|") : [];
    if (conhecidos.current) {
      const novos = eventos.filter((e) => !conhecidos.current.has(e.chave));
      if (novos.length) callback.current?.(textoEventos(novos), novos);
    }
    conhecidos.current = new Set(atuais);
  }, [chaves, pronto]); // eslint-disable-line react-hooks/exhaustive-deps

  // não lidas: mais novas que a última vez que o sino foi aberto
  const chaveLido = `intermedi.rastreio.lido.${escopo}`;
  const [lidos, setLidos] = useState({});
  const lidoAte = lidos[chaveLido] ?? lerLido(chaveLido);
  const isNaoLido = (e) => e.quando > lidoAte;
  function marcarLidos() {
    const maisNovo = eventos[0]?.quando;
    if (!maisNovo || maisNovo <= lidoAte) return;
    salvarLido(chaveLido, maisNovo);
    setLidos((atual) => ({ ...atual, [chaveLido]: maisNovo }));
  }
  return { eventos, naoLidos: eventos.filter(isNaoLido).length, isNaoLido, marcarLidos };
}

// ---------------------------------------------------------------------
//  Fontes de pedidos de cada persona
// ---------------------------------------------------------------------

const intervaloPedidos = (lista) =>
  (lista ?? []).some(emAndamento) ? INTERVALO_A_CAMINHO : INTERVALO_CHAMADOS;

// Gerente: o que a farmácia dele pediu (solicitante) e o que ela está enviando (fornecedor)
export function usePedidosDoGerente(idGerente) {
  const fetcher = useCallback(
    async (options) => {
      const [enviados, recebidos] = await Promise.all([
        listarPedidosGerente(idGerente, "enviados", "", options),
        listarPedidosGerente(idGerente, "recebidos", "", options),
      ]);
      return [
        ...(enviados.pedidos ?? []).map((p) => ({ ...p, perspectiva: "solicitante" })),
        ...(recebidos.pedidos ?? []).map((p) => ({ ...p, perspectiva: "fornecedor" })),
      ];
    },
    [idGerente],
  );
  const { data, loading, error, retry } = usePolling(fetcher, { enabled: Boolean(idGerente), interval: intervaloPedidos });
  return { pedidos: data ?? [], carregado: data !== null, loading, error, retry };
}

// Funcionário: os chamados que ele abriu (todos os marcos dos pedidos deles) e o
// que chega na unidade por pedido de outra pessoa (só a entrega)
export function usePedidosDoFuncionario(idFuncionario, idGerenteUnidade) {
  const buscarChamados = useCallback(
    (options) => listarChamadosFuncionario(idFuncionario, "", options).then((data) => data.chamados ?? []),
    [idFuncionario],
  );
  const chamados = usePolling(buscarChamados, {
    enabled: Boolean(idFuncionario),
    interval: (lista) =>
      (lista ?? []).some((c) => (c.pedidos ?? []).some(emAndamento)) ? INTERVALO_A_CAMINHO : INTERVALO_CHAMADOS,
  });
  const buscarUnidade = useCallback(
    (options) => listarPedidosGerente(idGerenteUnidade, "enviados", "", options).then((data) => data.pedidos ?? []),
    [idGerenteUnidade],
  );
  const unidade = usePolling(buscarUnidade, { enabled: Boolean(idGerenteUnidade), interval: intervaloPedidos });

  // a lista anterior pode ser de outro funcionário enquanto a nova chega
  const meus = (chamados.data ?? []).filter((c) => String(c.funcionario?.idFuncionario) === String(idFuncionario));
  const idsMeusChamados = new Set(meus.map((c) => c.idChamado));
  const pedidos = [
    ...meus.flatMap((c) => (c.pedidos ?? []).map((p) => ({ ...p, perspectiva: "solicitante" }))),
    ...(unidade.data ?? [])
      .filter((p) => !idsMeusChamados.has(p.idChamado))
      .map((p) => ({ ...p, perspectiva: "unidade" })),
  ];
  return {
    chamados: meus,
    pedidos,
    carregado: chamados.data !== null && (!idGerenteUnidade || unidade.data !== null),
    loading: chamados.loading || unidade.loading,
    error: chamados.error || unidade.error,
    retry: () => { chamados.retry(); unidade.retry(); },
  };
}
