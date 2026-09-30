import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PerfilContext } from "./perfilContext";
import PerfilPainel from "./PerfilPainel";
import { escreverPilha, lerPeriodoSalvo, lerPilha, salvarPeriodo } from "../../services/perfil";
import "../../styles/perfil.css";

const PARAMS_PERIODO = ["periodo", "de", "ate"];
const PARAM_SECAO = "secao";

// Envolve a área de uma plataforma (admin, gerente, funcionário). O perfil aberto
// fica na URL (?perfil=farmacia:1,funcionario:3&periodo=90d&secao=equipe): o
// voltar do navegador fecha a página de perfil e o link pode ser compartilhado.
// gerenteAtual: { id, idFarmacia } — define de quem o gerente pode trocar a foto.
// (Sem useCallback/useMemo manuais: o React Compiler memoiza.)
export default function PerfilProvider({ plataforma, gerenteAtual = null, children }) {
  const [params, setParams] = useSearchParams();
  const pilha = lerPilha(params.get("perfil"));
  const topo = pilha.at(-1) ?? null;
  const origem = useRef(null);
  const [titulos, setTitulos] = useState({});

  // Período: URL > último escolhido para este tipo de perfil > 30 dias
  const periodoUrl = params.get("de")
    ? { de: params.get("de"), ...(params.get("ate") && { ate: params.get("ate") }) }
    : params.get("periodo") ? { periodo: params.get("periodo") } : null;
  const periodo = topo ? periodoUrl ?? lerPeriodoSalvo(topo.tipo) : null;
  const secao = params.get(PARAM_SECAO);

  function irPara(novaPilha, { substituir = false } = {}) {
    setParams(
      (atual) => {
        const next = new URLSearchParams(atual);
        [...PARAMS_PERIODO, PARAM_SECAO].forEach((p) => next.delete(p));
        if (novaPilha.length) next.set("perfil", escreverPilha(novaPilha));
        else next.delete("perfil");
        return next;
      },
      { replace: substituir },
    );
  }

  // De uma lista: começa uma pilha nova e lembra o item para devolver o foco
  function abrirPerfil(tipo, id, elemento) {
    origem.current = elemento ?? document.activeElement;
    irPara([{ tipo, id: String(id) }]);
  }
  // De dentro do painel: empilha (breadcrumb + Voltar)
  function empilhar(tipo, id) {
    const ultimo = pilha.at(-1);
    if (ultimo?.tipo === tipo && ultimo?.id === String(id)) return;
    irPara([...pilha, { tipo, id: String(id) }]);
  }
  const fechar = () => irPara([], { substituir: true });
  const voltar = (nivel = pilha.length - 2) => irPara(pilha.slice(0, nivel + 1), { substituir: true });

  function mudarPeriodo(novo) {
    if (!topo) return;
    salvarPeriodo(topo.tipo, novo);
    setParams(
      (atual) => {
        const next = new URLSearchParams(atual);
        PARAMS_PERIODO.forEach((p) => next.delete(p));
        Object.entries(novo).forEach(([k, v]) => next.set(k, v));
        return next;
      },
      { replace: true },
    );
  }
  // Tab ativa do perfil do topo (substitui o histórico: trocar de tab não é "página nova")
  function mudarSecao(nova) {
    setParams(
      (atual) => {
        const next = new URLSearchParams(atual);
        next.set(PARAM_SECAO, nova);
        return next;
      },
      { replace: true },
    );
  }
  function definirTitulo(chave, titulo) {
    setTitulos((atual) => (atual[chave] === titulo ? atual : { ...atual, [chave]: titulo }));
  }

  // Página fechou (Voltar, Esc ou voltar do navegador): o foco volta para o item clicado
  const aberto = pilha.length > 0;
  const estavaAberto = useRef(aberto);
  useEffect(() => {
    if (estavaAberto.current && !aberto && origem.current?.isConnected) {
      origem.current.focus();
    }
    estavaAberto.current = aberto;
  }, [aberto]);

  // Quem pode trocar foto: admin (gerente, farmácia); gerente (funcionários da
  // farmácia dele e a própria foto); funcionário só vê.
  function podeTrocarFoto(tipo, dados) {
    if (plataforma === "admin") return tipo === "gerente" || tipo === "farmacia";
    if (plataforma === "gerente" && gerenteAtual?.id) {
      if (tipo === "gerente") return String(dados?.idGerente) === String(gerenteAtual.id);
      if (tipo === "funcionario") {
        return Boolean(gerenteAtual.idFarmacia) &&
          String(dados?.fkIdFarmacia ?? dados?.idFarmacia) === String(gerenteAtual.idFarmacia);
      }
    }
    return false;
  }

  const valorFora = { abrirPerfil, plataforma, dentroDoPainel: false };
  const valorDentro = {
    abrirPerfil: empilhar,
    plataforma,
    dentroDoPainel: true,
    periodo,
    mudarPeriodo,
    secao,
    mudarSecao,
    definirTitulo,
    podeTrocarFoto,
  };

  return (
    <PerfilContext.Provider value={valorFora}>
      {children}
      {aberto && (
        <PerfilContext.Provider value={valorDentro}>
          <PerfilPainel pilha={pilha} titulos={titulos} onFechar={fechar} onVoltar={voltar} />
        </PerfilContext.Provider>
      )}
    </PerfilContext.Provider>
  );
}
