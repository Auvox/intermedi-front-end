import PersonaAvatar from "../components/PersonaAvatar";
import { CartaoPessoa, DirectoryStats, GradePessoas, TeamTable } from "../components/Directory";
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
import { mascararCpf, propsLinha } from "../services/perfil";
import Ferramentas from "../components/Ferramentas";
import { definirContextoRastreio } from "../services/rastreioCliques";
import useAcaoDaUrl from "../hooks/useAcaoDaUrl";
import { useAoAlterarDados } from "../hooks/useResumo";
import ManagerIcon from "../components/ManagerIcon";
import { AccountControls } from "../components/ManagerAccess";
import { authRequest } from "../services/auth";
import useApiList from "../hooks/useApiList";
import {
  useChamadosGerente,
  useChamadosPendentes,
  usePedidosRecebidosPendentes,
  usePolling,
  useIdGerente,
  useToast,
} from "../hooks/useChamados";
import {
  ErroComRetry,
  PrioridadeBadge,
  SeletorPersona,
  StatusChamadoBadge,
  ToastRegion,
} from "../components/Chamados";
import { NotificacoesGerente } from "../components/ChamadosGerente";
import { EstoqueTabela } from "../components/Remedios";
import { SkeletonCartoes, SkeletonLinhas, SkeletonTabela } from "../components/Skeleton";
import { FaixaEmAndamento } from "../components/Rastreio";
import { useNotificacoesRastreio, usePedidosDoGerente } from "../hooks/useRastreio";
import { emAndamento } from "../services/rastreio";
import { ordenarEstoque } from "../services/remedios";
import {
  STATUS_CHAMADO,
  dataDoChamado,
  formatarDataChamado,
  resumoRemedios,
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
function Header({ title, description, action }) {
  return (
    <header className="mgr-page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
// items: [rótulo, valor, contexto, ícone, carregando, link]
function Stats({ items }) {
  return <DirectoryStats items={items.map(([label, value, hint, icon, loading, to]) => [label, value, icon, hint, loading, to])} />;
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
  // mapa de calor (aba Desempenho do admin): quem está usando
  useEffect(() => {
    definirContextoRastreio({ usuarioId: gerente.idGerente, farmaciaId: gerente.idFarmacia });
  }, [gerente.idGerente, gerente.idFarmacia]);
  // 8 s: a notificação de entrega lista os remédios e é mais longa
  const [toast, notify] = useToast(8000);
  const pendentes = useChamadosPendentes(gerente.idGerente, {
    onNovaSolicitacao: (chamado) =>
      notify(`Nova solicitação de ${chamado.funcionario?.nomeFuncionario || "funcionário"}`),
  });
  const pedidosRede = usePedidosRecebidosPendentes(gerente.idGerente, {
    onNovoPedido: (pedido) => notify(`Novo pedido da rede: ${pedido.mensagem}`),
  });
  // Rastreamento das entregas: o que a farmácia pediu (solicitante) e o que ela
  // está enviando (fornecedor). Cada marco da viagem vira notificação.
  const pedidosRastreio = usePedidosDoGerente(gerente.idGerente);
  const rastreio = useNotificacoesRastreio(pedidosRastreio.pedidos, {
    escopo: `gerente:${gerente.idGerente}`,
    pronto: pedidosRastreio.carregado,
    onNovos: (texto) => notify(texto),
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
          <NotificacoesGerente gerente={gerente} pendentes={pendentes} pedidos={pedidosRede} rastreio={rastreio} />
          <AccountControls
            user={
              user || { id: "", name: gerente.nome || "Gerente", email: "", role: "gerente" }
            }
          />
        </div>
        <PerfilProvider plataforma="gerente" gerenteAtual={{ id: gerente.idGerente, idFarmacia: gerente.idFarmacia }}>
        <main id="conteudo" tabIndex={-1} className={`mgr-main${location.pathname.replace(/\/$/, "") !== "/gerente" ? " directory-layout" : ""}`}>
          <Outlet
            context={{
              data,
              gerente,
              pendentes,
              pedidosRede,
              pedidosRastreio,
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
  const { user, gerente, pendentes, pedidosRede, pedidosRastreio } = useOutletContext();
  const { abrirPerfil } = usePerfil();
  // pedidos desta farmácia em andamento (os que ela precisa aceitar já têm o aviso abaixo)
  const emCurso = (pedidosRastreio?.pedidos ?? []).filter(
    (p) => emAndamento(p) && !(p.perspectiva === "fornecedor" && p.status === "solicitada"),
  );
  const buscarEstoque = useCallback(
    (options) => listarEstoqueGerente(gerente.idGerente, {}, options),
    [gerente.idGerente],
  );
  const estoque = usePolling(buscarEstoque, { enabled: Boolean(gerente.idGerente) });
  const resumo = estoque.data?.resumo;
  const atencao = resumo ? resumo.criticos + resumo.zerados + resumo.vencidos : null;
  const managerName = (gerente.temSessao ? user?.name : gerente.nome) || user?.name || "Gerente";
  const managerUnit = user?.unitName || unit;
  const [hoje] = useState(() =>
    new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
  );
  const pedidosPendentes = gerente.idGerente ? pedidosRede.totalPendentes : null;
  return (
    <>
      <Header
        title="Visão geral"
        description={`${managerUnit} · ${managerName} · ${hoje}`}
      />
      <FaixaEmAndamento
        pedidos={emCurso}
        onAbrirPedido={(p, el) => abrirPerfil("pedido", p.idRedistribuicao, el)}
      />
      <Ferramentas
        itens={[
          { to: "/gerente/chamados", icone: "ticket", titulo: "Responder chamados", descricao: "Pedidos de reposição da equipe", contador: pendentes.totalPendentes },
          { to: "/gerente/pedidos", icone: "truck", titulo: "Pedidos da rede", descricao: "Outras farmácias pedindo a você", contador: pedidosPendentes },
          { to: "/gerente/remedios?acao=adicionar", icone: "pill", titulo: "Adicionar ao estoque", descricao: "Um remédio do catálogo" },
          { to: "/gerente/funcionarios?acao=novo-funcionario", icone: "userPlus", titulo: "Novo funcionário", descricao: "Cadastrar na sua unidade" },
          { to: "/gerente/servicos", icone: "clipboard", titulo: "Serviços", descricao: "Atendimentos da unidade" },
          { to: "/gerente/operacao", icone: "cube", titulo: "Operação 3D", descricao: "A unidade em tempo real" },
        ]}
      />
      <Stats
        items={[
          [
            "Chamados pendentes",
            gerente.idGerente ? pendentes.totalPendentes : null,
            "aguardando sua resposta",
            "ticket",
            gerente.loading || pendentes.loading,
            "/gerente/chamados",
          ],
          [
            "Pedidos da rede",
            pedidosPendentes,
            "de outras farmácias para você",
            "truck",
            false,
            "/gerente/pedidos",
          ],
          [
            "Itens com atenção",
            atencao,
            "críticos, zerados ou vencidos",
            "alert",
            false,
            "/gerente/remedios",
          ],
          [
            "Itens no estoque",
            resumo?.totalItens ?? null,
            "remédios cadastrados na unidade",
            "pill",
            gerente.loading || (estoque.loading && !estoque.data),
            "/gerente/remedios",
          ],
        ]}
      />
      {pedidosPendentes > 0 && (
        <div className="mgr-insight chamado-insight-rede">
          <span className="mgr-insight-icon">
            <ManagerIcon name="truck" />
          </span>
          <div>
            <strong>
              {pedidosPendentes === 1
                ? "1 farmácia está pedindo um remédio do seu estoque"
                : `${pedidosPendentes} pedidos de outras farmácias aguardam sua resposta`}
            </strong>
            <p>Aceite ou recuse para a farmácia saber se pode contar com você.</p>
          </div>
          <Link to="/gerente/pedidos">Responder pedidos</Link>
        </div>
      )}
      {atencao > 0 && (
        <div className="mgr-insight">
          <span className="mgr-insight-icon">
            <ManagerIcon name="alert" />
          </span>
          <div>
            <strong>
              {atencao} {atencao === 1 ? "item do estoque precisa" : "itens do estoque precisam"} de atenção
            </strong>
            <p>Itens críticos, zerados ou vencidos aparecem primeiro na tabela abaixo.</p>
          </div>
          <Link to="/gerente/remedios">Ver estoque</Link>
        </div>
      )}
      <section className="mgr-panel">
        <div className="mgr-panel-head">
          <div>
            <h2>Chamados que precisam de você</h2>
            <p>Solicitações de reposição abertas pela sua equipe.</p>
          </div>
          <Link to="/gerente/chamados">Ver todos →</Link>
        </div>
        {gerente.loading || pendentes.loading ? (
          <SkeletonLinhas rotulo="Carregando chamados…" />
        ) : gerente.error ? (
          <ErroComRetry message={gerente.error} onRetry={gerente.retry} />
        ) : pendentes.error ? (
          <ErroComRetry message={pendentes.error} onRetry={pendentes.retry} />
        ) : (
          pendentes.pendentes.slice(0, 5).map((c) => (
            <div
              key={c.idChamado}
              {...propsLinha((el) => abrirPerfil("chamado", c.idChamado, el), `Abrir chamado: ${c.titulo}`)}
              className="mgr-ticket-line perfil-linha"
            >
              <PersonaAvatar className="mgr-avatar" role="funcionario" />
              <div>
                <strong>{c.titulo}</strong>
                <small>
                  {c.funcionario?.nomeFuncionario} · {tempoDesde(c.dataAbertura)}
                </small>
              </div>
              <PrioridadeBadge prioridade={c.prioridade} />
              <Link to={`/gerente/chamados?perfil=chamado:${c.idChamado}`}>
                Abrir chamado →
              </Link>
            </div>
          ))
        )}
        {!pendentes.loading && !gerente.loading && !gerente.error && !pendentes.error && !pendentes.pendentes.length && (
          <p className="mgr-empty">Nenhum chamado pendente. Pedidos novos da equipe aparecem aqui.</p>
        )}
      </section>
      <section className="mgr-panel">
        <div className="mgr-panel-head">
          <div>
            <h2>Estoque da farmácia</h2>
            <p>Os itens que mais precisam de atenção aparecem primeiro.</p>
          </div>
          <Link to="/gerente/remedios">Ver todos →</Link>
        </div>
        {gerente.loading || (gerente.idGerente && estoque.loading) ? (
          <SkeletonTabela rotulo="Carregando estoque…" />
        ) : !gerente.idGerente ? (
          <ErroComRetry
            message={gerente.error || "Selecione um gerente na barra superior para ver o estoque."}
            onRetry={gerente.error ? gerente.retry : undefined}
          />
        ) : estoque.error ? (
          <ErroComRetry message={estoque.error} onRetry={estoque.retry} />
        ) : estoque.data?.estoque?.length ? (
          <EstoqueTabela
            itens={ordenarEstoque(estoque.data.estoque).slice(0, 5)}
            onAbrir={(item, el) => abrirPerfil("remedio", item.idRemedio, el)}
          />
        ) : (
          <p className="mgr-empty">O estoque desta farmácia está vazio.</p>
        )}
        <p className="mgr-table-note">
          Crítico: quantidade no mínimo ou abaixo · Zerado: sem unidades · Lote vencido não pode ser entregue.
        </p>
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
  // atalho "Novo funcionário" da visão geral
  useAcaoDaUrl("novo-funcionario", useCallback(() => setAdding(true), []));
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

  // só para mostrar o nome da unidade no cadastro: o funcionário novo é
  // sempre da farmácia do gerente que o cadastra (o back confere pelo gerente)
  const [farmacias, setFarmacias] = useState([]);
  async function buscarFarmacias() {
    try {
      const lista = await listarFarmacias();
      setFarmacias(
        lista.map((farmacia) => ({
          id: String(farmacia.idFarmacia ?? farmacia.id),
          name: farmacia.nomeFarmacia ?? farmacia.name ?? farmacia.nome,
        })),
      );
    } catch {
      setFarmacias([]);
    }
  }
  const nomeDaUnidade =
    farmacias.find((farmacia) => farmacia.id === String(gerente.idFarmacia))?.name;

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
        await buscarFarmacias(); // nome da unidade no formulário de cadastro
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
      // o back usa a farmácia deste gerente
      idGerenteCadastro: gerente.idGerente,
      fkIdFarmacia: gerente.idFarmacia,
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
      const listaAtualizada = await buscarFuncionarios(gerente.idFarmacia ?? "");
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
          <button data-track="novo-funcionario"
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
            carregandoFuncionarios,
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
        {carregandoFuncionarios ? (
          <SkeletonCartoes rotulo="Carregando funcionários…" />
        ) : (
          <TeamTable
            employees={employees}
            onAbrir={(employee, el) => abrirPerfil("funcionario", employee.id, el)}
            onExcluir={(employee) => { setSelected(employee); setPeriod(""); setConfirmDelete(true); }}
          />
        )}
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
            <p className="mgr-form-unidade">
              O funcionário vai entrar na sua farmácia:{" "}
              <strong>{nomeDaUnidade || "a unidade do gerente selecionado"}</strong>
            </p>
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
              disabled={cadastrando || !gerente.idGerente}
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
          ["Pacientes cadastrados", patients.length, "Total na rede", "heart", loading],
          ["Resultados da busca", filtered.length, "Conforme os filtros", "check", loading],
          [
            "Com remédio frequente",
            patients.filter((p) => p.frequentMedicine).length,
            "Uso contínuo informado",
            "pill",
            loading,
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
          <SkeletonCartoes rotulo="Carregando pacientes…" />
        ) : error ? (
          <p className="mgr-empty" role="alert">{error}</p>
        ) : (
          <>
            <GradePessoas rotulo="Pacientes">
              {filtered.map((p) => (
                <li key={p.id}>
                  <CartaoPessoa
                    role="paciente"
                    nome={p.name}
                    foto={p.photo}
                    papel={p.frequentMedicine ? `Usa ${p.frequentMedicine}` : "Paciente"}
                    linhas={[
                      ["id", p.cpf && `CPF ${mascararCpf(p.cpf)}`],
                      ["phone", p.phone],
                      ["map", [p.city, p.state].filter(Boolean).join(" / ")],
                      ["mail", p.email],
                    ]}
                    onAbrir={(el) => abrirPerfil("paciente", p.id, el)}
                  />
                </li>
              ))}
            </GradePessoas>
            {!filtered.length && <Empty />}
          </>
        )}
        <p className="mgr-table-note" role="status">
          {filtered.length} de {patients.length} pacientes
        </p>
      </section>
    </>
  );
}
export function ManagerTickets() {
  const { gerente, pendentes } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { chamados, carregado, loading, error, reload, retry } = useChamadosGerente(gerente.idGerente);
  const { abrirPerfil } = usePerfil();

  // Chegou solicitação nova no sininho: atualiza a lista também
  const { totalPendentes, reload: reloadPendentes } = pendentes;
  useEffect(() => {
    if (carregado) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPendentes]);

  // Link antigo (?chamado=ID, ex.: favoritos): abre o relatório do chamado
  const idAntigo = params.get("chamado");
  useEffect(() => {
    if (!idAntigo) return;
    const next = new URLSearchParams(params);
    next.delete("chamado");
    next.set("perfil", `chamado:${idAntigo}`);
    setParams(next, { replace: true });
  }, [idAntigo, params, setParams]);
  // Respondeu ou pediu de novo no relatório: atualiza a lista e o sininho
  useAoAlterarDados((detalhe) => {
    if (detalhe?.tipo !== "chamado") return;
    reload();
    reloadPendentes();
  });
  const contar = (valor) => chamados.filter((c) => c.status === valor).length;
  const termo = normalizeText(search.trim());
  const tickets = chamados.filter(
    (c) =>
      (!status || c.status === status) &&
      normalizeText(
        `${c.idChamado} ${c.titulo} ${c.funcionario?.nomeFuncionario} ${resumoRemedios(c.remedios)}`,
      ).includes(termo),
  );

  const abrir = (idChamado, elemento) => abrirPerfil("chamado", idChamado, elemento);
  const header = (
    <Header
      title="Chamados"
      description="Aceite ou recuse os pedidos de reposição da sua equipe."
    />
  );
  if (gerente.loading) {
    return <>{header}<section className="mgr-panel"><SkeletonTabela rotulo="Carregando chamados…" foto={false} /></section></>;
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
          <SkeletonTabela rotulo="Carregando chamados…" foto={false} />
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
                    {...propsLinha((el) => abrir(c.idChamado, el), `Abrir chamado #${c.idChamado}`)}
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
                        onClick={(e) => abrir(c.idChamado, e.currentTarget)}
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
    </>
  );
}

