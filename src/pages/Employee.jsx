import PersonaAvatar from "../components/PersonaAvatar";
import { CartaoPessoa, GradePessoas, TeamTable } from "../components/Directory";
import { useEffect, useState } from "react";
import { Link, Outlet, useOutletContext } from "react-router-dom";
import ManagerSidebar from "../components/ManagerSidebar";
import PerfilProvider from "../components/perfil/PerfilProvider";
import { usePerfil } from "../components/perfil/perfilContext";
import { unit } from "./managerData";
import useApiList from "../hooks/useApiList";
import {
  API_URL,
  listarFarmacias,
  listarFuncionarios,
  listarPacientes,
  normalizeFuncionario,
  normalizePaciente,
} from "../services/api";
import { readEmployeeSession } from "../services/employeeSession";
import { SeletorPersona, ToastRegion } from "../components/Chamados";
import { SinoFuncionario } from "../components/NotificacoesEntregas";
import PreparosFarmacia from "../components/PreparosFarmacia";
import usePreparos from "../hooks/usePreparos";
import { FaixaEmAndamento } from "../components/Rastreio";
import { useFarmaciaDoFuncionario, useGerenteDaFarmacia, useToast } from "../hooks/useChamados";
import { useNotificacoesRastreio, usePedidosDoFuncionario } from "../hooks/useRastreio";
import { emAndamento } from "../services/rastreio";
import "../styles/manager.css";
import "../styles/managerRefresh.css";
import "../styles/employee.css";
import { SkeletonCartoes } from "../components/Skeleton";

// Visual preview only. Replace these fixtures with intermedi-back-end data
// when integrating authentication and server-side permissions.

const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();


export default function Employee() {
  const session = readEmployeeSession();

  // Rastreamento: cada etapa da entrega dos chamados que o funcionário abriu e a
  // chegada dos remédios que outras pessoas da unidade pediram (os pedidos da
  // unidade vêm pelo gerente dela; não há endpoint por farmácia)
  const funcionario = useFarmaciaDoFuncionario();

  // Sem sessão (login das personas ainda não existe), o funcionário é escolhido
  // no seletor do topo, como o gerente; o nome e a farmácia acompanham a escolha.
  const { items: farmacias } = useApiList(listarFarmacias);
  const nomeDaFarmacia = new Map(farmacias.map((f) => [String(f.idFarmacia ?? f.id), f.nomeFarmacia ?? f.nome]));
  const escolhido = funcionario.funcionarios.find((f) => f.id === funcionario.idFuncionario);
  const employeeName = session?.name || escolhido?.name || "Funcionário";
  const employeeUnit = session?.unitName || nomeDaFarmacia.get(String(funcionario.idFarmacia ?? "")) || unit;
  const opcoesFuncionario = funcionario.funcionarios
    .map((f) => ({ ...f, farmacia: nomeDaFarmacia.get(f.farmaciaId) ?? "" }))
    .sort((a, b) => a.farmacia.localeCompare(b.farmacia, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"))
    .map((f) => [f.id, f.farmacia ? `${f.name} · ${f.farmacia}` : f.name]);
  const idGerenteUnidade = useGerenteDaFarmacia(funcionario.idFarmacia);
  const [toast, notify] = useToast(8000);
  const fonteRastreio = usePedidosDoFuncionario(funcionario.idFuncionario, idGerenteUnidade);
  const rastreio = useNotificacoesRastreio(fonteRastreio.pedidos, {
    escopo: `funcionario:${funcionario.idFuncionario}:${funcionario.idFarmacia}`,
    pronto: fonteRastreio.carregado,
    onNovos: (texto) => notify(texto),
  });
  // Pedidos da rede que a farmácia dele vai enviar: aviso "Prepare…" + Começar
  const preparos = usePreparos(funcionario.idFuncionario, {
    onNovo: (p) => notify(`Novo pedido para preparar: ${p.mensagemPreparo}`),
  });


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
      const listResponse = await fetch(`${API_URL}/funcionario`, {
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

      const targetId = String(session?.id ?? funcionario.idFuncionario ?? "");
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
        `${API_URL}/funcionario/${encodeURIComponent(funcionarioId)}`,
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
        id: session?.id ?? funcionario.idFuncionario ?? "",
        name: session?.name ?? escolhido?.name ?? "Funcionário",
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
        `${API_URL}/funcionario/${encodeURIComponent(profile.id)}`,
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
          {!funcionario.temSessao && opcoesFuncionario.length > 0 && (
            <SeletorPersona
              label="Funcionário"
              value={funcionario.idFuncionario ?? ""}
              onChange={funcionario.escolher}
              options={opcoesFuncionario}
            />
          )}
          <SinoFuncionario rastreio={rastreio} fonte={fonteRastreio} />
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
        <PerfilProvider plataforma="funcionario" idFarmacia={funcionario.idFarmacia}>
          <main id="conteudo" tabIndex={-1} className="mgr-main directory-layout">
            <PreparosFarmacia preparos={preparos} idFuncionario={funcionario.idFuncionario} onAviso={notify} />
            <Outlet
              context={{
                chamadosDoFuncionario: fonteRastreio.chamados,
                idFarmacia: funcionario.idFarmacia,
                // visão geral
                nomeFuncionario: employeeName,
                unidade: employeeUnit,
              }}
            />
          </main>
        </PerfilProvider>
        <footer className="mgr-footer">
          Intermedi <span>Conectando farmácias. Aproximando o cuidado.</span>
        </footer>
      </div>
      <ToastRegion message={toast} />

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

// O total aparece no título da lista e o resultado da busca no rodapé dela
function PageHeader({ title, description }) {
  return (
    <header className="mgr-page-head">
      <div><h1>{title}</h1><p>{description}</p></div>
    </header>
  );
}

// Chamados do funcionário ainda em processo (aguardando gerente, fornecedor ou a caminho)
function emProcesso(chamados = []) {
  return chamados
    .filter((c) => c.status === "pendente" || c.status === "em_andamento")
    .map((c) => ({ chamado: c, pedidos: (c.pedidos ?? []).filter(emAndamento) }));
}

export function EmployeePatients() {
  const { abrirPerfil } = usePerfil();
  const { chamadosDoFuncionario } = useOutletContext() ?? {};
  const [search, setSearch] = useState("");
  const { items: patients, loading, error } = useApiList(listarPacientes, normalizePaciente);

  const filtered = patients.filter((patient) =>
    normalize(`${patient.name} ${patient.email} ${patient.id}`).includes(
      normalize(search.trim()),
    ),
  );

  return (
    <>
      <PageHeader
        title="Pacientes"
        description="Consulte contato e histórico dos pacientes cadastrados."
      />
      <FaixaEmAndamento
        chamados={emProcesso(chamadosDoFuncionario)}
        onAbrirChamado={(c, el) => abrirPerfil("chamado", c.idChamado, el)}
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
        <GradePessoas rotulo="Pacientes">
          {filtered.map((patient) => (
            <li key={patient.id}>
              <CartaoPessoa
                role="paciente"
                nome={patient.name}
                foto={patient.photo}
                papel={`Paciente · código ${String(patient.id).toUpperCase()}`}
                linhas={[
                  ["mail", patient.email],
                  ["phone", patient.phone],
                  ["map", [patient.city, patient.state].filter(Boolean).join(" / ")],
                ]}
                onAbrir={(el) => abrirPerfil("paciente", patient.id, el)}
              />
            </li>
          ))}
        </GradePessoas>
        {!loading && !error && !filtered.length && (
          <p className="mgr-empty">
            Nenhum paciente encontrado. Tente outro nome ou código.
          </p>
        )}
        {loading && <SkeletonCartoes rotulo="Carregando pacientes…" />}
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
  const { abrirPerfil } = usePerfil();
  const [search, setSearch] = useState("");
  const [shift, setShift] = useState("");
  const { items: allEmployees, loading, error } = useApiList(listarFuncionarios, normalizeFuncionario);
  const session = readEmployeeSession();
  // farmácia da sessão ou, sem sessão, a do funcionário escolhido no topo
  const { idFarmacia } = useOutletContext() ?? {};
  const targetFarmaciaId = String(session?.farmaciasId ?? session?.farmaciaId ?? idFarmacia ?? "");
  const sameUnit = targetFarmaciaId
    ? allEmployees.filter((item) => item.farmaciaId === targetFarmaciaId)
    : [];
  const employees = sameUnit.length ? sameUnit : allEmployees;

  const filtered = employees.filter((employee) =>
    (!shift || employee.shift === shift) && normalize(`${employee.name} ${employee.role} ${employee.email}`).includes(
      normalize(search.trim()),
    ),
  );

  return (
    <>
      <PageHeader
        title="Funcionários"
        description="Equipe da sua unidade, com cargo, turno e contato."
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
        <TeamTable employees={filtered} onAbrir={(employee, el) => abrirPerfil("funcionario", employee.id, el)} />
        {!loading && !error && !filtered.length && (
          <p className="mgr-empty">
            Nenhum funcionário encontrado. Tente outro nome ou cargo.
          </p>
        )}
        {loading && <SkeletonCartoes rotulo="Carregando funcionários…" />}
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

