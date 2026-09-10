import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useOutletContext } from "react-router-dom";
import ManagerSidebar from "../components/ManagerSidebar";
import { normalizeGerentes } from "../services/gerenteMapper";
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
  farmacias: [
    {
      id: "f1",
      name: "Farmácia Central",
      email: "central@intermedi.com",
      unit: "Farmácia Central",
      status: "Ativo",
    },
    {
      id: "f2",
      name: "Farmácia Jardim",
      email: "jardim@intermedi.com",
      unit: "Farmácia Jardim",
      status: "Ativo",
    },
    {
      id: "f3",
      name: "Farmácia Vila Verde",
      email: "vilaverde@intermedi.com",
      unit: "Farmácia Vila Verde",
      status: "Ativo",
    },
  ],
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
  farmacias: {
    label: "Farmácias",
    title: "Uma rede de farmácias.",
    description: "Consulte as farmácias e acompanhe as unidades da plataforma.",
    action: "Excluir farmácia",
    result: "excluída",
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

const normalizeFarmacias = (payload = []) =>
  payload.map((farmacia, index) => {
    const id = farmacia.idFarmacia ?? farmacia.id ?? String(index + 1);
    const name =
      farmacia.nomeFarmacia ??
      farmacia.name ??
      farmacia.nome ??
      "Farmácia sem nome";
    const email = farmacia.emailFarmacia ?? farmacia.email ?? "";
    const phone = farmacia.telFarmacia ?? farmacia.telefone ?? "";
    const cnes = farmacia.cnesFarmacia ?? farmacia.cnes ?? "";
    const managerId = farmacia.idGerente ?? farmacia.gerenteId ?? null;
    const unit =
      farmacia.cidadeFarmacia ??
      farmacia.enderecoFarmacia ??
      farmacia.bairroFarmacia ??
      farmacia.unidade ??
      farmacia.unit ??
      "Unidade não informada";

    return {
      id: String(id),
      name,
      email,
      phone,
      cnes,
      idGerente: managerId,
      unit,
      status: "Ativo",
    };
  });

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
  const pharmacies = section === "farmacias";

  useEffect(() => {
    if (section !== "gerentes" && section !== "farmacias") {
      return undefined;
    }

    let cancelled = false;

    async function loadGerentes() {
      try {
        const response = await fetch("http://localhost:3000/gerente", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Não foi possível buscar os gerentes.");
        }

        const payload = await response.json();
        const rawList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.gerente)
            ? payload.gerente
            : Array.isArray(payload?.gerentes)
              ? payload.gerentes
              : Array.isArray(payload?.data)
                ? payload.data
                : [];

        if (!cancelled) {
          setData((current) => ({
            ...current,
            gerentes: normalizeGerentes(rawList),
          }));
        }
      } catch (error) {
        console.error("Erro ao carregar gerentes:", error);
        if (!cancelled) {
          setNotice("Não foi possível buscar os gerentes do endpoint.");
        }
      }
    }

    loadGerentes();

    return () => {
      cancelled = true;
    };
  }, [section, setData]);

  useEffect(() => {
    if (section !== "farmacias") {
      return undefined;
    }

    let cancelled = false;

    async function loadFarmacias() {
      try {
        const response = await fetch("http://localhost:3000/farmacia", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Não foi possível buscar as farmácias.");
        }

        const payload = await response.json();
        const rawList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.farmacia)
            ? payload.farmacia
            : Array.isArray(payload?.farmacias)
              ? payload.farmacias
              : Array.isArray(payload?.data)
                ? payload.data
                : [];

        if (!cancelled) {
          setData((current) => ({
            ...current,
            farmacias: normalizeFarmacias(rawList),
          }));
        }
      } catch (error) {
        console.error("Erro ao carregar farmácias:", error);
        if (!cancelled) {
          setNotice("Não foi possível buscar as farmácias do endpoint.");
        }
      }
    }

    loadFarmacias();

    return () => {
      cancelled = true;
    };
  }, [section, setData]);

  const [dataGerente, setDataGerente] = useState({});

  const [nomeGerente, setNomeGerente] = useState("");
  const [emailGerente, setEmailGerente] = useState("");
  const [cpfGerente, setCpfGerente] = useState("");
  const [crfGerente, setCrfGerente] = useState("");
  const [senhaGerente, setSenhaGerente] = useState("");
  const [confirmarSenhaGerente, setConfirmarSenhaGerente] = useState("");
  const [cepGerente, setCepGerente] = useState("");
  const [enderecoGerente, setEnderecoGerente] = useState("");
  const [numeroGerente, setNumeroGerente] = useState("");
  const [complementoGerente, setComplementoGerente] = useState("");
  const [bairroGerente, setBairroGerente] = useState("");
  const [cidadeGerente, setCidadeGerente] = useState("");

  const [nomeFarmacia, setNomeFarmacia] = useState("");
  const [emailFarmacia, setEmailFarmacia] = useState("");
  const [telFarmacia, setTelFarmacia] = useState("");
  const [cnesFarmacia, setCnesFarmacia] = useState("");
  const [senhaFarmacia, setSenhaFarmacia] = useState("");
  const [cepFarmacia, setCepFarmacia] = useState("");
  const [enderecoFarmacia, setEnderecoFarmacia] = useState("");
  const [numeroFarmacia, setNumeroFarmacia] = useState("");
  const [complementoFarmacia, setComplementoFarmacia] = useState("");
  const [bairroFarmacia, setBairroFarmacia] = useState("");
  const [cidadeFarmacia, setCidadeFarmacia] = useState("");
  const [gerenteSearchFarmacia, setGerenteSearchFarmacia] = useState("");
  const [gerentesFarmacia, setGerentesFarmacia] = useState([]);
  const [showGerenteSuggestions, setShowGerenteSuggestions] = useState(false);

  const gerenteOptions = (data.gerentes || []).filter((gerente) =>
    normalize(`${gerente.name} ${gerente.email || ""}`).includes(
      normalize(gerenteSearchFarmacia.trim()),
    ),
  );

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
  async function confirmAction() {
    const record = modal.record;

    if (managers) {
      try {
        const response = await fetch(
          `http://localhost:3000/gerente/${encodeURIComponent(record.id)}`,
          {
            method: "DELETE",
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(
            errorPayload.message ||
              errorPayload.error ||
              "Erro ao excluir gerente",
          );
        }

        setData((current) => ({
          ...current,
          gerentes: current.gerentes.filter((item) => item.id !== record.id),
        }));

        setNotice(`${record.name}: excluído com sucesso no banco.`);
        setModal(null);
        return;
      } catch (error) {
        console.error("Erro ao excluir gerente:", error);
        setNotice(error.message || "Erro ao excluir gerente.");
        setModal(null);
        return;
      }
    }

    if (pharmacies) {
      try {
        const response = await fetch(
          `http://localhost:3000/farmacia/${encodeURIComponent(record.id)}`,
          {
            method: "DELETE",
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(
            errorPayload.message ||
              errorPayload.error ||
              "Erro ao excluir farmácia",
          );
        }

        setData((current) => ({
          ...current,
          farmacias: current.farmacias.filter((item) => item.id !== record.id),
        }));

        setNotice(`${record.name}: excluída com sucesso no banco.`);
        setModal(null);
        return;
      } catch (error) {
        console.error("Erro ao excluir farmácia:", error);
        setNotice(error.message || "Erro ao excluir farmácia.");
        setModal(null);
        return;
      }
    }

    setData((current) => ({
      ...current,
      [section]: current[section].map((item) =>
        item.id === record.id
          ? { ...item, status: tickets ? "Banido" : "Bloqueado" }
          : item,
      ),
    }));
    setNotice(`${record.name}: ${config.result} nesta demonstração.`);
    setModal(null);
  }
  async function register(event) {
    event.preventDefault();

    const gerente = {
      nomeGerente,
      emailGerente,
      cpfGerente,
      crfGerente,
      senhaGerente,
      cepGerente,
      enderecoGerente,
      numeroGerente,
      complementoGerente: complementoGerente || null,
      bairroGerente,
      cidadeGerente,
    };

    console.log("Dados enviados:", gerente);

    try {
      const response = await fetch("http://localhost:3000/gerente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gerente),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao cadastrar gerente");
      }

      console.log("Gerente cadastrado:", result);

      setNotice(`${nomeGerente}: cadastrado com sucesso!`);
      setModal(null);

      // Limpa os campos depois do cadastro
      setNomeGerente("");
      setEmailGerente("");
      setCpfGerente("");
      setCrfGerente("");
      setSenhaGerente("");
      setConfirmarSenhaGerente("");
      setCepGerente("");
      setEnderecoGerente("");
      setNumeroGerente("");
      setComplementoGerente("");
      setBairroGerente("");
      setCidadeGerente("");
    } catch (error) {
      console.error("Erro ao cadastrar gerente:", error);

      setNotice(`Erro ao cadastrar gerente: ${error.message}`);
    }
  }

  async function registerFarmacia(event) {
    event.preventDefault();

    const farmacia = {
      nomeFarmacia,
      emailFarmacia,
      telFarmacia,
      cnesFarmacia,
      idGerente: gerentesFarmacia[0] ? Number(gerentesFarmacia[0].id) : null,
      senhaFarmacia,
      cepFarmacia,
      enderecoFarmacia,
      numeroFarmacia,
      complementoFarmacia: complementoFarmacia || null,
      bairroFarmacia,
      cidadeFarmacia,
    };

    try {
      const response = await fetch("http://localhost:3000/farmacia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(farmacia),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage =
          result.message ||
          result.error?.message ||
          result.error?.errstr ||
          "Erro ao cadastrar farmácia";
        throw new Error(errorMessage);
      }

      const nextFarmacia = {
        id: String(result?.farmacia?.id ?? Date.now()),
        name: nomeFarmacia,
        email: emailFarmacia,
        unit: cidadeFarmacia || enderecoFarmacia || nomeFarmacia,
        status: "Ativo",
      };

      setData((current) => ({
        ...current,
        farmacias: [...current.farmacias, nextFarmacia],
      }));
      setNotice(`${nomeFarmacia}: cadastrada com sucesso!`);
      setModal(null);

      setNomeFarmacia("");
      setEmailFarmacia("");
      setTelFarmacia("");
      setCnesFarmacia("");
      setGerenteSearchFarmacia("");
      setGerentesFarmacia([]);
      setSenhaFarmacia("");
      setCepFarmacia("");
      setEnderecoFarmacia("");
      setNumeroFarmacia("");
      setComplementoFarmacia("");
      setBairroFarmacia("");
      setCidadeFarmacia("");
    } catch (error) {
      console.error("Erro ao cadastrar farmácia:", error);
      setNotice(`Erro ao cadastrar farmácia: ${error.message}`);
    }
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
        {pharmacies && (
          <button
            className="mgr-primary"
            onClick={() => setModal({ type: "registerFarmacia" })}
          >
            + Cadastrar farmácia
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
      {modal?.type === "registerFarmacia" && (
        <Dialog title="Cadastrar farmácia" onClose={() => setModal(null)}>
          <form className="mgr-form" onSubmit={registerFarmacia}>
            <label>
              Nome da farmácia
              <input
                name="nomeFarmacia"
                value={nomeFarmacia}
                onChange={({ target }) => setNomeFarmacia(target.value)}
                required
                minLength={3}
                maxLength={120}
                autoComplete="organization-title"
                placeholder="Nome da farmácia"
              />
            </label>
            <div className="mgr-form-row">
              <label>
                E-mail da farmácia
                <input
                  name="emailFarmacia"
                  value={emailFarmacia}
                  onChange={({ target }) => setEmailFarmacia(target.value)}
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="farmacia@exemplo.com"
                />
              </label>
              <label>
                Telefone
                <input
                  name="telFarmacia"
                  value={telFarmacia}
                  onChange={({ target }) => setTelFarmacia(target.value)}
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                />
              </label>
            </div>
            <div className="mgr-form-row">
              <label>
                CNES
                <input
                  name="cnesFarmacia"
                  value={cnesFarmacia}
                  onChange={({ target }) => setCnesFarmacia(target.value)}
                  type="text"
                  required
                  placeholder="Número CNES"
                />
              </label>
              <label>
                Senha da farmácia
                <input
                  name="senhaFarmacia"
                  value={senhaFarmacia}
                  onChange={({ target }) => setSenhaFarmacia(target.value)}
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Crie uma senha"
                />
              </label>
            </div>
            <div className="adm-gerente-search-wrap">
              <label className="adm-gerente-search-label">
                Gerentes da farmácia
                <input
                  name="gerenteSearchFarmacia"
                  value={gerenteSearchFarmacia}
                  onFocus={() => setShowGerenteSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowGerenteSuggestions(false), 150)
                  }
                  onChange={({ target }) =>
                    setGerenteSearchFarmacia(target.value)
                  }
                  placeholder="Buscar gerente por nome ou e-mail"
                  autoComplete="off"
                  className="adm-gerente-search-input"
                />
                {showGerenteSuggestions && (
                  <div className="adm-gerente-suggestions">
                    {gerenteOptions.length ? (
                      gerenteOptions.map((gerente) => (
                        <button
                          key={gerente.id}
                          type="button"
                          className={`adm-gerente-option ${gerentesFarmacia.some((item) => item.id === gerente.id) ? "active" : ""}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            if (
                              gerentesFarmacia.some(
                                (item) => item.id === gerente.id,
                              )
                            ) {
                              setGerentesFarmacia((current) =>
                                current.filter(
                                  (item) => item.id !== gerente.id,
                                ),
                              );
                            } else {
                              setGerentesFarmacia((current) => [
                                ...current,
                                gerente,
                              ]);
                            }
                            setGerenteSearchFarmacia("");
                            setShowGerenteSuggestions(false);
                          }}
                        >
                          <span className="adm-gerente-option-name">
                            {gerente.name}
                          </span>
                          <span className="adm-gerente-option-email">
                            {gerente.email}
                          </span>
                        </button>
                      ))
                    ) : (
                      <span className="adm-gerente-empty">
                        Nenhum gerente encontrado
                      </span>
                    )}
                  </div>
                )}
              </label>
              <div className="adm-gerente-selected">
                <span className="adm-gerente-selected-title">
                  Selecionados:
                </span>
                <span className="adm-gerente-selected-list">
                  {gerentesFarmacia.length
                    ? gerentesFarmacia.map((item) => item.name).join(", ")
                    : "Nenhum"}
                </span>
              </div>
            </div>
            <div className="mgr-form-row">
              <label>
                CEP
                <input
                  name="cepFarmacia"
                  value={cepFarmacia}
                  onChange={({ target }) => setCepFarmacia(target.value)}
                  type="text"
                  required
                  placeholder="00000-000"
                />
              </label>
              <label>
                Endereço
                <input
                  name="enderecoFarmacia"
                  value={enderecoFarmacia}
                  onChange={({ target }) => setEnderecoFarmacia(target.value)}
                  type="text"
                  required
                  placeholder="Rua, avenida..."
                />
              </label>
            </div>
            <div className="mgr-form-row">
              <label>
                Número
                <input
                  name="numeroFarmacia"
                  value={numeroFarmacia}
                  onChange={({ target }) => setNumeroFarmacia(target.value)}
                  type="text"
                  required
                  placeholder="123"
                />
              </label>
              <label>
                Complemento (opcional)
                <input
                  name="complementoFarmacia"
                  value={complementoFarmacia}
                  onChange={({ target }) =>
                    setComplementoFarmacia(target.value)
                  }
                  type="text"
                  placeholder="Apartamento, bloco..."
                />
              </label>
            </div>
            <div className="mgr-form-row">
              <label>
                Bairro
                <input
                  name="bairroFarmacia"
                  value={bairroFarmacia}
                  onChange={({ target }) => setBairroFarmacia(target.value)}
                  type="text"
                  required
                  placeholder="Bairro"
                />
              </label>
              <label>
                Cidade
                <input
                  name="cidadeFarmacia"
                  value={cidadeFarmacia}
                  onChange={({ target }) => setCidadeFarmacia(target.value)}
                  type="text"
                  required
                  placeholder="Cidade"
                />
              </label>
            </div>
            <div className="mgr-modal-actions">
              <button
                className="mgr-secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="mgr-primary" type="submit">
                Cadastrar farmácia
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {modal?.type === "register" && (
        <Dialog title="Cadastrar gerente" onClose={() => setModal(null)}>
          <form className="mgr-form" onSubmit={register}>
            <label>
              Nome completo
              <input
                name="name"
                value={nomeGerente}
                onChange={({ target }) => setNomeGerente(target.value)}
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
                value={emailGerente}
                onChange={({ target }) => setEmailGerente(target.value)}
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
                  value={cpfGerente}
                  onChange={({ target }) => setCpfGerente(target.value)}
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
                  value={crfGerente}
                  onChange={({ target }) => setCrfGerente(target.value)}
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
                  value={senhaGerente}
                  onChange={({ target }) => setSenhaGerente(target.value)}
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
                  value={confirmarSenhaGerente}
                  onChange={({ target }) =>
                    setConfirmarSenhaGerente(target.value)
                  }
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
                value={cepGerente}
                onChange={({ target }) => setCepGerente(target.value)}
                type="text"
                required
                // autoComplete="new-password"
                placeholder="Ex. 00000-000"
                onInput={(event) =>
                  event.currentTarget.form.elements
                    .namedItem("confirmPassword")
                    .setCustomValidity("")
                }
              />
            </label>
            <label>
              Endereço
              <input
                name="enderecoGerente"
                value={enderecoGerente}
                onChange={({ target }) => setEnderecoGerente(target.value)}
                type="text"
                required
                // autoComplete="new-password"
                placeholder="Ex. Rua Alcindo Pereira"
                onInput={(event) =>
                  event.currentTarget.form.elements
                    .namedItem("confirmPassword")
                    .setCustomValidity("")
                }
              />
            </label>

            <div className="mgr-form-row">
              <label>
                Nº
                <input
                  name="numeroGerente"
                  value={numeroGerente}
                  onChange={({ target }) => setNumeroGerente(target.value)}
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
                  value={complementoGerente}
                  onChange={({ target }) => setComplementoGerente(target.value)}
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
                  value={bairroGerente}
                  onChange={({ target }) => setBairroGerente(target.value)}
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
                  value={cidadeGerente}
                  onChange={({ target }) => setCidadeGerente(target.value)}
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
            {pharmacies && (
              <>
                <div>
                  <dt>Gerente responsável</dt>
                  <dd>
                    {(() => {
                      const manager = data.gerentes.find(
                        (item) =>
                          String(item.id) === String(modal.record.idGerente),
                      );
                      return manager?.name || "Não informado";
                    })()}
                  </dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{modal.record.phone || "Não informado"}</dd>
                </div>
                <div>
                  <dt>CNES</dt>
                  <dd>{modal.record.cnes || "Não informado"}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{modal.record.email || "Não informado"}</dd>
                </div>
              </>
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
