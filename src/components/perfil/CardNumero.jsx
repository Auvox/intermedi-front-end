import ManagerIcon from "../ManagerIcon";

// Número grande com variação em relação ao período anterior.
// variacao: número (%), null = "novo" (não havia nada antes), undefined = não mostra.
export default function CardNumero({ titulo, valor, variacao, icone, detalhe, onClick, acao }) {
  const temVariacao = variacao !== undefined;
  const conteudo = (
    <>
      <span className="perfil-card-topo">
        {icone && <span className="perfil-card-icone"><ManagerIcon name={icone} size={16} /></span>}
        <span>{titulo}</span>
      </span>
      <strong className="perfil-card-valor">{valor ?? "—"}</strong>
      {temVariacao && <Variacao valor={variacao} />}
      {detalhe && <small className="perfil-card-detalhe">{detalhe}</small>}
      {acao}
    </>
  );
  return onClick ? (
    <button type="button" className="perfil-card perfil-card-clicavel" onClick={onClick}>{conteudo}</button>
  ) : (
    <div className="perfil-card">{conteudo}</div>
  );
}

function Variacao({ valor }) {
  if (valor === null) return <small className="perfil-variacao novo">novo no período</small>;
  const n = Number(valor);
  if (n === 0) return <small className="perfil-variacao igual">igual ao período anterior</small>;
  const sobe = n > 0;
  return (
    <small className={`perfil-variacao ${sobe ? "sobe" : "desce"}`}>
      <span aria-hidden="true">{sobe ? "▲" : "▼"}</span>
      <span className="sr-only">{sobe ? "Aumento de" : "Queda de"}</span> {sobe ? "+" : ""}
      {n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs período anterior
    </small>
  );
}
