import { Link } from "react-router-dom";

// Fluxo de reposição da unidade: do chamado da equipe até o remédio recebido.
export default function FlowStrip({ fluxo, onAbrir }) {
  const etapas = [
    { id: "chamados", rotulo: "Solicitados pela equipe", valor: fluxo.pendentes, detalhe: "aguardando sua decisão" },
    { id: "rede", rotulo: "Pedidos à rede", valor: fluxo.emAndamento, detalhe: "chamados aceitos em andamento", link: "/gerente/chamados" },
    {
      id: "doca",
      rotulo: "A caminho",
      valor: fluxo.aCaminho,
      detalhe: fluxo.aguardandoFornecedor
        ? `+${fluxo.aguardandoFornecedor} aguardando a fornecedora`
        : "entregas vindo de outras farmácias",
    },
    { id: "recebidos", rotulo: "Recebidos", valor: fluxo.recebidos30, detalhe: "nos últimos 30 dias", link: "/gerente/pedidos" },
  ];
  return (
    <section className="op-fluxo" aria-label="Fluxo de reposição">
      <h2>Fluxo de reposição</h2>
      <ol>
        {etapas.map((e) => {
          const conteudo = (
            <>
              <strong>{e.valor}</strong>
              <span>{e.rotulo}</span>
              <small>{e.detalhe}</small>
            </>
          );
          return (
            <li key={e.id}>
              {e.link ? (
                <Link to={e.link} className="op-fluxo-etapa">{conteudo}</Link>
              ) : (
                <button type="button" className="op-fluxo-etapa" onClick={() => onAbrir(e.id)}>{conteudo}</button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
