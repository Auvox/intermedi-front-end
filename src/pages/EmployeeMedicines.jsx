import { useState } from "react";
import useApiList from "../hooks/useApiList";
import SolicitarReposicao from "../components/SolicitarReposicao";
import { listarRemedios, normalizeText } from "../services/api";
import { useFuncionarioAtual } from "../hooks/useChamados";
import "../styles/employeeMedicines.css";

const levels = [
  { max: 10, label: "Crítico", color: "critical", range: "0 a 10" },
  { max: 30, label: "Ruim", color: "poor", range: "11 a 30" },
  { max: 50, label: "Moderado", color: "moderate", range: "31 a 50" },
  { max: 100, label: "Boa", color: "good", range: "51 a 100" },
  { max: Infinity, label: "Excelente", color: "excellent", range: "Acima de 100" },
];

export default function EmployeeMedicines() {
  const { items: medicines, loading, error, reload } = useApiList(listarRemedios);
  const [search, setSearch] = useState("");
  // null = fechado; "" = sem remédio pré-selecionado; id = aberto a partir da linha
  const [reposicao, setReposicao] = useState(null);
  const funcionario = useFuncionarioAtual();

  const filtered = medicines.filter(item => normalizeText(`${item.name} ${item.dose} ${item.manufacturer} ${item.categories}`).includes(normalizeText(search.trim())));
  return <>
    <header className="mgr-page-head mgr-page-head-featured">
      <div><p className="mgr-eyebrow">ESPAÇO DO FUNCIONÁRIO</p><h1>Remédios</h1>
        <p>Todos os remédios cadastrados na rede. Estoque baixo? Solicite reposição ao gerente.</p></div>
      <button type="button" className="mgr-primary" disabled={loading || !medicines.length} onClick={() => setReposicao("")}>
        Solicitar reposição
      </button>
    </header>
    <section className="mgr-panel" aria-label="Remédios cadastrados">
      <div className="mgr-toolbar">
        <input type="search" aria-label="Buscar remédios" placeholder="Buscar nome, dosagem, fabricante ou categoria…" value={search} onChange={e => setSearch(e.target.value)} />
        <button type="button" className="directory-row-action" disabled={loading} onClick={reload}>Atualizar</button>
      </div>
      {loading ? <p className="mgr-empty" role="status">Carregando remédios…</p> : error ? <div className="mgr-empty" role="alert"><p>{error}</p><button type="button" className="mgr-secondary chamado-retry" onClick={reload}>Tentar de novo</button></div> : <>
        <div className="mgr-table-wrap"><table>
          <thead><tr><th scope="col">Remédio</th><th scope="col">Dosagem</th><th scope="col">Fabricante</th><th scope="col">Categoria</th><th scope="col">Quantidade</th><th scope="col">Ações</th></tr></thead>
          <tbody>{filtered.map(item => {
            const level = item.quantity === null ? null : levels.find(entry => item.quantity <= entry.max);
            return <tr key={item.id}>
              <td><div className="emp-medicine-name"><strong>{item.name}</strong>{level && <span className={`mgr-badge emp-stock-tag emp-stock-${level.color}`} title={`${level.range} unidades`}>{level.label}</span>}</div></td>
              <td>{item.dose || "—"}</td><td>{item.manufacturer || "—"}</td><td>{item.categories || "—"}</td>
              <td>{item.quantity === null ? "Não informada" : item.quantity.toLocaleString("pt-BR")}</td>
              <td><button type="button" className="directory-row-action" aria-label={`Solicitar reposição de ${item.name}`} onClick={() => setReposicao(item.id)}>Solicitar reposição</button></td>
            </tr>;
          })}</tbody>
        </table></div>
        {!filtered.length && <p className="mgr-empty">{medicines.length ? "Nenhum remédio encontrado para esta busca." : "Nenhum remédio cadastrado no sistema."}</p>}
        <p className="mgr-table-note">{filtered.length} de {medicines.length} remédios</p>
      </>}
    </section>
    {reposicao !== null && (
      <SolicitarReposicao
        medicines={medicines}
        funcionario={funcionario}
        remedioInicial={reposicao}
        onClose={() => setReposicao(null)}
      />
    )}
  </>;
}
