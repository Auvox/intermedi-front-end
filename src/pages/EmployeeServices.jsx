import { useEffect, useRef, useState } from "react";
import { DirectoryStats, PersonCell } from "../components/Directory";

const API = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}
const emptyItem = () => ({ key: crypto.randomUUID(), idRemedio: "", quantidade: "1" });

export default function EmployeeServices() {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [employeeId, setEmployeeId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState(() => [emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [services, setServices] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [listVersion, setListVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const submitting = useRef(false);
  const newButton = useRef(null);
  const firstField = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request("/servicos", { signal: controller.signal }).then(data => {
      if (!Array.isArray(data.servicos)) throw new Error("Resposta inválida ao consultar serviços.");
      if (!controller.signal.aborted) { setServices(data.servicos); setListError(""); }
    }).catch(err => {
      if (!controller.signal.aborted) setListError(`Não foi possível consultar os serviços. ${err.message}`);
    }).finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [listVersion]);
  const normalize = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = services.filter(service =>
    (!unitFilter || String(service.idFarmacia) === unitFilter) &&
    normalize(`${service.idServico} ${service.nomePaciente} ${service.nomeFuncionario} ${service.nomeFarmacia}`).includes(normalize(search.trim())));
  const units = [...new Map(services.map(service => [service.idFarmacia, service.nomeFarmacia])).entries()];

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const options = { signal: controller.signal };
        const [employees, patients, medicines] = await Promise.all([
          request("/funcionario", options), request("/paciente", options), request("/remedios", options),
        ]);
        if (![employees.funcionario, patients.paciente, medicines.remedios].every(Array.isArray)) {
          throw new Error("Não foi possível ler as opções de cadastro.");
        }
        if (controller.signal.aborted) return;
        setCatalog({ employees: employees.funcionario, patients: patients.paciente, medicines: medicines.remedios });
        try {
          const session = JSON.parse(sessionStorage.getItem("intermediEmployeeSession") || "null");
          if (employees.funcionario.some(e => String(e.idFuncionario) === String(session?.id))) {
            setEmployeeId(String(session.id));
          }
        } catch { /* A seleção manual continua disponível sem uma sessão válida. */ }
      } catch (err) {
        if (!controller.signal.aborted) setLoadError(`Não foi possível carregar o cadastro. ${err.message}`);
      }
    }
    load();
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => { if (open) firstField.current?.focus(); }, [open]);
  const employee = catalog?.employees.find(e => String(e.idFuncionario) === employeeId);
  const ready = catalog && catalog.employees.length > 0 && catalog.patients.length > 0 && catalog.medicines.length > 0;
  function updateItem(key, field, value) {
    setItems(current => current.map(item => item.key === key ? { ...item, [field]: value } : item));
  }
  function close() {
    setOpen(false);
    setError("");
    newButton.current?.focus();
  }
  async function save(event) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const payload = {
      idFuncionario: Number(employeeId), idPaciente: Number(patientId),
      idFarmacia: Number(employee?.fkIdFarmacia), observacao: notes.trim(),
      remedios: items.map(item => ({ idRemedio: Number(item.idRemedio), quantidade: Number(item.quantidade) })),
    };
    const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
    if (![payload.idFuncionario, payload.idPaciente, payload.idFarmacia].every(positiveInteger) ||
        !payload.remedios.length || payload.remedios.some(item => !positiveInteger(item.idRemedio) || !positiveInteger(item.quantidade))) {
      setError("Selecione o funcionário, o paciente e os medicamentos. Informe quantidades inteiras maiores que zero.");
      return;
    }
    if (new Set(payload.remedios.map(item => item.idRemedio)).size !== items.length) {
      setError("Selecione cada medicamento apenas uma vez.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const result = await request("/servicos", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setSuccess(`Serviço nº ${result.recebido.idServico} cadastrado com sucesso.`);
      setListVersion(version => version + 1);
      setPatientId(""); setNotes(""); setItems([emptyItem()]);
      close();
    } catch (err) {
      setError(`Não foi possível salvar o serviço. ${err.message}`);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <header className="mgr-page-head mgr-page-head-featured">
        <div>
          <p className="mgr-eyebrow">ESPAÇO DO FUNCIONÁRIO</p>
          <h1>Serviços</h1>
          <p>Registre o paciente atendido e os medicamentos do serviço.</p>
        </div>
        <button ref={newButton} type="button" className="mgr-primary" disabled={open || !ready}
          onClick={() => { setOpen(true); setSuccess(""); }} aria-expanded={open} aria-controls="service-registration">
          + Novo cadastro
        </button>
      </header>
      <DirectoryStats items={[["Total de serviços", listLoading || listError ? null : services.length, "ticket"], ["Pacientes atendidos", listLoading || listError ? null : new Set(services.map(s => s.idPaciente)).size, "heart"]]} />
      {success && <p className="emp-service-success" role="status">{success}</p>}
      {!open && <section className="mgr-panel" aria-label="Lista de serviços">
        <div className="mgr-toolbar">
          <input type="search" aria-label="Buscar serviços" placeholder="Buscar paciente, funcionário ou código…" value={search} onChange={e => setSearch(e.target.value)} />
          <select aria-label="Filtrar serviços por unidade" value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
            <option value="">Todas as unidades</option>
            {units.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <button type="button" className="directory-row-action" disabled={listLoading} onClick={() => { setListLoading(true); setListVersion(v => v + 1); }}>Atualizar</button>
        </div>
        {listLoading ? <p className="mgr-empty" role="status">Carregando serviços…</p> : listError ? <p className="mgr-empty" role="alert">{listError}</p> : <>
          <div className="mgr-table-wrap"><table>
            <thead><tr><th scope="col">Paciente</th><th scope="col">Unidade</th><th scope="col">Funcionário</th><th scope="col">Medicamentos</th><th scope="col">Data</th></tr></thead>
            <tbody>{filtered.map(service => <tr key={service.idServico}>
              <td><PersonCell name={service.nomePaciente} detail={`Serviço nº ${service.idServico}`} /></td>
              <td>{service.nomeFarmacia}</td><td>{service.nomeFuncionario}</td>
              <td>{service.totalMedicamentos} itens<small>{service.quantidadeTotal} unidades</small></td>
              <td>{new Date(service.dataServico.replace(" ", "T") + "Z").toLocaleString("pt-BR")}</td>
            </tr>)}</tbody>
          </table></div>
          {!filtered.length && <p className="mgr-empty">Nenhum serviço encontrado.</p>}
          <p className="mgr-table-note">{filtered.length} de {services.length} registros</p>
        </>}
      </section>}
      {(open || loadError || !ready) && <section className="mgr-panel" aria-labelledby="service-title">
        <div className="mgr-toolbar"><h2 id="service-title">{open ? "Novo serviço" : "Cadastro de serviços"}</h2></div>
        {loadError ? <div className="mgr-empty" role="alert">{loadError}<br />
          <button type="button" className="mgr-secondary" onClick={() => { setLoadError(""); setAttempt(a => a + 1); }}>Tentar novamente</button>
        </div> : !catalog ? <p className="mgr-empty" role="status">Carregando pacientes, funcionários e medicamentos…</p>
          : !ready ? <p className="mgr-empty">É necessário ter funcionários, pacientes e medicamentos cadastrados para registrar um serviço.</p>
          : !open ? <p className="mgr-empty">Clique em “Novo cadastro” para registrar um atendimento.</p> : null}
        {open && <form id="service-registration" className="mgr-form emp-service-form" onSubmit={save} aria-busy={saving}>
          <fieldset disabled={saving} className="emp-service-fields">
            <div className="mgr-form-row">
              <label>Funcionário responsável
                <select ref={firstField} required value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                  <option value="">Selecione o funcionário</option>
                  {catalog.employees.map(e => <option key={e.idFuncionario} value={e.idFuncionario}>{e.nomeFuncionario} · {e.nomeFarmacia}</option>)}
                </select>
              </label>
              <label>Farmácia do atendimento<input readOnly value={employee?.nomeFarmacia || ""} placeholder="Selecione um funcionário" /></label>
            </div>
            <label>Paciente
              <select required value={patientId} onChange={e => setPatientId(e.target.value)}>
                <option value="">Selecione o paciente</option>
                {catalog.patients.map(p => <option key={p.idPaciente} value={p.idPaciente}>{p.nomePaciente} · CPF {p.cpfPaciente}</option>)}
              </select>
            </label>
            <fieldset className="emp-service-medicines">
              <legend>Medicamentos do serviço</legend>
              {items.map((item, index) => <div className="emp-service-item" key={item.key}>
                <label>Medicamento {index + 1}
                  <select required value={item.idRemedio} onChange={e => updateItem(item.key, "idRemedio", e.target.value)}>
                    <option value="">Selecione o medicamento</option>
                    {catalog.medicines.map(m => <option key={m.idRemedio} value={m.idRemedio}
                      disabled={items.some(other => other.key !== item.key && other.idRemedio === String(m.idRemedio))}>
                      {m.nomeRemedio} · {m.dosagemRemedio || "Dosagem não informada"} · {m.fabricanteRemedio || "Fabricante não informado"}
                    </option>)}
                  </select>
                </label>
                <label>Quantidade<input required type="number" min="1" step="1" max={Number.MAX_SAFE_INTEGER}
                  value={item.quantidade} onChange={e => updateItem(item.key, "quantidade", e.target.value)} /></label>
                <button className="mgr-secondary" type="button" disabled={items.length === 1}
                  aria-label={`Remover medicamento ${index + 1}`} onClick={() => setItems(current => current.filter(i => i.key !== item.key))}>Remover</button>
              </div>)}
              <button type="button" className="mgr-secondary" disabled={items.length >= catalog.medicines.length}
                onClick={() => setItems(current => [...current, emptyItem()])}>+ Adicionar medicamento</button>
            </fieldset>
            <label>Observação (opcional)<textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações adicionais sobre o atendimento" /></label>
            {error && <p role="alert">{error}</p>}
            <div className="mgr-modal-actions">
              <button className="mgr-secondary" type="button" onClick={close}>Cancelar</button>
              <button className="mgr-primary" type="submit">{saving ? "Salvando…" : "Cadastrar serviço"}</button>
            </div>
          </fieldset>
        </form>}
      </section>}
    </>
  );
}
