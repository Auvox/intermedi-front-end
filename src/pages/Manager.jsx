import PersonaAvatar from "../components/PersonaAvatar";
import { DirectoryStats, PersonCell, TeamTable } from "../components/Directory";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  Outlet,
  useOutletContext,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import ManagerSidebar from "../components/ManagerSidebar";
import PerfilProvider from "../components/perfil/PerfilProvider";
import { usePerfil } from "../components/perfil/perfilContext";
import { propsLinha } from "../services/perfil";
import { useAoAlterarDados } from "../hooks/useResumo";
import ManagerIcon from "../components/ManagerIcon";
import { AccountControls } from "../components/ManagerAccess";
import { authRequest } from "../services/auth";
import useApiList from "../hooks/useApiList";
import {
  useChamadosGerente,
  useChamadosPendentes,
  useEntregas,
  usePedidosRecebidosPendentes,
  usePolling,
  useIdGerente,
  useToast,
} from "../hooks/useChamados";
import {
  AcompanhamentoRemedios,
  ChamadoModal,
  DespachoResumo,
  ErroComRetry,
  HistoricoPedidos,
  PrioridadeBadge,
  ProgressoChamado,
  RemediosChamadoTable,
  RespostaChamado,
  SeletorPersona,
  StatusChamadoBadge,
  ToastRegion,
} from "../components/Chamados";
import {
  DisponibilidadeRede,
  NotificacoesGerente,
  ResponderChamado,
  TentarDeNovo,
} from "../components/ChamadosGerente";
import { EstoqueTabela } from "../components/Remedios";
import { ordenarEstoque } from "../services/remedios";
import {
  STATUS_CHAMADO,
  TURNO_FUNCIONARIO,
  dataDoChamado,
  formatarDataChamado,
  resumoRemedios,
  textoEntregas,
  statusChamado,
  tempoDesde,
} from "../services/chamados";
import {
  API_URL,
  listarFarmacias,
  listarFuncionarios,
  listarPacientes,
  listarEstoqueGerente,
  normalizeFuncionario,
  normalizePaciente,
  normalizeText,
} from "../services/api";
import {
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
  return <DirectoryStats items={items.map(([label, value, , icon]) => [label, value, icon])} />;
}
export default function Manager() {
  const location = useLocation();
  const outletContext = useOutletContext();
  const [sessionUser, setSessionUser] = useState(null);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const { user } = await authRequest("session", undefined);
        if (!active) return;
        setSessionUser(user);
        setSessionError("");
      } catch (error) {
        if (!active) return;
        setSessionError(
          error instanceof Error
            ? error.message
            : "Sessão do gerente indisponível.",
        );
        setSessionUser(null);
      }
    }
    loadSession();
    return () => {
      active = false;
    };
  }, []);

  const user = outletContext?.user ?? sessionUser;
  const data = initialData;
  // Antes de a sessão responder ainda não há e-mail para achar o idGerente
  const sessionPending = !user && !sessionError;
  // Sem login (ainda não implementado para as personas), o gerente é escolhido na topbar
  const gerente = useIdGerente(user?.email, { aguardar: sessionPending });
  // 8 s: a notificação de entrega lista os remédios e é mais longa
  const [toast, notify] = useToast(8000);
  const pendentes = useChamadosPendentes(gerente.idGerente, {
    onNovaSolicitacao: (chamado) =>
      notify(`Nova solicitação de ${chamado.funcionario?.nomeFuncionario || "funcionário"}`),
  });
  const pedidosRede = usePedidosRecebidosPendentes(gerente.idGerente, {
    onNovoPedido: (pedido) => notify(`Novo pedido da rede: ${pedido.mensagem}`),
  });
  // Remédios que chegaram: aqui (pedidos enviados) ou na farmácia que esta forneceu (recebidos)
  const entregas = useEntregas(gerente.idGerente, {
    tipos: ["enviados", "recebidos"],
    escopo: `gerente:${gerente.idGerente}`,
    onNovas: (novas) => notify(textoEntregas(novas)),
  });
  useEffect(() => {
    document.title = "Área do gerente | Intermedi";
    return () => {
      document.title = "Intermedi";
    };
  }, []);
  return (
    <div className="mgr-shell">
      <ManagerSidebar
        unitName={user?.unitName || "Minha unidade"}
        pendingTickets={pendentes.totalPendentes}
        pendingOrders={pedidosRede.totalPendentes}
      />
      <div className="mgr-workspace">
        <div className="mgr-topbar">
          <span>
            <span className="mgr-topbar-unit-prefix">Painel de gestão</span>{" "}
            <span className="mgr-topbar-divider">/</span>{" "}
            <strong>{user?.unitName || "Minha unidade"}</strong>
          </span>
          {!gerente.temSessao && gerente.gerentes.length > 0 && (
            <SeletorPersona
              label="Gerente"
              value={gerente.idGerente ?? ""}
              onChange={gerente.escolher}
              options={gerente.gerentes.map((g) => [g.id, g.nome])}
            />
          )}
          <NotificacoesGerente gerente={gerente} pendentes={pendentes} pedidos={pedidosRede} entregas={entregas} />
          <AccountControls
            user={
              user || { id: "", name: gerente.nome || "Gerente", email: "", role: "gerente" }
            }
          />
        </div>
        <PerfilProvider plataforma="gerente" gerenteAtual={{ id: gerente.idGerente, idFarmacia: gerente.idFarmacia }}>
        <main className={`mgr-main${location.pathname.replace(/\/$/, "") !== "/gerente" ? " directory-layout" : ""}`}>
          <Outlet
            context={{
              data,
              gerente,
              pendentes,
              pedidosRede,
              notify,
              user: user || {
                id: "",
                name: "Gerente",
                email: "",
                role: "gerente",
              },
            }}
          />
        </main>
        </PerfilProvider>
        <footer className="mgr-footer">
          Intermedi <span>Conectando farmácias. Aproximando o cuidado.</span>
        </footer>
      </div>
      <ToastRegion message={toast} />
    </div>
  );
}
export function ManagerDashboard() {
  const { user, gerente, pendentes, pedidosRede } = useOutletContext();
  const buscarEstoque = useCallback(
    (options) => listarEstoqueGerente(gerente.idGerente, {}, options),
    [gerente.idGerente],
  );
  const estoque = usePolling(buscarEstoque, { enabled: Boolean(gerente.idGerente) });
  const resumo = estoque.data?.resumo;
  const atencao = resumo ? resumo.criticos + resumo.zerados + resumo.vencidos : null;
  const { items: patients } = useApiList(listarPacientes);
  const managerName = (gerente.temSessao ? user?.name : gerente.nome) || user?.name || "Gerente";
  const managerUnit = user?.unitName || unit;
  return (
    <>
      <Header
        featured
        eyebrow="SEU CUIDADO COMEÇA AQUI"
        title={`Olá, ${managerName} · ${managerUnit}`}
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
            "Chamados pendentes",
            gerente.idGerente ? pendentes.totalPendentes : null,
            "Aguardando sua resposta",
            "ticket",
          ],
          [
            "Itens no estoque",
            resumo?.totalItens ?? null,
            "Remédios da sua farmácia",
            "pill",
          ],
          [
            "Pacientes cadastrados",
            patients.length,
            "Pacientes cadastrados na rede",
            "heart",
          ],
        ]}
      />
      <div className="mgr-insight chamado-insight-rede">
        <span className="mgr-insight-icon">
          <ManagerIcon name="truck" />
        </span>
        <div>
          <strong>Pedidos da rede aguardando você</strong>
          <p>
            {gerente.idGerente
              ? pedidosRede.totalPendentes
                ? `${pedidosRede.totalPendentes} ${pedidosRede.totalPendentes === 1 ? "farmácia está pedindo" : "pedidos de farmácias"} um remédio do seu estoque.`
                : "Nenhum pedido de outras farmácias no momento."
              : "Carregando…"}
          </p>
        </div>
        <Link to="/gerente/pedidos">Ver pedidos →</Link>
      </div>
      <div className="mgr-insight">
        <span className="mgr-insight-icon">
          <ManagerIcon name="pill" />
        </span>
        <div>
          <strong>Estoque em dia, cuidado que continua.</strong>
          <p>
            {atencao === null
              ? "Consulte o estoque e acompanhe as solicitações da equipe."
              : `${atencao} ${atencao === 1 ? "item precisa" : "itens precisam"} de atenção (críticos, zerados ou vencidos). Consulte o estoque e acompanhe as solicitações da equipe.`}
          </p>
        </div>
        <Link to="/gerente/remedios">Ver estoque →</Link>
      </div>
      <section className="mgr-panel">
        <div className="mgr-panel-head">
          <div>
            <h2>Estoque da farmácia</h2>
            <p>Os itens que mais precisam de atenção aparecem primeiro.</p>
          </div>
          <Link to="/gerente/remedios">Ver todos →</Link>
        </div>
        {!gerente.idGerente || estoque.loading ? (
          <p className="mgr-empty" role="status">Carregando estoque…</p>
        ) : estoque.error ? (
          <ErroComRetry message={estoque.error} onRetry={estoque.retry} />
        ) : estoque.data?.estoque?.length ? (
          <EstoqueTabela itens={ordenarEstoque(estoque.data.estoque).slice(0, 5)} />
        ) : (
          <p className="mgr-empty">O estoque desta farmácia está vazio.</p>
        )}
        <p className="mgr-table-note">
          Crítico: quantidade no mínimo ou abaixo · Zerado: sem unidades · Lote vencido não pode ser entregue.
        </p>
      </section>
      <section className="mgr-panel">
        <div className="mgr-panel-head">
          <div>
            <h2>Chamados que precisam de você</h2>
            <p>Solicitações de reposição abertas pela sua equipe.</p>
          </div>
          <Badge tone="yellow">
            {pendentes.totalPendentes} {pendentes.totalPendentes === 1 ? "pendente" : "pendentes"}
          </Badge>
        </div>
        {gerente.loading || pendentes.loading ? (
          <p className="mgr-empty" role="status">Carregando chamados…</p>
        ) : gerente.error ? (
          <ErroComRetry message={gerente.error} onRetry={gerente.retry} />
        ) : pendentes.error ? (
          <ErroComRetry message={pendentes.error} onRetry={pendentes.retry} />
        ) : (
          pendentes.pendentes.slice(0, 5).map((c) => (
            <div className="mgr-ticket-line" key={c.idChamado}>
              <PersonaAvatar className="mgr-avatar" role="funcionario" />
              <div>
                <strong>{c.titulo}</strong>
                <small>
                  {c.funcionario?.nomeFuncionario} · {tempoDesde(c.dataAbertura)}
                </small>
              </div>
              <PrioridadeBadge prioridade={c.prioridade} />
              <Link to={`/gerente/chamados?chamado=${c.idChamado}`}>
                Abrir chamado →
              </Link>
            </div>
          ))
        )}
        {!pendentes.loading && !gerente.loading && !gerente.error && !pendentes.error && !pendentes.pendentes.length && (
          <p className="mgr-empty">Tudo em dia! Nenhuma solicitação pendente.</p>
        )}
      </section>
    </>
  );
}
export function ManagerEmployees() {
  const { data, gerente } = useOutletContext();
  const { chamados } = useChamadosGerente(gerente.idGerente);
  const { abrirPerfil } = usePerfil();
  // foto trocada no perfil: recarrega a lista para mostrar a nova
  const [versao, setVersao] = useState(0);
  useAoAlterarDados(() => setVersao((v) => v + 1));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");
  const deletingRef = useRef(false);
  const [period, setPeriod] = useState("");

  // funcionários reais vindos do backend
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregandoFuncionarios, setCarregandoFuncionarios] = useState(true);
  const [erroFuncionarios, setErroFuncionarios] = useState("");

  const [farmacias, setFarmacias] = useState([]);
  const [carregandoFarmacias, setCarregandoFarmacias] = useState(true);
  const [erroFarmacias, setErroFarmacias] = useState("");
  async function buscarFarmacias() {
    setCarregandoFarmacias(true);
    setErroFarmacias("");
    try {
      const lista = await listarFarmacias();

      const mapped = lista.map((farmacia) => ({
        id: farmacia.idFarmacia ?? farmacia.id,
        idGerente: farmacia.idGerente ?? farmacia.gerenteId,
        name: farmacia.nomeFarmacia ?? farmacia.name ?? farmacia.nome,
      }));

      setFarmacias(mapped);
      return lista;
    } catch (error) {
      setErroFarmacias(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar ao servidor de farmácias.",
      );
    } finally {
      setCarregandoFarmacias(false);
    }
  }

  async function buscarFuncionarios(farmaciaId = "") {
    setCarregandoFuncionarios(true);
    setErroFuncionarios("");
    try {
      const lista = await listarFuncionarios();
      const todos = lista.map(normalizeFuncionario);
      setFuncionarios(
        farmaciaId
          ? todos.filter((f) => f.farmaciaId === String(farmaciaId))
          : todos,
      );
      return lista;
    } catch (error) {
      setErroFuncionarios(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar ao servidor de funcionários.",
      );
    } finally {
      setCarregandoFuncionarios(false);
    }
  }

  useEffect(() => {
    // A farmácia é a do gerente atual (sessão ou seletor da barra superior),
    // pelo fkIdFarmacia do cadastro dele.
    if (gerente.loading) return;
    async function carregarUnidadeDoGerenteLogado() {
      try {
        await buscarFarmacias(); // opções do formulário de cadastro
        await buscarFuncionarios(gerente.idFarmacia ?? "");
      } catch (error) {
        setErroFuncionarios(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar sua unidade.",
        );
        setCarregandoFuncionarios(false);
      }
    }

    carregarUnidadeDoGerenteLogado();
  }, [gerente.loading, gerente.idFarmacia, versao]);

  const employees = funcionarios.filter((e) =>
    `${e.name} ${e.role}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const deliveries = data.deliveries.filter(
    (d) => d.employee === selected?.id && inPeriod(d.date, period),
  );
  const desde = period ? new Date().setHours(0, 0, 0, 0) - Number(period) * 86400000 : 0;
  const tickets = chamados.filter(
    (c) =>
      String(c.funcionario?.idFuncionario) === String(selected?.id) &&
      (dataDoChamado(c.dataAbertura)?.getTime() ?? 0) >= desde,
  );

  const [nomeFuncionario, setNomeFuncionario] = useState("");
  const [cpfFuncionario, setCpfFuncionario] = useState("");
  const [emailFuncionario, setEmailFuncionario] = useState("");
  const [matriculaFuncionario, setMatriculaFuncionario] = useState("");
  const [telFuncionario, setTelFuncionario] = useState("");
  const [cargoFuncionario, setCargoFuncionario] = useState("atendente");
  const [turnoFuncionario, setTurnoFuncionario] = useState("manha");
  const [idFarmaciaFuncionario, setIdFarmaciaFuncionario] = useState("");
  const [cadastroMensagem, setCadastroMensagem] = useState("");
  const [cadastroNotificacao, setCadastroNotificacao] = useState(null);
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
      fkIdFarmacia: idFarmaciaFuncionario,
      idFarmacia: idFarmaciaFuncionario,
    };

    try {
      const response = await fetch(`${API_URL}/funcionario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(funcionario),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível cadastrar o funcionário.",
        );
      }

      // busca a lista atualizada para o novo funcionário aparecer na hora
      const listaAtualizada = await buscarFuncionarios();
      const criado = result.funcionario || result;
      const registro = listaAtualizada?.find((item) =>
        criado.idFuncionario != null
          ? item.idFuncionario === criado.idFuncionario
          : item.emailFuncionario?.toLowerCase() ===
            funcionario.emailFuncionario,
      );
      setCadastroNotificacao({
        nome:
          registro?.nomeFuncionario ||
          criado.nomeFuncionario ||
          funcionario.nomeFuncionario,
        matricula:
          registro?.matriculaFuncionario || criado.matriculaFuncionario || null,
      });
      setAdding(false);
      setNomeFuncionario("");
      setCpfFuncionario("");
      setEmailFuncionario("");
      setMatriculaFuncionario("");
      setTelFuncionario("");
      setCargoFuncionario("atendente");
      setTurnoFuncionario("manha");
      setIdFarmaciaFuncionario("");
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

  function closeEmployee() {
    if (deletingRef.current) return;
    setSelected(null);
    setConfirmDelete(false);
    setDeleteError("");
  }

  async function deleteEmployee() {
    if (!selected || selected.id == null || deletingRef.current) return;
    const employee = selected;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(
        `${API_URL}/funcionario/${encodeURIComponent(employee.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.error || "Não foi possível excluir o funcionário.",
        );
      }
      setFuncionarios((current) =>
        current.filter((item) => item.id !== employee.id),
      );
      setSelected(null);
      setConfirmDelete(false);
      setCadastroNotificacao(null);
      setDeleteNotice(
        `${employee.name} · Matrícula: ${employee.matricula || "não informada"}. Funcionário excluído com sucesso.`,
      );
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar ao servidor.",
      );
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <>
      <Header
        title="Funcionários"
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
      {cadastroNotificacao && (
        <div className="mgr-registration-notice">
          <ManagerIcon name="check" size={24} />
          <div role="status" aria-live="polite">
            <strong>Funcionário cadastrado com sucesso</strong>
            <p>{cadastroNotificacao.nome}</p>
            <span>
              Matrícula:{" "}
              <b>
                {cadastroNotificacao.matricula ?? "Não informada pelo servidor"}
              </b>
            </span>
          </div>
          <button
            type="button"
            aria-label="Fechar notificação de cadastro"
            onClick={() => setCadastroNotificacao(null)}
          >
            ×
          </button>
        </div>
      )}
      {deleteNotice && (
        <div className="mgr-registration-notice">
          <p role="status">{deleteNotice}</p>
          <button
            aria-label="Fechar notificação de exclusão"
            onClick={() => setDeleteNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <Stats
        items={[
          [
            "Profissionais da unidade",
            funcionarios.length,
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
            gerente.idGerente ? chamados.length : null,
            "Solicitações de todos os períodos",
            "ticket",
          ],
        ]}
      />
      <section className="mgr-panel">
        <div className="mgr-toolbar">
          <h2>
            Funcionários <Badge>{funcionarios.length}</Badge>
          </h2>
          <input
            aria-label="Buscar funcionário"
            placeholder="Buscar nome ou cargo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {carregandoFuncionarios && <p className="mgr-empty">Carregando funcionários…</p>}
        <TeamTable
          employees={employees}
          onAbrir={(employee, el) => abrirPerfil("funcionario", employee.id, el)}
          onExcluir={(employee) => { setSelected(employee); setPeriod(""); setConfirmDelete(true); }}
        />
        <p className="mgr-table-note">{employees.length} de {funcionarios.length} registros</p>
        {erroFuncionarios && <p className="mgr-empty">{erroFuncionarios}</p>}
        {!carregandoFuncionarios && !erroFuncionarios && !employees.length && (
          <Empty />
        )}
      </section>
      {adding && (
        // adicionar funcionarios
        <Modal title="Adicionar funcionário" onClose={() => setAdding(false)}>
          <form className="mgr-form" onSubmit={cadastrarFuncionario}>
            <label>
              Nome completo
              <input
                name="nomeFuncionario"
                required
                maxLength={120}
                value={nomeFuncionario}
                onChange={({ target }) => setNomeFuncionario(target.value)}
              />
            </label>
            <label>
              CPF
              <input
                name="cpfFuncionario"
                required
                maxLength={14}
                value={cpfFuncionario}
                onChange={({ target }) => setCpfFuncionario(target.value)}
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                name="emailFuncionario"
                required
                maxLength={254}
                value={emailFuncionario}
                onChange={({ target }) => setEmailFuncionario(target.value)}
              />
            </label>
            <label>
              Telefone
              <input
                type="text"
                name="telFuncionario"
                maxLength={20}
                value={telFuncionario}
                onChange={({ target }) => setTelFuncionario(target.value)}
              />
            </label>
            <label>
              Cargo
              <select
                name="cargoFuncionario"
                value={cargoFuncionario}
                onChange={({ target }) => setCargoFuncionario(target.value)}
              >
                <option value="atendente">Atendente</option>
                <option value="farmaceutico">Farmacêutico(a)</option>
                <option value="auxiliar de farmacia">
                  Auxiliar de farmácia
                </option>
              </select>
            </label>
            <label>
              Farmácia
              <select
                name="idFarmaciaFuncionario"
                required
                value={idFarmaciaFuncionario}
                onChange={({ target }) =>
                  setIdFarmaciaFuncionario(target.value)
                }
                disabled={carregandoFarmacias || !!erroFarmacias}
              >
                <option value="">Selecione a farmácia</option>
                {farmacias.map((farmacia) => (
                  <option key={farmacia.id} value={farmacia.id}>
                    {farmacia.name}
                  </option>
                ))}
              </select>
              {erroFarmacias && (
                <small className="mgr-form-error">{erroFarmacias}</small>
              )}
            </label>
            <label>
              Turno
              <select
                name="turnoFuncionario"
                value={turnoFuncionario}
                onChange={({ target }) => setTurnoFuncionario(target.value)}
              >
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
                <option value="integral">Integral</option>
              </select>
            </label>
            {cadastroMensagem && <p role="status">{cadastroMensagem}</p>}
            <button
              className="mgr-primary"
              disabled={
                cadastrando || carregandoFarmacias || !idFarmaciaFuncionario
              }
            >
              {cadastrando ? "Cadastrando…" : "Cadastrar funcionário"}
            </button>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal title={selected.name} onClose={closeEmployee}>
          <p>
            {selected.role} · {selected.shift}
          </p>
          <p>Matrícula: {selected.matricula}</p>
          <p>{selected.email}</p>
          <div className="mgr-delete-area">
            {!confirmDelete ? (
              <button
                className="mgr-delete-button"
                disabled={selected.id == null}
                onClick={() => setConfirmDelete(true)}
              >
                Excluir funcionário
              </button>
            ) : (
              <>
                <p>
                  Excluir <strong>{selected.name}</strong> (matrícula{" "}
                  {selected.matricula || "não informada"})? Esta ação não pode
                  ser desfeita.
                </p>
                <div className="mgr-modal-actions">
                  <button
                    className="mgr-secondary"
                    disabled={deleting}
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeleteError("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="mgr-delete-button"
                    disabled={deleting}
                    onClick={deleteEmployee}
                  >
                    {deleting ? "Excluindo…" : "Confirmar exclusão"}
                  </button>
                </div>
                {deleteError && <p role="alert">{deleteError}</p>}
              </>
            )}
          </div>
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
                  0,
                )} unidades entregues`,
              ],
            ]}
          />
          <h3>Chamados do funcionário</h3>
          {tickets.map((c) => (
            <div className="mgr-detail-line" key={c.idChamado}>
              <strong>{c.titulo}</strong>
              <span>
                {formatarDataChamado(c.dataAbertura)} · {statusChamado(c.status).label}
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
  const [search, setSearch] = useState("");
  const { abrirPerfil } = usePerfil();
  const { items: patients, loading, error } = useApiList(listarPacientes, normalizePaciente);
  const filtered = patients.filter((p) =>
    normalizeText(`${p.name} ${p.email} ${p.cpf} ${p.frequentMedicine}`).includes(
      normalizeText(search.trim()),
    ),
  );
  return (
    <>
      <Header
        title="Pacientes"
        description="Consulte os pacientes cadastrados na rede."
      />
      <Stats
        items={[
          ["Pacientes cadastrados", patients.length, "Total na rede", "heart"],
          ["Resultados da busca", filtered.length, "Conforme os filtros", "check"],
          [
            "Com remédio frequente",
            patients.filter((p) => p.frequentMedicine).length,
            "Uso contínuo informado",
            "pill",
          ],
        ]}
      />
      <section className="mgr-panel">
        <div className="mgr-toolbar">
          <input
            type="search"
            aria-label="Buscar paciente"
            placeholder="Buscar nome, e-mail, CPF ou remédio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <p className="mgr-empty" role="status">Carregando pacientes…</p>
        ) : error ? (
          <p className="mgr-empty" role="alert">{error}</p>
        ) : (
          <div className="mgr-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>CPF</th>
                  <th>Telefone</th>
                  <th>Cidade</th>
                  <th>Remédio frequente</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} {...propsLinha((el) => abrirPerfil("paciente", p.id, el), `Abrir perfil de ${p.name}`)}>
                    <td>
                      <PersonCell name={p.name} detail={p.email} role="paciente" photo={p.photo} />
                    </td>
                    <td>{p.cpf || "—"}</td>
                    <td>{p.phone || "—"}</td>
                    <td>{[p.city, p.state].filter(Boolean).join(" / ") || "—"}</td>
                    <td>{p.frequentMedicine || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <Empty />}
          </div>
        )}
        <p className="mgr-table-note" role="status">
          {filtered.length} de {patients.length} pacientes
        </p>
      </section>
    </>
  );
}
export function ManagerTickets() {
  const { gerente, pendentes, notify } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { chamados, carregado, loading, error, reload, retry, setData } = useChamadosGerente(gerente.idGerente);

  // Chegou solicitação nova no sininho: atualiza a lista também
  const { totalPendentes, reload: reloadPendentes, removerPendente } = pendentes;
  useEffect(() => {
    if (carregado) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPendentes]);

  const idSelecionado = params.get("chamado");
  const selected = idSelecionado
    ? chamados.find((c) => String(c.idChamado) === idSelecionado)
    : null;
  const contar = (valor) => chamados.filter((c) => c.status === valor).length;
  const termo = normalizeText(search.trim());
  const tickets = chamados.filter(
    (c) =>
      (!status || c.status === status) &&
      normalizeText(
        `${c.idChamado} ${c.titulo} ${c.funcionario?.nomeFuncionario} ${resumoRemedios(c.remedios)}`,
      ).includes(termo),
  );

  function abrir(idChamado) {
    const next = new URLSearchParams(params);
    next.set("chamado", idChamado);
    setParams(next);
  }
  function close() {
    const next = new URLSearchParams(params);
    next.delete("chamado");
    setParams(next);
  }
  function atualizar(atualizado) {
    setData((lista) =>
      (lista ?? []).map((c) => (c.idChamado === atualizado.idChamado ? atualizado : c)),
    );
  }
  function respondido(atualizado) {
    atualizar(atualizado);
    removerPendente(atualizado.idChamado);
    notify(atualizado.status !== "recusado" ? "Chamado aceito e pedido à rede" : "Chamado recusado");
  }
  function conflito() {
    reload();
    reloadPendentes();
  }

  const header = (
    <Header
      title="Cada chamado importa."
      description="Aceite ou recuse os pedidos de reposição da sua equipe."
    />
  );
  if (gerente.loading) {
    return <>{header}<section className="mgr-panel"><p className="mgr-empty" role="status">Carregando chamados…</p></section></>;
  }
  if (gerente.error) {
    return <>{header}<section className="mgr-panel"><ErroComRetry message={gerente.error} onRetry={gerente.retry} /></section></>;
  }

  return (
    <>
      {header}
      <DirectoryStats
        items={[
          ["Pendentes", carregado ? contar("pendente") : null, "clock"],
          ["Em andamento", carregado ? contar("em_andamento") + contar("aceito") : null, "truck"],
          ["Recusados", carregado ? contar("recusado") : null, "alert"],
          ["Resolvidos", carregado ? contar("resolvido") : null, "ticket"],
        ]}
      />
      <section className="mgr-panel">
        <div className="mgr-toolbar">
          <select
            aria-label="Filtrar status do chamado"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CHAMADO).map(([valor, { label }]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </select>
          <input
            type="search"
            aria-label="Buscar chamado"
            placeholder="Buscar assunto, funcionário ou remédio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="mgr-secondary" onClick={reload}>
            Atualizar
          </button>
        </div>
        {loading ? (
          <p className="mgr-empty" role="status">Carregando chamados…</p>
        ) : error && !carregado ? (
          <ErroComRetry message={error} onRetry={retry} />
        ) : (
          <div className="mgr-table-wrap">
            {error && <p className="chamado-inline-error" role="alert">{error}</p>}
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
                {tickets.map((c) => (
                  <tr
                    key={c.idChamado}
                    {...propsLinha(() => abrir(c.idChamado), `Abrir chamado #${c.idChamado}`)}
                    className={`perfil-linha${c.status === "pendente" ? " chamado-row-pendente" : ""}`}
                  >
                    <td>
                      <strong>{c.titulo}</strong>
                      <small>
                        #{c.idChamado} · {resumoRemedios(c.remedios)}
                      </small>
                    </td>
                    <td>
                      {c.funcionario?.nomeFuncionario}
                      <small>{c.funcionario?.cargoFuncionario}</small>
                    </td>
                    <td>{formatarDataChamado(c.dataAbertura)}</td>
                    <td><PrioridadeBadge prioridade={c.prioridade} /></td>
                    <td><StatusChamadoBadge status={c.status} /></td>
                    <td>
                      <button
                        type="button"
                        className="mgr-text-button"
                        aria-label={`Abrir chamado #${c.idChamado}`}
                        onClick={() => abrir(c.idChamado)}
                      >
                        {c.status === "pendente" ? "Responder ↗" : "Abrir chamado ↗"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tickets.length && (
              <p className="mgr-empty">
                {status === "pendente" ? "Nenhuma solicitação pendente." : "Nenhum chamado encontrado para estes filtros."}
              </p>
            )}
          </div>
        )}
        <p className="mgr-table-note">
          {tickets.length} de {chamados.length} chamados · Atualiza automaticamente (a cada 5 s enquanto há remédio a caminho)
        </p>
      </section>
      {idSelecionado && (
        <ChamadoModal
          title={selected ? selected.titulo : `Chamado #${idSelecionado}`}
          onClose={close}
        >
          {!selected ? (
            loading || !carregado ? (
              <p className="mgr-empty" role="status">Carregando chamado…</p>
            ) : (
              <p className="mgr-empty" role="alert">Chamado não encontrado nesta farmácia.</p>
            )
          ) : (
            <ChamadoDetalhe
              key={selected.idChamado}
              chamado={selected}
              idGerente={gerente.idGerente}
              onRespondido={respondido}
              onAtualizado={atualizar}
              onConflito={conflito}
            />
          )}
        </ChamadoModal>
      )}
    </>
  );
}

function ChamadoDetalhe({ chamado, idGerente, onRespondido, onAtualizado, onConflito }) {
  const f = chamado.funcionario ?? {};
  const { abrirPerfil } = usePerfil();
  const linkPerfil = (tipo, id, texto) => (id ? (
    <button type="button" className="perfil-link" onClick={(e) => abrirPerfil(tipo, id, e.currentTarget)}>{texto}</button>
  ) : texto || "—");
  // 409: o formulário some quando a lista recarrega, então o aviso fica aqui
  const [aviso, setAviso] = useState("");
  // Resultado do aceite (para qual farmácia cada remédio foi pedido)
  const [despacho, setDespacho] = useState(null);
  const [semFornecedor, setSemFornecedor] = useState(false);
  const pendente = chamado.status === "pendente";
  const temSemFornecedor = (chamado.remedios ?? []).some((r) => r.situacao === "sem_fornecedor");
  return (
    <div className="chamado-detalhe">
      {aviso && <p className="chamado-inline-error chamado-aviso" role="alert">{aviso}</p>}
      <div className="mgr-ticket-meta">
        <StatusChamadoBadge status={chamado.status} />
        <PrioridadeBadge prioridade={chamado.prioridade} />
        <span>#{chamado.idChamado}</span>
      </div>
      <dl className="chamado-dados">
        <div><dt>Funcionário</dt><dd>{linkPerfil("funcionario", f.idFuncionario, f.nomeFuncionario)}</dd></div>
        <div><dt>Matrícula</dt><dd>{f.matriculaFuncionario || "—"}</dd></div>
        <div><dt>Cargo</dt><dd>{f.cargoFuncionario || "—"}</dd></div>
        <div><dt>Turno</dt><dd>{TURNO_FUNCIONARIO[f.turnoFuncionario] || f.turnoFuncionario || "—"}</dd></div>
        <div><dt>Farmácia</dt><dd>{linkPerfil("farmacia", chamado.farmacia?.idFarmacia, chamado.farmacia?.nomeFarmacia)}</dd></div>
        <div><dt>Aberto em</dt><dd>{formatarDataChamado(chamado.dataAbertura)}</dd></div>
      </dl>
      {chamado.descricao && <p className="mgr-description">{chamado.descricao}</p>}
      {pendente ? (
        <>
          <h3>Remédios solicitados</h3>
          <RemediosChamadoTable remedios={chamado.remedios} />
          <h3>Disponibilidade na rede</h3>
          <DisponibilidadeRede
            chamado={chamado}
            idGerente={idGerente}
            onCarregado={(dados) => setSemFornecedor(dados.todosTemFornecedor === false)}
          />
          <ResponderChamado
            chamado={chamado}
            idGerente={idGerente}
            avisoSemFornecedor={semFornecedor}
            onRespondido={(atualizado, resultado) => {
              setDespacho(resultado);
              onRespondido(atualizado);
            }}
            onConflito={(mensagem) => {
              setAviso(mensagem);
              onConflito();
            }}
          />
        </>
      ) : (
        <>
          <RespostaChamado chamado={chamado} />
          {despacho && <DespachoResumo despacho={despacho} />}
          {chamado.status === "resolvido" && (
            <p className="chamado-resolvido" role="status">Todos os remédios chegaram ✔</p>
          )}
          {chamado.status !== "recusado" && chamado.status !== "cancelado" && (
            <>
              <h3>Entrega dos remédios</h3>
              <ProgressoChamado chamado={chamado} />
              <AcompanhamentoRemedios chamado={chamado} linhaDoTempo onAbrirRemedio={(idRemedio) => abrirPerfil("remedio", idRemedio)} />
              {chamado.status === "em_andamento" && temSemFornecedor && (
                <TentarDeNovo chamado={chamado} idGerente={idGerente} onRedistribuido={onAtualizado} />
              )}
              {chamado.pedidos?.length > 0 && (
                <>
                  <h3>Histórico de pedidos à rede</h3>
                  <HistoricoPedidos pedidos={chamado.pedidos} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
