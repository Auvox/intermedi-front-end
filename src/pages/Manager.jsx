import { useEffect, useRef, useState } from "react";
import {
  Link,
  Outlet,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";
import ManagerSidebar from "../components/ManagerSidebar";
import ManagerIcon from "../components/ManagerIcon";
import { AccountControls } from "../components/ManagerAccess";
import {
  availability,
  formatDate,
  initialData,
  inPeriod,
  unit,
} from "./managerData";
import "../styles/manager.css";
import "../styles/managerRefresh.css";

function Badge({ tone = "green", children }) {
  return <span className={`mgr-badge ${tone}`}>{children}</span>;
}
function Empty() {
  return (
    <p className="mgr-empty">Nenhum registro encontrado para estes filtros.</p>
  );
}
function Period({ value, onChange }) {
  return (
    <select
      aria-label="Filtrar por período"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Todo o período</option>
      <option value="7">Últimos 7 dias</option>
      <option value="30">Últimos 30 dias</option>
      <option value="90">Últimos 90 dias</option>
    </select>
  );
}
function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="mgr-modal"
      aria-label={title}
      ref={ref}
      onCancel={onClose}
    >
      <div className="mgr-modal-head">
        <h2>{title}</h2>
        <button aria-label="Fechar janela" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Header({ eyebrow, title, description, action, featured = false }) {
  return (
    <header
      className={`mgr-page-head${featured ? " mgr-page-head-featured" : ""}`}
    >
      <div>
        <p className="mgr-eyebrow">{eyebrow || "GESTÃO DA UNIDADE"}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
function Stats({ items }) {
  return (
    <div className="mgr-stats">
      {items.map(([label, value, detail, icon]) => (
        <article key={label}>
          <div>
            <span>{label}</span>
            <i>
              <ManagerIcon
                name={
                  icon ||
                  (/paciente/i.test(label)
                    ? "heart"
                    : /chamado/i.test(label)
                    ? "ticket"
                    : /retirada/i.test(label)
                    ? "clock"
                    : "box")
                }
              />
            </i>
          </div>
          <strong>{value}</strong>
          <small>{detail}</small>
        </article>
      ))}
    </div>
  );
}
function MedicineTable({ medicines }) {
  return (
    <div className="mgr-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Unidade</th>
            <th>Quantidade</th>
            <th>Validade</th>
            <th>Disponibilidade</th>
          </tr>
        </thead>
        <tbody>
          {medicines.map((m) => (
            <tr key={m.id}>
              <td>
                <strong>{m.name}</strong>
                <small>{m.dose}</small>
              </td>
              <td>{m.unit}</td>
              <td>
                <strong>{m.quantity}</strong> un.
              </td>
              <td>{formatDate(m.expiry)}</td>
              <td>
                <Badge tone={availability(m).tone}>
                  {availability(m).label}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!medicines.length && <Empty />}
    </div>
  );
}
export default function Manager() {
  const { user } = useOutletContext();
  const data = initialData;
  useEffect(() => {
    document.title = "Área do gerente | Intermedi";
    return () => {
      document.title = "Intermedi";
    };
  }, []);
  const external = data.tickets.filter(
    (t) => t.unit !== unit && t.status !== "Resolvido"
  ).length;
  return (
    <div className="mgr-shell">
      <ManagerSidebar unitName={user.unitName} external={external} />
      <div className="mgr-workspace">
        <div className="mgr-topbar">
          <span>
            <span className="mgr-topbar-unit-prefix">Painel de gestão</span>{" "}
            <span className="mgr-topbar-divider">/</span>{" "}
            <strong>{user.unitName}</strong>
          </span>
          <Link
            to="/gerente/chamados?origem=rede"
            className="mgr-notifications"
            aria-label={`${external} chamados abertos de outras farmácias`}
          >
            <ManagerIcon name="bell" size={17} />
            <b>{external}</b>
          </Link>
          <AccountControls user={user} />
        </div>
        <main className="mgr-main">
          <Outlet context={{ data, user }} />
        </main>
        <footer className="mgr-footer">
          Intermedi <span>Conectando farmácias. Aproximando o cuidado.</span>
        </footer>
      </div>
    </div>
  );
}
export function ManagerDashboard() {
  const { data } = useOutletContext();
  const medicines = data.medicines.filter((m) => m.unit === unit);
  const tickets = data.tickets.filter((t) => t.unit === unit);
  const pending = tickets.filter((t) => t.status !== "Resolvido");
  return (
    <>
      <Header
        featured
        eyebrow="SEU CUIDADO COMEÇA AQUI"
        title="Tudo pronto para cuidar."
        description="Acompanhe sua unidade e mantenha o cuidado em movimento."
        action={
          <Link className="mgr-primary" to="/gerente/chamados">
            Abrir chamados <span>↗</span>
          </Link>
        }
      />
      <Stats
        items={[
          [
            "Total de chamados",
            tickets.length,
            `${pending.length} precisam de atenção`,
            "ticket",
          ],
          [
            "Remédios cadastrados",
            medicines.length,
            "Medicamentos da sua unidade",
            "pill",
          ],
          [
            "Pacientes da unidade",
            data.patients.length,
            "Pessoas com histórico de retirada",
            "heart",
          ],
        ]}
      />
      <div className="mgr-insight">
        <span className="mgr-insight-icon">
          <ManagerIcon name="pill" />
        </span>
        <div>
          <strong>Estoque em dia, cuidado que continua.</strong>
          <p>
            {medicines.filter((m) => availability(m).tone !== "green").length}{" "}
            medicamentos precisam de atenção. Consulte o estoque e acompanhe as
            solicitações da equipe.
          </p>
        </div>
        <Link to="/gerente/remedios">Ver estoque →</Link>
      </div>
      <section className="mgr-panel">
        <div className="mgr-panel-head">
          <div>
            <h2>Estoque da unidade</h2>
            <p>Uma visão do estoque e dos itens que precisam de atenção.</p>
          </div>
          <Link to="/gerente/remedios">Ver todos →</Link>
        </div>
        <MedicineTable medicines={medicines} />
        <p className="mgr-table-note">
          Crítico: até o mínimo · Quase acabando: até 2× o mínimo · Disponível:
          acima de 2× o mínimo.
        </p>
      </section>
      <section className="mgr-panel">
        <div className="mgr-panel-head">
          <div>
            <h2>Chamados que precisam de você</h2>
            <p>Solicitações abertas pela sua equipe.</p>
          </div>
          <Badge tone="yellow">{pending.length} abertos</Badge>
        </div>
        {pending.map((t) => (
          <div className="mgr-ticket-line" key={t.id}>
            <span className="mgr-avatar">
              {data.employees.find((e) => e.id === t.employee)?.name[0]}
            </span>
            <div>
              <strong>{t.title}</strong>
              <small>
                {data.employees.find((e) => e.id === t.employee)?.name} ·{" "}
                {formatDate(t.date)}
              </small>
            </div>
            <Badge tone={t.priority === "Alta" ? "red" : "yellow"}>
              {t.priority}
            </Badge>
            <Link to={`/gerente/chamados?chamado=${t.id}`}>
              Abrir chamado →
            </Link>
          </div>
        ))}
        {!pending.length && (
          <p className="mgr-empty">Tudo em dia! Nenhum chamado pendente.</p>
        )}
      </section>
    </>
  );
}
export function ManagerEmployees() {
  const { data } = useOutletContext();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [period, setPeriod] = useState("");
  const employees = data.employees.filter((e) =>
    `${e.name} ${e.role}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase())
  );
  const deliveries = data.deliveries.filter(
    (d) => d.employee === selected?.id && inPeriod(d.date, period)
  );
  const tickets = data.tickets.filter(
    (t) => t.employee === selected?.id && inPeriod(t.date, period)
  );

  const [nomeFuncionario, setNomeFuncionario] = useState("");
  const [cpfFuncionario, setCpfFuncionario] = useState("");
  const [emailFuncionario, setEmailFuncionario] = useState("");
  const [matriculaFuncionario, setMatriculaFuncionario] = useState("");
  const [telFuncionario, setTelFuncionario] = useState("");
  const [cargoFuncionario, setCargoFuncionario] = useState("atendente");
  const [turnoFuncionario, setTurnoFuncionario] = useState("manha");
  const [cadastroMensagem, setCadastroMensagem] = useState("");
  const [cadastrando, setCadastrando] = useState(false);

  async function cadastrarFuncionario(event) {
    event.preventDefault();
    setCadastrando(true);
    setCadastroMensagem("");

    const funcionario = {
      nomeFuncionario: nomeFuncionario.trim(),
      cpfFuncionario: cpfFuncionario.trim(),
      emailFuncionario: emailFuncionario.trim().toLowerCase(),
      matriculaFuncionario: matriculaFuncionario.trim(),
      telFuncionario: telFuncionario.trim(),
      cargoFuncionario,
      turnoFuncionario,
    };

    try {
      const response = await fetch("http://localhost:3000/funcionario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(funcionario),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível cadastrar o funcionário.");
      }

      setCadastroMensagem("Funcionário cadastrado com sucesso.");
      setNomeFuncionario("");
      setCpfFuncionario("");
      setEmailFuncionario("");
      setMatriculaFuncionario("");
      setTelFuncionario("");
      setCargoFuncionario("atendente");
      setTurnoFuncionario("manha");
    } catch (error) {
      setCadastroMensagem(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar ao servidor de funcionários.",
      );
    } finally {
      setCadastrando(false);
    }
  }

  return (
    <>
      <Header
        title="Sua equipe, conectada."
        description="Conheça os profissionais que fazem o cuidado acontecer."
        action={
          <button
            className="mgr-primary"
            onClick={() => {
              setCadastroMensagem("");
              setAdding(true);
            }}
          >
            + Adicionar funcionário
          </button>
        }
      />
      <Stats
        items={[
          [
            "Profissionais da unidade",
            data.employees.length,
            "Sua equipe de atendimento",
            "people",
          ],
          [
            "Atendimentos registrados",
            data.deliveries.length,
            "Histórico de retiradas da unidade",
            "heart",
          ],
          [
            "Chamados da equipe",
            data.tickets.filter((t) => t.unit === unit).length,
            "Solicitações de todos os períodos",
            "ticket",
          ],
        ]}
      />
      <section className="mgr-panel">
        <div className="mgr-toolbar">
          <h2>
            Funcionários <Badge>{data.employees.length}</Badge>
          </h2>
          <input
            aria-label="Buscar funcionário"
            placeholder="Buscar nome ou cargo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mgr-employee-grid">
          {employees.map((e) => (
            <button
              className="mgr-employee-card"
              key={e.id}
              onClick={() => {
                setSelected(e);
                setPeriod("");
              }}
            >
              <span className="mgr-avatar">
                {e.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <strong>{e.name}</strong>
              <span>{e.role}</span>
              <small>Turno: {e.shift}</small>
              <span className="mgr-card-link">Ver ficha do funcionário ↗</span>
            </button>
          ))}
        </div>
        {!employees.length && <Empty />}
      </section>
      {adding && (

        // adicionar funcionarios
        <Modal title="Adicionar funcionário" onClose={() => setAdding(false)}>
          <form className="mgr-form" onSubmit={cadastrarFuncionario}>
            <label>
              Nome completo
              <input name="nomeFuncionario" required maxLength={120} value={nomeFuncionario} onChange={({ target }) => setNomeFuncionario(target.value)} />
            </label>
            <label>
              CPF
              <input name="cpfFuncionario" required maxLength={14} value={cpfFuncionario} onChange={({ target }) => setCpfFuncionario(target.value)} />
            </label>
            <label>
              E-mail
              <input type="email" name="emailFuncionario" required maxLength={254} value={emailFuncionario} onChange={({ target }) => setEmailFuncionario(target.value)} />
            </label>
            <label>
              Matrícula
              <input name="matriculaFuncionario" required maxLength={255} value={matriculaFuncionario} onChange={({ target }) => setMatriculaFuncionario(target.value)} />
            </label>
            <label>
              Telefone
              <input type="text" name="telFuncionario" maxLength={20} value={telFuncionario} onChange={({ target }) => setTelFuncionario(target.value)} />
            </label>
            <label>
              Cargo
              <select name="cargoFuncionario" value={cargoFuncionario} onChange={({ target }) => setCargoFuncionario(target.value)}>
                <option value="atendente">Atendente</option>
                <option value="farmaceutico">Farmacêutico(a)</option>
                <option value="auxiliar de farmacia">Auxiliar de farmácia</option>
              </select>
            </label>
            <label>
              Turno
              <select name="turnoFuncionario" value={turnoFuncionario} onChange={({ target }) => setTurnoFuncionario(target.value)}>
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
                <option value="integral">Integral</option>
              </select>
            </label>
            {cadastroMensagem && <p role="status">{cadastroMensagem}</p>}
            <button className="mgr-primary" disabled={cadastrando}>
              {cadastrando ? "Cadastrando…" : "Cadastrar funcionário"}
            </button>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <p>
            {selected.role} · {selected.shift}
          </p>
          <p>{selected.email}</p>
          <div className="mgr-toolbar">
            <h3>Atividade na unidade</h3>
            <Period value={period} onChange={setPeriod} />
          </div>
          <Stats
            items={[
              ["Chamados", tickets.length, "No período"],
              [
                "Pacientes atendidos",
                new Set(deliveries.map((d) => d.patient)).size,
                "Pessoas distintas",
              ],
              [
                "Retiradas",
                deliveries.length,
                `${deliveries.reduce(
                  (sum, d) => sum + d.quantity,
                  0
                )} unidades entregues`,
              ],
            ]}
          />
          <h3>Chamados do funcionário</h3>
          {tickets.map((t) => (
            <div className="mgr-detail-line" key={t.id}>
              <strong>{t.title}</strong>
              <span>
                {formatDate(t.date)} · {t.status}
              </span>
            </div>
          ))}
          {!tickets.length && <Empty />}
          <h3>Histórico de atendimentos</h3>
          {deliveries.map((d) => (
            <div className="mgr-detail-line" key={d.id}>
              <strong>
                {data.patients.find((p) => p.id === d.patient)?.name}
              </strong>
              <span>
                {data.medicines.find((m) => m.id === d.medicine)?.name} ·{" "}
                {d.quantity} un. · {formatDate(d.date)}
              </span>
            </div>
          ))}
          {!deliveries.length && <Empty />}
        </Modal>
      )}
    </>
  );
}
export function ManagerPatients() {
  const { data } = useOutletContext();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("");
  const deliveries = data.deliveries
    .filter(
      (d) =>
        inPeriod(d.date, period) &&
        `${data.patients.find((p) => p.id === d.patient)?.name} ${
          data.medicines.find((m) => m.id === d.medicine)?.name
        }`
          .toLowerCase()
          .includes(search.toLowerCase())
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <Header
        title="Cuidado com história."
        description="Consulte os pacientes e acompanhe cada retirada na sua unidade."
      />
      <Stats
        items={[
          [
            "Pacientes no período",
            new Set(deliveries.map((d) => d.patient)).size,
            "Pessoas distintas nos resultados",
          ],
          [
            "Retiradas registradas",
            deliveries.length,
            "Conforme os filtros selecionados",
          ],
          [
            "Unidades entregues",
            deliveries.reduce((sum, d) => sum + d.quantity, 0),
            "Total nos resultados",
          ],
        ]}
      />
      <section className="mgr-panel">
        <div className="mgr-toolbar">
          <input
            aria-label="Buscar paciente ou medicamento"
            placeholder="Buscar paciente ou medicamento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Period value={period} onChange={setPeriod} />
        </div>
        <div className="mgr-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Medicamento</th>
                <th>Quantidade</th>
                <th>Data da retirada</th>
                <th>Atendido por</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>
                      {data.patients.find((p) => p.id === d.patient)?.name}
                    </strong>
                    <small>Registro {d.patient.toUpperCase()}</small>
                  </td>
                  <td>
                    {data.medicines.find((m) => m.id === d.medicine)?.name}
                    <small>
                      {data.medicines.find((m) => m.id === d.medicine)?.dose}
                    </small>
                  </td>
                  <td>{d.quantity} un.</td>
                  <td>{formatDate(d.date)}</td>
                  <td>
                    {data.employees.find((e) => e.id === d.employee)?.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!deliveries.length && <Empty />}
        </div>
      </section>
    </>
  );
}
export function ManagerMedicines() {
  const { data } = useOutletContext();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const medicines = data.medicines.filter(
    (m) =>
      `${m.name} ${m.dose}`.toLowerCase().includes(search.toLowerCase()) &&
      (!scope || m.unit === scope) &&
      (!status || availability(m).tone === status)
  );
  return (
    <>
      <Header
        title="Estoque sob cuidado."
        description="Consulte medicamentos da rede e cadastre itens na sua unidade."
        action={
          <button
            className="mgr-primary"
            onClick={() => {
              setAdding(true);
            }}
          >
            + Cadastrar remédio
          </button>
        }
      />
      <Stats
        items={[
          [
            "Itens no catálogo",
            medicines.length,
            "Conforme os filtros selecionados",
            "pill",
          ],
          [
            "Estoque disponível",
            medicines.filter((m) => availability(m).tone === "green").length,
            "Acima de duas vezes o mínimo",
            "check",
          ],
          [
            "Precisam de atenção",
            medicines.filter((m) => availability(m).tone !== "green").length,
            "Estoque baixo ou crítico",
            "alert",
          ],
        ]}
      />
      <section className="mgr-panel">
        <div className="mgr-toolbar">
          <input
            aria-label="Buscar remédio"
            placeholder="Buscar medicamento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filtrar unidade"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="">Todas as unidades</option>
            {[...new Set(data.medicines.map((m) => m.unit))].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar disponibilidade"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todas as disponibilidades</option>
            <option value="green">Disponível</option>
            <option value="yellow">Quase acabando</option>
            <option value="red">Crítico</option>
          </select>
        </div>
        <MedicineTable medicines={medicines} />
        <p className="mgr-table-note">
          Crítico: quantidade ≤ mínimo · Quase acabando: quantidade ≤ 2× mínimo
          · Disponível: quantidade &gt; 2× mínimo.
        </p>
      </section>
      {adding && (
        <Modal title="Cadastrar remédio" onClose={() => setAdding(false)}>
          <form className="mgr-form" onSubmit={(event) => event.preventDefault()}>
            <p>Unidade: {unit}</p>
            <label>
              Nome do medicamento
              <input name="name" required maxLength={120} />
            </label>
            <label>
              Dosagem e apresentação
              <input
                name="dose"
                placeholder="Ex.: 500 mg · comprimidos"
                required
                maxLength={80}
              />
            </label>
            <div className="mgr-form-row">
              <label>
                Quantidade (unidades)
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  required
                />
              </label>
              <label>
                Estoque mínimo
                <input
                  name="minimum"
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  required
                />
              </label>
            </div>
            <label>
              Validade
              <input
                name="expiry"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                max="2100-12-31"
                required
              />
            </label>
            <button className="mgr-primary">Cadastrar remédio</button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function ManagerTickets() {
  const { data } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const scope = params.get("origem") || "unidade";
  const selected = data.tickets.find((t) => t.id === params.get("chamado"));
  const external = data.tickets.filter(
    (t) => t.unit !== unit && t.status !== "Resolvido"
  );
  const author = (t) =>
    data.employees.find((e) => e.id === t.employee)?.name ||
    t.author ||
    "Equipe da unidade";
  const tickets = data.tickets
    .filter(
      (t) =>
        (scope === "rede" ? t.unit !== unit : t.unit === unit) &&
        (!status || t.status === status) &&
        `${t.title} ${author(t)} ${t.unit}`
          .toLowerCase()
          .includes(search.toLowerCase())
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  function close() {
    const next = new URLSearchParams(params);
    next.delete("chamado");
    setParams(next);
  }
  return (
    <>
      <Header
        title="Cada chamado importa."
        description="Acompanhe solicitações, resolva pendências e conecte sua unidade à rede."
        action={
          <button
            className="mgr-primary"
            onClick={() => {
              setAdding(true);
            }}
          >
            + Novo chamado
          </button>
        }
      />
      <Stats
        items={[
          [
            "Pendentes",
            tickets.filter((t) => t.status === "Pendente").length,
            "Aguardando atendimento",
            "ticket",
          ],
          [
            "Em andamento",
            tickets.filter((t) => t.status === "Em andamento").length,
            "Solicitações em atendimento",
            "clock",
          ],
          [
            "Resolvidos",
            tickets.filter((t) => t.status === "Resolvido").length,
            "Atendimentos concluídos",
            "check",
          ],
        ]}
      />
      {external.length > 0 && (
        <div className="mgr-insight">
          <span className="mgr-insight-icon">
            <ManagerIcon name="bell" />
          </span>
          <div>
            <strong>
              {external.length}{" "}
              {external.length === 1
                ? "chamado aberto de outra farmácia"
                : "chamados abertos de outras farmácias"}
            </strong>
            <p>Outras unidades da rede precisam de atenção.</p>
          </div>
          <button
            className="mgr-text-button"
            onClick={() => {
              setStatus("");
              setSearch("");
              setParams({ origem: "rede" });
            }}
          >
            Ver notificações →
          </button>
        </div>
      )}
      <section className="mgr-panel">
        <div className="mgr-toolbar">
          <div className="mgr-tabs">
            <button
              aria-pressed={scope !== "rede"}
              onClick={() => setParams({})}
            >
              Minha unidade
            </button>
            <button
              aria-pressed={scope === "rede"}
              onClick={() => setParams({ origem: "rede" })}
            >
              Outras farmácias ({external.length})
            </button>
          </div>
          <select
            aria-label="Filtrar status do chamado"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option>Pendente</option>
            <option>Em andamento</option>
            <option>Resolvido</option>
          </select>
          <input
            aria-label="Buscar chamado"
            placeholder="Buscar assunto ou funcionário…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mgr-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Solicitante</th>
                <th>Data</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                    <small>
                      #{t.id.slice(0, 8)} · {t.unit}
                    </small>
                  </td>
                  <td>{author(t)}</td>
                  <td>{formatDate(t.date)}</td>
                  <td>
                    <Badge
                      tone={
                        t.priority === "Alta"
                          ? "red"
                          : t.priority === "Média"
                          ? "yellow"
                          : "neutral"
                      }
                    >
                      {t.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={t.status === "Resolvido" ? "green" : "yellow"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="mgr-text-button"
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set("chamado", t.id);
                        setParams(next);
                      }}
                    >
                      Abrir chamado ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tickets.length && <Empty />}
        </div>
      </section>
      {selected && (
        <Modal title={selected.title} onClose={close}>
          <div className="mgr-ticket-meta">
            <Badge tone={selected.status === "Resolvido" ? "green" : "yellow"}>
              {selected.status}
            </Badge>
            <span>Prioridade {selected.priority.toLowerCase()}</span>
          </div>
          <p>
            {author(selected)} · {selected.unit}
          </p>
          <p>Aberto em {formatDate(selected.date)}</p>
          <p className="mgr-description">{selected.description}</p>
          {selected.resolvedAt && (
            <p>Resolvido em {formatDate(selected.resolvedAt)}</p>
          )}
          {selected.unit === unit ? (
            <div className="mgr-modal-actions">
              {selected.status === "Pendente" && (
                <button
                  className="mgr-secondary"
                  type="button"
                >
                  Iniciar atendimento
                </button>
              )}
              {selected.status !== "Resolvido" ? (
                <button
                  className="mgr-primary"
                  type="button"
                >
                  Marcar como resolvido
                </button>
              ) : (
                <button
                  className="mgr-secondary"
                  type="button"
                >
                  Reabrir chamado
                </button>
              )}
            </div>
          ) : (
            <p className="mgr-demo">
              Este chamado pertence a outra farmácia. A atualização é feita pela
              unidade responsável.
            </p>
          )}
        </Modal>
      )}
      {adding && (
        <Modal title="Novo chamado" onClose={() => setAdding(false)}>
          <form className="mgr-form" onSubmit={(event) => event.preventDefault()}>
            <label>
              Assunto
              <input
                name="title"
                required
                maxLength={140}
                placeholder="Ex.: falta de paracetamol"
              />
            </label>
            <label>
              Funcionário solicitante
              <select name="employee" required>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridade
              <select name="priority">
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
              </select>
            </label>
            <label>
              Descrição
              <textarea
                name="description"
                rows="4"
                required
                maxLength={2000}
                placeholder="Informe o medicamento, a quantidade e o motivo da solicitação."
              />
            </label>
            <button className="mgr-primary">Criar chamado</button>
          </form>
        </Modal>
      )}
    </>
  );
}
