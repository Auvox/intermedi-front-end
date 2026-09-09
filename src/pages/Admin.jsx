import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useOutletContext } from "react-router-dom";
import ManagerSidebar from "../components/ManagerSidebar";
import { initialData, unit, formatDate } from "./managerData";
import "../styles/manager.css";
import "../styles/managerRefresh.css";
import "../styles/admin.css";

// UI fixtures only: no API, authentication, persistence or server permissions.
const demoData = {
  gerentes: [
    {
      id: "g1",
      name: "Renata Lima",
      email: "renata@example.com",
      unit,
      status: "Ativo",
    },
    {
      id: "g2",
      name: "Paulo Martins",
      email: "paulo@example.com",
      unit: "Farmácia Jardim",
      status: "Ativo",
    },
  ],
  funcionarios: initialData.employees.map((person) => ({
    ...person,
    unit,
    status: "Ativo",
  })),
  pacientes: initialData.patients.map((person) => ({
    ...person,
    unit,
    status: "Ativo",
  })),
  chamados: initialData.tickets.map((ticket) => ({
    ...ticket,
    name: ticket.title,
  })),
};
const sections = {
  gerentes: {
    label: "Gerentes",
    title: "A gestão começa com pessoas.",
    description:
      "Consulte os gerentes e organize os responsáveis pelas unidades.",
    action: "Excluir gerente",
    result: "excluído",
  },
  funcionarios: {
    label: "Funcionários",
    title: "Uma rede de profissionais.",
    description: "Consulte os funcionários e acompanhe o acesso à plataforma.",
    action: "Bloquear funcionário",
    result: "bloqueado",
  },
  pacientes: {
    label: "Pacientes",
    title: "Pessoas no centro do cuidado.",
    description: "Consulte os pacientes e acompanhe o acesso à plataforma.",
    action: "Bloquear paciente",
    result: "bloqueado",
  },
  chamados: {
    label: "Chamados",
    title: "Acompanhe as conversas da rede.",
    description: "Consulte as solicitações das unidades e modere os chamados.",
    action: "Banir chamado",
    result: "banido",
  },
};
const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function Admin() {
  const [data, setData] = useState(demoData);
  useEffect(() => {
    document.title = "Área do admin | Intermedi";
    return () => {
      document.title = "Intermedi";
    };
  }, []);
  return (
    <div className="mgr-shell adm-shell">
      <ManagerSidebar admin unitName="Rede Intermedi" />
      <div className="mgr-workspace">
        <div className="mgr-topbar">
          <span>
            <span className="mgr-topbar-unit-prefix">
              Painel de administração
            </span>{" "}
            <span className="mgr-topbar-divider">/</span>{" "}
            <strong>Rede Intermedi</strong>
          </span>
          <div className="mgr-account adm-account">
            <span className="mgr-account-avatar" aria-hidden="true">
              AL
            </span>
            <span className="mgr-account-person">
              <strong>Admin Local</strong>
              <small>Administrador da plataforma</small>
            </span>
            <Link className="mgr-text-button" to="/login?perfil=admin">
              Sair
            </Link>
          </div>
        </div>
        <main className="mgr-main">
          <Outlet context={{ data, setData }} />
        </main>
        <footer className="mgr-footer">
          Intermedi <span>Conectando farmácias. Aproximando o cuidado.</span>
        </footer>
      </div>
    </div>
  );
}

function Dialog({ title, onClose, children }) {
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
      ref={ref}
      className="mgr-modal adm-dialog"
      aria-label={title}
      onCancel={onClose}
    >
      <div className="mgr-modal-head">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar janela">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function AdminDirectory({ section }) {
  const { data, setData } = useOutletContext();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const config = sections[section];
  const records = data[section];
  const tickets = section === "chamados";
  const managers = section === "gerentes";
  const filtered = records.filter(
    (record) =>
      normalize(`${record.name} ${record.unit} ${record.email || ""}`).includes(
        normalize(search.trim()),
      ) &&
      (!status || record.status === status),
  );
  const restricted = records.filter((record) =>
    ["Bloqueado", "Banido"].includes(record.status),
  ).length;
  function confirmAction() {
    const record = modal.record;
    setData((current) => ({
      ...current,
      [section]: managers
        ? current[section].filter((item) => item.id !== record.id)
        : current[section].map((item) =>
            item.id === record.id
              ? { ...item, status: tickets ? "Banido" : "Bloqueado" }
              : item,
          ),
    }));
    setNotice(`${record.name}: ${config.result} nesta demonstração.`);
    setModal(null);
  }
  function register(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get("name").trim();
    const email = form.get("email").trim();
    const unitName = form.get("unit").trim();
    const employeeId = form.get("idFuncionario");
    const confirmation =
      event.currentTarget.elements.namedItem("confirmPassword");
    confirmation.setCustomValidity(
      form.get("senhaGerente") === form.get("confirmPassword")
        ? ""
        : "As senhas precisam ser iguais.",
    );
    if (
      !event.currentTarget.reportValidity() ||
      !name ||
      !email ||
      !unitName ||
      !employeeId
    )
      return;
    // Password is only checked in the form; never stored in demo records.
    setData((current) => ({
      ...current,
      gerentes: [
        ...current.gerentes,
        {
          id: crypto.randomUUID(),
          name,
          email,
          unit: unitName,
          employeeId,
          createdAt: new Date().toISOString(),
          status: "Ativo",
        },
      ],
    }));
    setNotice(`${name}: cadastrado nesta demonstração.`);
    setModal(null);
  }
  return (
    <>
      <header className="mgr-page-head mgr-page-head-featured">
        <div>
          <p className="mgr-eyebrow">ADMINISTRAÇÃO DA PLATAFORMA</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {managers && (
          <button
            className="mgr-primary"
            onClick={() => setModal({ type: "register" })}
          >
            + Cadastrar gerente
          </button>
        )}
      </header>
      <div className="adm-overview">
        <span>
          <strong>{records.length}</strong> {config.label.toLowerCase()} na rede
        </span>
        <span>
          {managers ? (
            "Gestão de responsáveis"
          ) : (
            <>
              <strong>{restricted}</strong> {tickets ? "banidos" : "bloqueados"}
            </>
          )}
        </span>
      </div>
      {notice && (
        <p className="adm-notice" role="status">
          {notice}
        </p>
      )}
      <section className="mgr-panel" aria-labelledby="adm-list-title">
        <div className="mgr-toolbar">
          <h2 id="adm-list-title">
            {config.label} <span className="mgr-badge">{records.length}</span>
          </h2>
          <input
            type="search"
            aria-label={`Buscar ${config.label.toLowerCase()}`}
            placeholder={
              tickets ? "Buscar chamado ou unidade…" : "Buscar nome ou unidade…"
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Filtrar por situação"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todas as situações</option>
            {(tickets
              ? ["Pendente", "Em andamento", "Resolvido", "Banido"]
              : managers
                ? ["Ativo"]
                : ["Ativo", "Bloqueado"]
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="mgr-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{tickets ? "Chamado" : "Nome"}</th>
                <th scope="col">Unidade</th>
                <th scope="col">Situação</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.name}</strong>
                    <small>
                      {tickets
                        ? formatDate(record.date)
                        : record.email || `Código: ${record.id.toUpperCase()}`}
                    </small>
                  </td>
                  <td>{record.unit}</td>
                  <td>
                    <span
                      className={`mgr-badge ${["Bloqueado", "Banido"].includes(record.status) ? "red" : record.status === "Pendente" ? "yellow" : "green"}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td>
                    <div className="adm-actions">
                      <button
                        className="mgr-text-button"
                        aria-label={`Consultar ${record.name}`}
                        onClick={() => setModal({ type: "details", record })}
                      >
                        Consultar
                      </button>
                      <button
                        className="adm-danger"
                        disabled={["Bloqueado", "Banido"].includes(
                          record.status,
                        )}
                        aria-label={`${config.action}: ${record.name}`}
                        onClick={() => setModal({ type: "confirm", record })}
                      >
                        {managers ? "Excluir" : tickets ? "Banir" : "Bloquear"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="mgr-empty">
            Nenhum registro encontrado. Tente outra busca ou situação.
          </p>
        )}
        <p className="mgr-table-note" role="status">
          {filtered.length} de {records.length} registros
        </p>
      </section>
      {modal?.type === "register" && (
        <Dialog title="Cadastrar gerente" onClose={() => setModal(null)}>
          <form className="mgr-form" onSubmit={register}>
            <label>
              Nome completo
              <input
                name="name"
                required
                minLength={3}
                maxLength={120}
                autoComplete="name"
                placeholder="Nome do gerente"
              />
            </label>
            <label>
              E-mail
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="gerente@exemplo.com"
              />
            </label>

            <div className="mgr-form-row">
              <label>
                CPF
                <input
                  name="cpfGerente"
                  type="text"
                  required
                  // autoComplete="new-password"
                  placeholder="XXX.XXX.XXX-XX"
                  onInput={(event) =>
                    event.currentTarget.form.elements
                      .namedItem("confirmPassword")
                      .setCustomValidity("")
                  }
                />
              </label>
              <label>
                CRF (Conselho Regional de Farmácia)
                <input
                  name="crfGerente"
                  type="text"
                  required
                  // autoComplete="new-password"
                  placeholder="Ex.: 123456"
                  onInput={(event) => event.currentTarget.setCustomValidity("")}
                />
              </label>
            </div>

            <div className="mgr-form-row">
              <label>
                Senha
                <input
                  name="senhaGerente"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Crie uma senha"
                  onInput={(event) =>
                    event.currentTarget.form.elements
                      .namedItem("confirmPassword")
                      .setCustomValidity("")
                  }
                />
              </label>
              <label>
                Confirmar senha
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  onInput={(event) => event.currentTarget.setCustomValidity("")}
                />
              </label>
            </div>
            {/* <label>
              Funcionário vinculado
              <select name="idFuncionario" required defaultValue="">
                <option value="" disabled>
                  Selecione um funcionário
                </option>
                {data.funcionarios.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} · {employee.id.toUpperCase()}
                  </option>
                ))}
              </select>
            </label> */}
            {/* <label>
              Unidade
              <input
                name="unit"
                required
                maxLength={150}
                placeholder="Nome da farmácia"
              />
            </label> */}

            {/* <label>
                ID do gerente
                <input value="Gerado automaticamente" readOnly />
              </label> */}
            <label>
              CEP
              <input
                name="cepGerente"
                value="Preenchida no cadastro"
                readOnly
              />
            </label>
            <label>
              Endereço
              <input
                name="logradouroGerente"
                value="Preenchida no cadastro"
                readOnly
              />
            </label>

            <div className="mgr-form-row">
              <label>
                Nº
                <input
                  name="numeroGerente"
                  type="text"
                  required
                  // autoComplete="new-password"
                  placeholder="Ex. 45"
                  onInput={(event) =>
                    event.currentTarget.form.elements
                      .namedItem("confirmPassword")
                      .setCustomValidity("")
                  }
                />
              </label>
              <label>
                Complemento (opcional)
                <input
                  name="complementoGerente"
                  type="text"
                  required
                  // autoComplete="new-password"
                  placeholder="Ex. Apartamento, casa, andar, etc."
                  onInput={(event) =>
                    event.currentTarget.form.elements
                      .namedItem("confirmPassword")
                      .setCustomValidity("")
                  }
                />
              </label>
            </div>

            <div className="mgr-form-row">
              <label>
                Bairro
                <input
                  name="bairroGerente"
                  type="text"
                  required
                  // autoComplete="new-password"
                  placeholder="Ex. São Paulo"
                  onInput={(event) =>
                    event.currentTarget.form.elements
                      .namedItem("confirmPassword")
                      .setCustomValidity("")
                  }
                />
              </label>
              <label>
                Cidade
                <input
                  name="cidadeGerente"
                  type="text"
                  required
                  // autoComplete="new-password"
                  placeholder="Ex. SP"
                  onInput={(event) =>
                    event.currentTarget.form.elements
                      .namedItem("confirmPassword")
                      .setCustomValidity("")
                  }
                />
              </label>
            </div>

            <p className="adm-hint">
              O cadastro é apenas demonstrativo e não cria uma conta real.
            </p>
            <div className="mgr-modal-actions">
              <button
                className="mgr-secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="mgr-primary" type="submit">
                Cadastrar gerente
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {modal?.type === "details" && (
        <Dialog title={modal.record.name} onClose={() => setModal(null)}>
          <dl className="adm-details">
            <div>
              <dt>Código</dt>
              <dd>{modal.record.id}</dd>
            </div>
            <div>
              <dt>Unidade</dt>
              <dd>{modal.record.unit}</dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd>{modal.record.status}</dd>
            </div>
            {modal.record.email && (
              <div>
                <dt>E-mail</dt>
                <dd>{modal.record.email}</dd>
              </div>
            )}
            {modal.record.role && (
              <div>
                <dt>Cargo</dt>
                <dd>{modal.record.role}</dd>
              </div>
            )}
            {modal.record.shift && (
              <div>
                <dt>Turno</dt>
                <dd>{modal.record.shift}</dd>
              </div>
            )}
            {managers && (
              <>
                <div>
                  <dt>Funcionário vinculado</dt>
                  <dd>
                    {data.funcionarios.find(
                      (employee) => employee.id === modal.record.employeeId,
                    )?.name || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt>Data de criação</dt>
                  <dd>
                    {modal.record.createdAt
                      ? new Date(modal.record.createdAt).toLocaleString("pt-BR")
                      : "Não informada"}
                  </dd>
                </div>
              </>
            )}
            {tickets && (
              <>
                <div>
                  <dt>Data</dt>
                  <dd>{formatDate(modal.record.date)}</dd>
                </div>
                <div>
                  <dt>Prioridade</dt>
                  <dd>{modal.record.priority}</dd>
                </div>
                <div>
                  <dt>Descrição</dt>
                  <dd>{modal.record.description}</dd>
                </div>
              </>
            )}
          </dl>
          <button className="mgr-secondary" onClick={() => setModal(null)}>
            Fechar
          </button>
        </Dialog>
      )}
      {modal?.type === "confirm" && (
        <Dialog title={config.action} onClose={() => setModal(null)}>
          <p>
            Deseja {managers ? "excluir" : tickets ? "banir" : "bloquear"}{" "}
            <strong>{modal.record.name}</strong>?
          </p>
          <p className="adm-hint">
            Esta ação altera apenas os dados da demonstração. Ao recarregar a
            página, os dados iniciais são restaurados.
          </p>
          <div className="mgr-modal-actions">
            <button
              className="mgr-secondary"
              onClick={() => setModal(null)}
              autoFocus
            >
              Cancelar
            </button>
            <button className="adm-danger adm-confirm" onClick={confirmAction}>
              {config.action}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
