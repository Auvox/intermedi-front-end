import { useEffect, useState } from "react";
import "../styles/employeeMedicines.css";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const levels = [
  { max: 10, label: "Crítico", color: "critical", range: "0 a 10" },
  { max: 30, label: "Ruim", color: "poor", range: "11 a 30" },
  { max: 50, label: "Moderado", color: "moderate", range: "31 a 50" },
  { max: 100, label: "Boa", color: "good", range: "51 a 100" },
  { max: Infinity, label: "Excelente", color: "excellent", range: "Acima de 100" },
];
const quantity = value => value !== null && value !== undefined && value !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function EmployeeMedicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`${API}/remedios`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar os remédios.");
        if (!Array.isArray(data.remedios)) throw new Error("O servidor não retornou uma lista de remédios.");
        if (!controller.signal.aborted) setMedicines(data.remedios);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || "Falha ao conectar ao servidor.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [version]);

  const filtered = medicines.filter(item => normalize(`${item.nomeRemedio ?? ""} ${item.dosagemRemedio ?? ""} ${item.fabricanteRemedio ?? ""}`).includes(normalize(search.trim())));
  return <>
    <header className="mgr-page-head mgr-page-head-featured">
      <div><p className="mgr-eyebrow">ESPAÇO DO FUNCIONÁRIO</p><h1>Remédios</h1>
        <p>Todos os remédios cadastrados e suas quantidades em estoque na rede.</p></div>
    </header>
    <section className="mgr-panel" aria-label="Estoque de remédios">
      <div className="mgr-toolbar">
        <input type="search" aria-label="Buscar remédios" placeholder="Buscar nome, dosagem ou fabricante…" value={search} onChange={e => setSearch(e.target.value)} />
        <button type="button" className="directory-row-action" disabled={loading} onClick={() => { setError(""); setLoading(true); setVersion(v => v + 1); }}>Atualizar</button>
      </div>
      <p className="mgr-table-note">Quantidade total somada entre todas as farmácias e lotes cadastrados.</p>
      {loading ? <p className="mgr-empty" role="status">Carregando remédios…</p> : error ? <p className="mgr-empty" role="alert">{error} Use Atualizar para tentar novamente.</p> : <>
        <div className="mgr-table-wrap"><table>
          <thead><tr><th scope="col">Remédio</th><th scope="col">Dosagem</th><th scope="col">Fabricante</th><th scope="col">Quantidade</th></tr></thead>
          <tbody>{filtered.map(item => {
            const count = quantity(item.quantidade);
            const level = count === null ? null : levels.find(entry => count <= entry.max);
            return <tr key={item.idRemedio}>
              <td><div className="emp-medicine-name"><strong>{item.nomeRemedio}</strong>{level ? <span className={`mgr-badge emp-stock-tag emp-stock-${level.color}`} title={`${level.range} unidades`}>{level.label}</span> : <span className="mgr-badge neutral">Indisponível</span>}</div></td><td>{item.dosagemRemedio || "—"}</td><td>{item.fabricanteRemedio || "—"}</td>
              <td>{count === null ? "Não informada" : count.toLocaleString("pt-BR")}</td>
            </tr>;
          })}</tbody>
        </table></div>
        {!filtered.length && <p className="mgr-empty">{medicines.length ? "Nenhum remédio encontrado para esta busca." : "Nenhum remédio cadastrado no sistema."}</p>}
        <p className="mgr-table-note">{filtered.length} de {medicines.length} remédios</p>
      </>}
    </section>
  </>;
}