import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// Atalhos da visão geral abrem o formulário certo na outra tela:
// /funcionario/servicos?acao=novo-servico chama abrir() quando a tela estiver
// pronta e tira o ?acao da URL (voltar ou recarregar não abre de novo).
export default function useAcaoDaUrl(acao, abrir, pronto = true) {
  const [params, setParams] = useSearchParams();
  const pedida = params.get("acao") === acao;

  useEffect(() => {
    if (!pedida || !pronto) return;
    abrir();
    setParams(
      (atual) => {
        const proximos = new URLSearchParams(atual);
        proximos.delete("acao");
        return proximos;
      },
      { replace: true },
    );
  }, [pedida, pronto, abrir, setParams]);
}
