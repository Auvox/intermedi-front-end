import { useCallback, useEffect, useRef, useState } from "react";
import {
  buscarChamado,
  buscarPedido,
  buscarServico,
  resumoFarmacia,
  resumoFuncionario,
  resumoGerente,
  resumoPaciente,
  resumoRemedio,
} from "../services/api";
import { usePerfil } from "../components/perfil/perfilContext";
import { TIPOS_COM_PERIODO } from "../services/perfil";

const RESUMOS = {
  funcionario: resumoFuncionario,
  gerente: resumoGerente,
  farmacia: resumoFarmacia,
  remedio: resumoRemedio,
  paciente: resumoPaciente,
};
// Detalhes sem período
const DETALHES = {
  chamado: (id, options) => buscarChamado(id, options).then((d) => d.chamado),
  servico: (id, options) => buscarServico(id, options),
  pedido: (id, options) => buscarPedido(id, options).then((d) => d.pedido),
};

// GET /{rota}/{id}/resumo?periodo=… (ou ?de=&ate=). Ao trocar o período, mantém
// os dados anteriores (a tela esmaece em vez de piscar) até os novos chegarem.
export default function useResumo(tipo, id, periodo) {
  const [estado, setEstado] = useState({ data: null, loading: true, error: "" });
  const [versao, setVersao] = useState(0);
  const chavePeriodo = JSON.stringify(periodo ?? {});
  const chaveAtual = useRef(null);
  // atualizar(): consulta de novo sem esmaecer a tela (acompanhamento de entrega)
  const silencioso = useRef(false);

  useEffect(() => {
    if (!tipo || !id) return undefined;
    const controller = new AbortController();
    const chave = `${tipo}:${id}`;
    // outro perfil: não reaproveita os dados do anterior
    const mesmoPerfil = chaveAtual.current === chave;
    chaveAtual.current = chave;
    const carregar = RESUMOS[tipo]
      ? (options) => RESUMOS[tipo](id, JSON.parse(chavePeriodo), options)
      : (options) => DETALHES[tipo](id, options);
    // setState só no retorno da API (nada síncrono no effect)
    Promise.resolve()
      .then(() => {
        const calado = silencioso.current && mesmoPerfil;
        silencioso.current = false;
        if (!controller.signal.aborted && !calado) {
          setEstado((atual) => ({ data: mesmoPerfil ? atual.data : null, loading: true, error: "" }));
        }
        return carregar({ signal: controller.signal });
      })
      .then((data) => {
        if (!controller.signal.aborted) setEstado({ data, loading: false, error: "" });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setEstado((atual) => ({ ...atual, loading: false, error: error.message || "Erro ao consultar a API." }));
      });
    return () => controller.abort();
  }, [tipo, id, chavePeriodo, versao]);

  const reload = useCallback(() => setVersao((v) => v + 1), []);
  const atualizar = useCallback(() => {
    silencioso.current = true;
    setVersao((v) => v + 1);
  }, []);
  return { ...estado, reload, atualizar };
}

// Avisa as listas que algo mudou (ex.: foto trocada) para elas recarregarem
const EVENTO = "intermedi:dados-alterados";
export function avisarDadosAlterados(detalhe) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: detalhe }));
}
export function useAoAlterarDados(callback) {
  const ref = useRef(callback);
  useEffect(() => { ref.current = callback; });
  useEffect(() => {
    const ouvir = (event) => ref.current?.(event.detail);
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, []);
}

// Dados do perfil aberto no painel: resumo no período escolhido + título do breadcrumb
export function usePerfilDados(tipo, id, extrairTitulo) {
  const { periodo, definirTitulo } = usePerfil();
  const estado = useResumo(tipo, id, TIPOS_COM_PERIODO.includes(tipo) ? periodo : null);
  const titulo = estado.data ? extrairTitulo(estado.data) : null;
  useEffect(() => {
    if (titulo) definirTitulo?.(`${tipo}:${id}`, titulo);
  }, [titulo, tipo, id, definirTitulo]);
  return estado;
}

// Leva o foco para o título quando o perfil termina de carregar (leitor de tela
// anuncia o nome; Tab segue a partir dele). Só na montagem: trocar o período não mexe no foco.
export function useFocoTitulo() {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return ref;
}
