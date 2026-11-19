import { Component, useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import PaginaAviso from "../../pages/PaginaAviso";
import { API_URL } from "../../services/api";

export const EVENTO_FORA_DO_AR = "intermedi:fora-do-ar";

// O servidor responde? (rota pública e leve)
async function servidorNoAr() {
  try {
    const resposta = await fetch(`${API_URL}/categorias`, { signal: AbortSignal.timeout(6000) });
    return resposta.status < 500;
  } catch {
    return false;
  }
}

// Quando uma requisição não chega ao servidor, confere se ele caiu mesmo e,
// se caiu, mostra a página "sistema fora do ar" no lugar da tela.
// A página inicial não depende do servidor e continua aparecendo.
export function GuardaSistema({ children }) {
  const { pathname } = useLocation();
  const [foraDoAr, setForaDoAr] = useState(false);

  useEffect(() => {
    let conferindo = false;
    async function aoFalhar() {
      if (conferindo) return;
      conferindo = true;
      if (!(await servidorNoAr())) setForaDoAr(true);
      conferindo = false;
    }
    window.addEventListener(EVENTO_FORA_DO_AR, aoFalhar);
    return () => window.removeEventListener(EVENTO_FORA_DO_AR, aoFalhar);
  }, []);

  const tentarDeNovo = useCallback(async () => {
    if (await servidorNoAr()) {
      setForaDoAr(false);
      window.location.reload();
    }
  }, []);

  if (foraDoAr && pathname !== "/") return <PaginaAviso tipo="fora-do-ar" onTentarDeNovo={tentarDeNovo} />;
  return children;
}

// Erro de JavaScript numa tela: mostra o aviso em vez da página em branco
export class LimiteDeErro extends Component {
  state = { erro: null };
  static getDerivedStateFromError(erro) {
    return { erro };
  }
  componentDidCatch(erro, info) {
    console.error("Tela com erro:", erro, info?.componentStack);
  }
  render() {
    if (!this.state.erro) return this.props.children;
    // tela nova não baixou (servidor do site reiniciou): é "fora do ar"
    const download = /dynamically imported module|Failed to fetch|Loading chunk/i.test(String(this.state.erro?.message));
    return <PaginaAviso tipo={download ? "fora-do-ar" : "erro"} onTentarDeNovo={() => window.location.reload()} />;
  }
}

// /acesso-desativado?tipo=farmacia&nome=…  (o login manda para cá)
export function AcessoDesativado() {
  const [params] = useSearchParams();
  const tipo = params.get("tipo") === "conta" ? "conta-desativada" : "farmacia-desativada";
  return <PaginaAviso tipo={tipo} nomeFarmacia={params.get("nome") || undefined} />;
}
