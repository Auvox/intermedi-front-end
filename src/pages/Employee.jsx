import PersonaAvatar from "../components/PersonaAvatar";
import { DirectoryStats, PersonCell, TeamTable } from "../components/Directory";
import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import ManagerSidebar from "../components/ManagerSidebar";
import { unit } from "./managerData";
import "../styles/manager.css";
import "../styles/managerRefresh.css";
import "../styles/employee.css";

// Visual preview only. Replace these fixtures with intermedi-back-end data
// when integrating authentication and server-side permissions.

const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();


function readEmployeeSession() {
  try {
    const raw = sessionStorage.getItem("intermediEmployeeSession");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Employee() {
  const session = readEmployeeSession();
  const employeeName = session?.name || "Funcionário Local";
  const employeeUnit = session?.unitName || unit;


  const [profileOpen, setProfileOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editingField, setEditingField] = useState(null);

  async function loadEmployeeProfile() {
    setLoadingProfile(true);
    setProfileError("");

    try {
      const listResponse = await fetch("http://localhost:3000/funcionario", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const listPayload = await listResponse.json().catch(() => ({}));

      if (!listResponse.ok) {
        throw new Error(
          listPayload.message ||
            listPayload.error ||
            "Não foi possível buscar os funcionários.",
        );
      }

      const rawList = Array.isArray(listPayload)
        ? listPayload
        : Array.isArray(listPayload?.funcionario)
          ? listPayload.funcionario
          : Array.isArray(listPayload?.funcionarios)
            ? listPayload.funcionarios
            : [];

      const targetId = String(session?.id ?? "");
      const raw =
        rawList.find((item) => {
          const id = String(item.idFuncionario ?? item.id ?? "");
          return id === targetId;
        }) ??
        rawList.find((item) => {
          const storedCpf = String(item.cpfFuncionario ?? item.cpf ?? "")
            .trim()
            .replace(/[^\d]/g, "");
          return (
            storedCpf ===
            String(session?.cpf ?? "")
              .trim()
              .replace(/[^\d]/g, "")
          );
        }) ??
        rawList[0] ??
        {};

      const funcionarioId = raw.idFuncionario ?? raw.id ?? session?.id;
      if (!funcionarioId) {
        throw new Error("Funcionário não encontrado.");
      }

      const detailResponse = await fetch(
        `http://localhost:3000/funcionario/${encodeURIComponent(funcionarioId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      const detailPayload = await detailResponse.json().catch(() => ({}));

      if (!detailResponse.ok) {
        throw new Error(
          detailPayload.message ||
            detailPayload.error ||
            detailPayload.error?.message ||
            "Não foi possível consultar o funcionário.",
        );
      }

      const detail = Array.isArray(detailPayload)
        ? detailPayload[0]
        : (detailPayload?.resultado ??
          detailPayload?.funcionario ??
          detailPayload?.funcionarios ??
          detailPayload);

      const profileData = {
        id: funcionarioId,
        name:
          detail.nomeFuncionario ??
          raw.nomeFuncionario ??
          session?.name ??
          "Funcionário",
        email:
          detail.emailFuncionario ??
          raw.emailFuncionario ??
          session?.email ??
          "",
        cpf: detail.cpfFuncionario ?? raw.cpfFuncionario ?? session?.cpf ?? "",
        matricula:
          detail.matriculaFuncionario ??
          raw.matriculaFuncionario ??
          session?.matricula ??
          "",
        role: detail.cargoFuncionario ?? raw.cargoFuncionario ?? "Funcionário",
        shift: detail.turnoFuncionario ?? raw.turnoFuncionario ?? "",
        phone: detail.telFuncionario ?? raw.telFuncionario ?? "",
        farmaciaId: String(
          detail.fkIdFarmacia ??
            raw.fkIdFarmacia ??
            session?.farmaciasId ??
            session?.farmaciaId ??
            "",
        ),
      };

      setProfile(profileData);
      setDraft(profileData);
    } catch (error) {
      const fallback = {
        id: session?.id ?? "",
        name: session?.name ?? "Funcionário",
        email: session?.email ?? "",
        cpf: session?.cpf ?? "",
        matricula: session?.matricula ?? "",
        role: "Funcionário",
        shift: "",
        phone: "",
        farmaciaId: session?.farmaciasId ?? session?.farmaciaId ?? "",
      };
      setProfile(fallback);
      setDraft(fallback);
      setProfileError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o perfil do funcionário.",
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  async function openEmployeeProfile() {
    await loadEmployeeProfile();
    setProfileOpen(true);
  }

  async function saveEmployeeProfile(event) {
    event?.preventDefault?.();
    if (!draft || !profile) return;

    const payload = {
      nomeFuncionario: draft.name,
      emailFuncionario: draft.email,
      cpfFuncionario: draft.cpf,
      matriculaFuncionario: draft.matricula,
      cargoFuncionario: draft.role,
      turnoFuncionario: draft.shift,
      telFuncionario: draft.phone,
      fkIdFarmacia:
        draft.farmaciaId || session?.farmaciasId || session?.farmaciaId || "",
    };

    try {
      const response = await fetch(
        `http://localhost:3000/funcionario/${encodeURIComponent(profile.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error?.message ||
            result.error?.errstr ||
            "Não foi possível salvar o perfil do funcionário.",
        );
      }

      const nextSession = {
        ...(session || {}),
        id: profile.id,
        name: draft.name,
        cpf: draft.cpf,
        matricula: draft.matricula,
        email: draft.email,
        role: "funcionario",
        farmaciasId: String(draft.farmaciaId || session?.farmaciasId || ""),
        unitName: session?.unitName || employeeUnit,
      };
      sessionStorage.setItem(
        "intermediEmployeeSession",
        JSON.stringify(nextSession),
      );

      setProfile({ ...draft, id: profile.id });
      setDraft({ ...draft, id: profile.id });
      setEditingField(null);
      setProfileOpen(false);
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o perfil do funcionário.",
      );
    }
  }

  function cancelEmployeeProfile() {
    setDraft(profile);
    setEditingField(null);
    setProfileError("");
  }

  useEffect(() => {
    document.title = "Área do funcionário | Intermedi";
    return () => {
      document.title = "Intermedi";
    };
  }, []);

  return (
    <div className="mgr-shell emp-shell">
      <ManagerSidebar employee unitName={employeeUnit} />
      <div className="mgr-workspace">
        <div className="mgr-topbar">
          <span>
            <span className="mgr-topbar-unit-prefix">Olá, {employeeName}</span>{" "}
            <span className="mgr-topbar-divider">/</span>{" "}
            <strong>{employeeUnit}</strong>
          </span>
          <div className="mgr-account emp-account">
            <button
              type="button"
              className="mgr-account-button"
              aria-label="Abrir perfil do funcionário"
              onClick={openEmployeeProfile}
            >
            <PersonaAvatar className="mgr-account-avatar" role="funcionario" photo={session?.fotoPerfilFuncionario ?? session?.photo} />
            <span className="mgr-account-person">
              <strong>{employeeName}</strong>
              <small>Funcionário da unidade · {employeeUnit}</small>
            </span>
            </button>
            <Link className="account-action account-exit" to="/login?perfil=funcionario">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" /></svg>
              Sair
            </Link>
          </div>
        </div>
        <main className="mgr-main directory-layout">
          <Outlet />
        </main>
        <footer className="mgr-footer">
          Intermedi <span>Conectando farmácias. Aproximando o cuidado.</span>
        </footer>
      </div>

      {profileOpen && (
        <dialog
          open
          className="mgr-modal mgr-profile-modal"
          aria-label="Perfil do funcionário"
        >
          <div className="mgr-modal-head">
            <h2>Perfil do funcionário</h2>
            <button
              type="button"
              aria-label="Fechar perfil"
              onClick={() => setProfileOpen(false)}
            >
              ×
            </button>
          </div>
          {loadingProfile && <p className="mgr-empty">Carregando perfil…</p>}
          {profileError && (
            <p className="mgr-empty" role="alert">
              {profileError}
            </p>
          )}
          {profile && draft && (
            <form
              className="mgr-form mgr-profile-form"
              onSubmit={saveEmployeeProfile}
            >
              <div className="mgr-profile-fields">
                {[
                  ["name", "Nome completo"],
                  ["email", "E-mail"],
                  ["cpf", "CPF"],
                  ["matricula", "Matrícula"],
                  ["role", "Cargo"],
                  ["shift", "Turno"],
                  ["phone", "Telefone"],
                ].map(([key, label]) => (
                  <div className="mgr-profile-row" key={key}>
                    <span className="mgr-profile-label">{label}</span>
                    <div className="mgr-profile-value">
                      {editingField === key ? (
                        <input
                          className="mgr-profile-input"
                          value={draft[key] ?? ""}
                          onChange={({ target }) =>
                            setDraft({ ...draft, [key]: target.value })
                          }
                        />
                      ) : (
                        <span className="mgr-profile-readonly">
                          {draft[key] || "Não informado"}
                        </span>
                      )}
                      <button
                        type="button"
                        className="mgr-profile-edit"
                        aria-label={`Editar ${label}`}
                        onClick={() => setEditingField(key)}
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mgr-modal-actions">
                <button
                  className="mgr-secondary"
                  type="button"
                  onClick={() => {
                    cancelEmployeeProfile();
                    setProfileOpen(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="mgr-primary"
                  type="button"
                  onClick={saveEmployeeProfile}
                >
                  Salvar
                </button>
              </div>
            </form>
          )}
        </dialog>
      )}
    </div>
  );
}

function PageHeader({ title, description, count, label, icon, results }) {
  return <>
    <header className="mgr-page-head mgr-page-head-featured"><div>
      <p className="mgr-eyebrow">ESPAÇO DO FUNCIONÁRIO</p><h1>{title}</h1><p>{description}</p>
    </div></header>
    <DirectoryStats items={[[label, count, icon], ["Resultados da busca", results, "check"]]} />
  </>;
}

export function EmployeePatients() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("http://localhost:3000/paciente", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload.message ||
              payload.error ||
              "Não foi possível consultar os pacientes.",
          );
        }

        const rawList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.paciente)
            ? payload.paciente
            : Array.isArray(payload?.pacientes)
              ? payload.pacientes
              : [];

        const mapped = rawList.map((item) => ({
          id: String(item.idPaciente ?? item.id ?? ""),
          name: item.nomePaciente ?? item.name ?? "Paciente",
          photo: item.fotoPerfilPaciente ?? item.photo,
          cpf: item.cpfPaciente ?? item.cpf ?? "",
          email: item.emailPaciente ?? item.email ?? "",
          phone: item.telPaciente ?? item.phone ?? "",
          address: item.ruaPaciente ?? item.endereco ?? "",
          city: item.cidadePaciente ?? item.cidade ?? "",
          state: item.estadoPaciente ?? item.estado ?? "",
          createdAt: item.createdAtPaciente ?? item.createdAt ?? "",
        }));

        setPatients(mapped);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar pacientes.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, []);

  const filtered = patients.filter((patient) =>
    normalize(`${patient.name} ${patient.email} ${patient.id}`).includes(
      normalize(search.trim()),
    ),
  );

  return (
    <>
      <PageHeader
        title="Pacientes"
        description="Encontre os pacientes da sua unidade em um só lugar."
        count={patients.length}
        results={filtered.length}
        label="Total de pacientes"
        icon="heart"
      />
      <section className="mgr-panel" aria-labelledby="emp-patients-title">
        <div className="mgr-toolbar">
          <h2 id="emp-patients-title">
            Pacientes <span className="mgr-badge">{patients.length}</span>
          </h2>
          <input
            type="search"
            aria-label="Buscar paciente por nome ou código"
            placeholder="Buscar nome ou código…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="mgr-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Paciente</th>
                <th scope="col">Código</th>
                <th scope="col">Unidade</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <PersonCell name={patient.name} detail={patient.email} role="paciente" photo={patient.photo} />
                  </td>
                  <td>{String(patient.id).toUpperCase()}</td>
                  <td>{readEmployeeSession()?.unitName || unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !error && !filtered.length && (
          <p className="mgr-empty">
            Nenhum paciente encontrado. Tente outro nome ou código.
          </p>
        )}
        {loading && <p className="mgr-empty">Carregando pacientes…</p>}
        {error && (
          <p className="mgr-empty" role="alert">
            {error}
          </p>
        )}
        <p className="mgr-table-note" role="status">
          {filtered.length} de {patients.length} pacientes · Somente consulta
        </p>
      </section>
    </>
  );
}

export function EmployeeTeam() {
  const [search, setSearch] = useState("");
  const [shift, setShift] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEmployees() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("http://localhost:3000/funcionario", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload.message ||
              payload.error ||
              "Não foi possível consultar os funcionários.",
          );
        }

        const rawList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.funcionario)
            ? payload.funcionario
            : Array.isArray(payload?.funcionarios)
              ? payload.funcionarios
              : [];

        const session = readEmployeeSession();
        const targetFarmaciaId = String(
          session?.farmaciasId ?? session?.farmaciaId ?? "",
        );

        const mapped = rawList.map((item) => ({
          id: String(item.idFuncionario ?? item.id ?? ""),
          name: item.nomeFuncionario ?? item.name ?? "Funcionário",
          photo: item.fotoPerfilFuncionario ?? item.photo,
          role: item.cargoFuncionario ?? item.role ?? "Funcionário",
          shift: item.turnoFuncionario ?? item.shift ?? "",
          email: item.emailFuncionario ?? item.email ?? "",
          phone: item.telFuncionario ?? item.phone ?? "",
          matricula: item.matriculaFuncionario ?? item.matricula ?? "",
          farmaciaId: String(
            item.fkIdFarmacia ?? item.idFarmacia ?? item.farmaciaId ?? "",
          ),
        }));

        const sameUnit = mapped.filter((item) => {
          return item.farmaciaId && targetFarmaciaId
            ? item.farmaciaId === targetFarmaciaId
            : true;
        });

        setEmployees(sameUnit.length ? sameUnit : mapped);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar funcionários.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadEmployees();
  }, []);

  const filtered = employees.filter((employee) =>
    (!shift || employee.shift === shift) && normalize(`${employee.name} ${employee.role} ${employee.email}`).includes(
      normalize(search.trim()),
    ),
  );

  return (
    <>
      <PageHeader
        title="Funcionários"
        description="Conheça os profissionais que compartilham o cuidado com você."
        count={employees.length}
        results={filtered.length}
        label="Profissionais na unidade"
        icon="people"
      />
      <section className="mgr-panel" aria-labelledby="emp-team-title">
        <div className="mgr-toolbar">
          <h2 id="emp-team-title">
            Funcionários <span className="mgr-badge">{employees.length}</span>
          </h2>
          <input
            type="search"
            aria-label="Buscar funcionário por nome ou cargo"
            placeholder="Buscar nome ou cargo…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select aria-label="Filtrar funcionários por turno" value={shift} onChange={event => setShift(event.target.value)}>
            <option value="">Todos os turnos</option>
            {[...new Set(employees.map(employee => employee.shift).filter(Boolean))].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <TeamTable employees={filtered} />
        {!loading && !error && !filtered.length && (
          <p className="mgr-empty">
            Nenhum funcionário encontrado. Tente outro nome ou cargo.
          </p>
        )}
        {loading && <p className="mgr-empty">Carregando funcionários…</p>}
        {error && (
          <p className="mgr-empty" role="alert">
            {error}
          </p>
        )}
        <p className="mgr-table-note" role="status">
          {filtered.length} de {employees.length} funcionários · Somente
          consulta
        </p>
      </section>
    </>
  );
}

