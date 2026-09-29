import { useEffect, useRef, useState } from "react";
import { DirectoryStats } from "../components/Directory";
import ManagerIcon from "../components/ManagerIcon";

import { apiRequest as request, listarFuncionarios, listarPacientes, listarRemedios } from "../services/api";
const emptyItem = () => ({ key: crypto.randomUUID(), idRemedio: "", quantidade: "1" });

function ServiceModal({ children, onClose, title = "Solicitar serviço" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="mgr-modal emp-service-modal"
      aria-labelledby="service-modal-title"
      onCancel={onClose}
    >
      <div className="mgr-modal-head">
        <h2 id="service-modal-title">{title}</h2>
        <button type="button" aria-label="Fechar janela" onClick={onClose}>×</button>
      </div>
      {children}
    </dialog>
  );
}

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
  const [selectedService, setSelectedService] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const submitting = useRef(false);
  const newButton = useRef(null);
  const firstField = useRef(null);
  const detailController = useRef(null);

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
          listarFuncionarios(options), listarPacientes(options), listarRemedios(options),
        ]);
        if (controller.signal.aborted) return;
        setCatalog({ employees, patients, medicines });
        try {
          const session = JSON.parse(sessionStorage.getItem("intermediEmployeeSession") || "null");
          if (employees.some(e => String(e.idFuncionario) === String(session?.id))) {
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
  }
  async function openDetails(service) {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setSelectedService(service);
    setDetailLoading(true);
    setDetailError("");
    try {
      const data = await request(`/servicos/${service.idServico}`, { signal: controller.signal });
      if (!data.resultado) throw new Error("O servidor não retornou os detalhes do serviço.");
      setSelectedService(data.resultado);
    } catch (err) {
      if (err.name !== "AbortError") setDetailError(`Não foi possível carregar os detalhes. ${err.message}`);
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }
  function closeDetails() {
    detailController.current?.abort();
    setSelectedService(null);
    setDetailError("");
  }
  const formatDate = value => value
    ? new Date(value.replace(" ", "T") + "Z").toLocaleString("pt-BR")
    : "Não informada";
  const display = value => value === null || value === undefined || value === "" ? "Não informado" : value;
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
      setSuccess(`Serviço nº ${result.recebido.idServico} solicitado com sucesso.`);
      setListVersion(version => version + 1);
      setPatientId(""); setNotes(""); setItems([emptyItem()]);
      close();
    } catch (err) {
      setError(`Não foi possível solicitar o serviço. ${err.message}`);
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
          <p>Consulte os atendimentos e solicite um novo serviço.</p>
        </div>
        <button ref={newButton} type="button" className="mgr-primary" disabled={open || !ready}
          onClick={() => { setOpen(true); setSuccess(""); }} aria-expanded={open} aria-controls="service-registration">
          + Solicitar serviço
        </button>
      </header>
      <DirectoryStats items={[["Total de serviços", listLoading || listError ? null : services.length, "ticket"], ["Pacientes atendidos", listLoading || listError ? null : new Set(services.map(s => s.idPaciente)).size, "heart"]]} />
      {success && <p className="emp-service-success" role="status">{success}</p>}
      <section className="mgr-panel" aria-label="Lista de serviços">
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
            <thead><tr><th scope="col">Serviço</th><th scope="col">Unidade</th><th scope="col">Funcionário</th><th scope="col">Medicamentos</th><th scope="col">Data</th></tr></thead>
            <tbody>{filtered.map(service => <tr key={service.idServico}>
              <td><button type="button" className="emp-service-link" onClick={() => openDetails(service)} aria-label={`Consultar serviço nº ${service.idServico}`}>
                <span className="emp-service-icon"><ManagerIcon name="clipboard" size={19} /></span>
                <span><strong>Serviço nº {service.idServico}</strong><small>Ver informações</small></span>
              </button></td>
              <td>{service.nomeFarmacia}</td><td>{service.nomeFuncionario}</td>
              <td>{service.totalMedicamentos} itens<small>{service.quantidadeTotal} unidades</small></td>
              <td>{formatDate(service.dataServico)}</td>
            </tr>)}</tbody>
          </table></div>
          {!filtered.length && <p className="mgr-empty">Nenhum serviço encontrado.</p>}
          <p className="mgr-table-note">{filtered.length} de {services.length} registros</p>
        </>}
      </section>
      {(loadError || !ready) && <section className="mgr-panel" aria-labelledby="service-status-title">
        <div className="mgr-toolbar"><h2 id="service-status-title">Solicitação de serviços</h2></div>
        {loadError ? <div className="mgr-empty" role="alert">{loadError}<br />
          <button type="button" className="mgr-secondary" onClick={() => { setLoadError(""); setAttempt(a => a + 1); }}>Tentar novamente</button>
        </div> : !catalog ? <p className="mgr-empty" role="status">Carregando pacientes, funcionários e medicamentos…</p>
          : <p className="mgr-empty">É necessário ter funcionários, pacientes e medicamentos cadastrados para solicitar um serviço.</p>}
      </section>}
      {open && <ServiceModal onClose={close}>
        <form id="service-registration" className="mgr-form emp-service-form" onSubmit={save} aria-busy={saving}>
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
                    {catalog.medicines.map(m => <option key={m.id} value={m.id}
                      disabled={items.some(other => other.key !== item.key && other.idRemedio === m.id)}>
                      {m.name} · {m.dose || "Dosagem não informada"} · {m.manufacturer || "Fabricante não informado"}
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
              <button className="mgr-primary" type="submit">{saving ? "Solicitando…" : "Solicitar serviço"}</button>
            </div>
          </fieldset>
        </form>
      </ServiceModal>}
      {selectedService && <ServiceModal title={`Serviço nº ${selectedService.idServico}`} onClose={closeDetails}>
        {detailLoading ? <p className="mgr-empty" role="status">Carregando informações do serviço…</p>
          : detailError ? <p className="mgr-empty" role="alert">{detailError}</p>
          : <div className="emp-service-details">
            <section>
              <h3>Resumo do serviço</h3>
              <dl>
                <div><dt>Código</dt><dd>#{selectedService.idServico}</dd></div>
                <div><dt>Data e hora</dt><dd>{formatDate(selectedService.dataServico)}</dd></div>
                <div><dt>Total de medicamentos</dt><dd>{selectedService.totalMedicamentos}</dd></div>
                <div><dt>Total de unidades</dt><dd>{selectedService.quantidadeTotal}</dd></div>
                <div className="emp-service-detail-wide"><dt>Observação</dt><dd>{display(selectedService.observacao)}</dd></div>
              </dl>
            </section>
            <section>
              <h3>Paciente</h3>
              <dl>
                <div><dt>Nome</dt><dd>{display(selectedService.nomePaciente)}</dd></div>
                <div><dt>ID</dt><dd>#{selectedService.idPaciente}</dd></div>
                <div><dt>CPF</dt><dd>{display(selectedService.cpfPaciente)}</dd></div>
                <div><dt>Telefone</dt><dd>{display(selectedService.telPaciente)}</dd></div>
                <div><dt>E-mail</dt><dd>{display(selectedService.emailPaciente)}</dd></div>
                <div><dt>Medicamento frequente</dt><dd>{display(selectedService.medicamentoFrequentePaciente)}</dd></div>
              </dl>
            </section>
            <section>
              <h3>Funcionário responsável</h3>
              <dl>
                <div><dt>Nome</dt><dd>{display(selectedService.nomeFuncionario)}</dd></div>
                <div><dt>ID</dt><dd>#{selectedService.idFuncionario}</dd></div>
                <div><dt>Matrícula</dt><dd>{display(selectedService.matriculaFuncionario)}</dd></div>
                <div><dt>Cargo</dt><dd>{display(selectedService.cargoFuncionario)}</dd></div>
                <div><dt>Turno</dt><dd>{display(selectedService.turnoFuncionario)}</dd></div>
                <div><dt>CPF</dt><dd>{display(selectedService.cpfFuncionario)}</dd></div>
                <div><dt>E-mail</dt><dd>{display(selectedService.emailFuncionario)}</dd></div>
                <div><dt>Telefone</dt><dd>{display(selectedService.telFuncionario)}</dd></div>
              </dl>
            </section>
            <section>
              <h3>Farmácia</h3>
              <dl>
                <div><dt>Unidade</dt><dd>{display(selectedService.nomeFarmacia)}</dd></div>
                <div><dt>ID</dt><dd>#{selectedService.idFarmacia}</dd></div>
                <div><dt>CNES</dt><dd>{display(selectedService.cnesFarmacia)}</dd></div>
                <div><dt>Telefone</dt><dd>{display(selectedService.telFarmacia)}</dd></div>
                <div className="emp-service-detail-wide"><dt>E-mail</dt><dd>{display(selectedService.emailFarmacia)}</dd></div>
              </dl>
            </section>
            <section>
              <h3>Medicamentos</h3>
              <div className="emp-service-detail-medicines">
                {selectedService.remedios.map(item => <article key={item.idRemedio}>
                  <div><strong>{item.nomeRemedio}</strong><span>{display(item.dosagemRemedio)}</span></div>
                  <b>{item.quantidade} un.</b>
                  <p>{display(item.descRemedio)}</p>
                  <small>{display(item.fabricanteRemedio)} · {display(item.categorias)}</small>
                </article>)}
              </div>
            </section>
            <div className="mgr-modal-actions"><button type="button" className="mgr-primary" onClick={closeDetails}>Fechar</button></div>
          </div>}
      </ServiceModal>}
    </>
  );
}
