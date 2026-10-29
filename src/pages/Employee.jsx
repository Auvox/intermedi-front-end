import PersonaAvatar from "../components/PersonaAvatar";
import { CartaoPessoa, GradePessoas } from "../components/Directory";
import { useEffect, useState } from "react";
import { Link, Outlet, useOutletContext } from "react-router-dom";
import ManagerSidebar from "../components/ManagerSidebar";
import PerfilProvider from "../components/perfil/PerfilProvider";
import { usePerfil } from "../components/perfil/perfilContext";
import { unit } from "./managerData";
import useApiList from "../hooks/useApiList";
import {
  fotoPessoa,
  listarFuncionarios,
  listarFarmacias,
  listarPacientes,
  normalizePaciente,
} from "../services/api";
import { readEmployeeSession } from "../services/employeeSession";
import { primeiroNome } from "../services/nomes";
import { useAoAlterarDados } from "../hooks/useResumo";
import { sairDaConta, usePresenca } from "../services/presenca";
import BoasVindas from "../components/BoasVindas";
import { definirContextoRastreio } from "../services/rastreioCliques";
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
  // mapa de calor (aba Desempenho do admin): quem está usando
  useEffect(() => {
    definirContextoRastreio({ usuarioId: funcionario.idFuncionario, farmaciaId: funcionario.idFarmacia });
  }, [funcionario.idFuncionario, funcionario.idFarmacia]);

  // Sem sessão (login das personas ainda não existe), o funcionário é escolhido
  // no seletor do topo, como o gerente; o nome e a farmácia acompanham a escolha.
  const { items: farmacias } = useApiList(listarFarmacias);
  const nomeDaFarmacia = new Map(farmacias.map((f) => [String(f.idFarmacia ?? f.id), f.nomeFarmacia ?? f.nome]));
  const escolhido = funcionario.funcionarios.find((f) => f.id === funcionario.idFuncionario);
  const employeeName = session?.name || escolhido?.name || "Funcionário";
  // nos painéis a pessoa aparece só pelo primeiro nome
  const employeeFirstName = primeiroNome(employeeName, "Funcionário");
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
  // tempo logado: avisa o back a cada minuto enquanto o funcionário está aqui
  usePresenca(Boolean(session?.id));


  useEffect(() => {
    document.title = "Área do funcionário | Intermedi";
    return () => {
      document.title = "Intermedi";
    };
  }, []);

  return (
    <div className="mgr-shell emp-shell">
      {session?.id && (
        <BoasVindas
          papel="funcionario"
          pessoa={{ id: session.id, nome: session.name }}
          farmacia={{ id: session.farmaciasId, nome: session.unitName }}
        />
      )}
      <ManagerSidebar employee unitName={employeeUnit} />
      <PerfilProvider plataforma="funcionario" idFarmacia={funcionario.idFarmacia} idFuncionarioAtual={funcionario.idFuncionario}>
      <div className="mgr-workspace">
        <div className="mgr-topbar">
          <span>
            <span className="mgr-topbar-unit-prefix">Olá, {employeeFirstName}</span>{" "}
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
          <ContaFuncionario idFuncionario={funcionario.idFuncionario} nome={employeeFirstName} unidade={employeeUnit} />
        </div>
          <main id="conteudo" tabIndex={-1} className="mgr-main directory-layout">
            <PreparosFarmacia preparos={preparos} idFuncionario={funcionario.idFuncionario} onAviso={notify} />
            <Outlet
              context={{
                chamadosDoFuncionario: fonteRastreio.chamados,
                idFarmacia: funcionario.idFarmacia,
                // visão geral
                nomeFuncionario: employeeFirstName,
                unidade: employeeUnit,
              }}
            />
          </main>
        <footer className="mgr-footer">
          Intermedi <span>Conectando farmácias. Aproximando o cuidado.</span>
        </footer>
      </div>
      </PerfilProvider>
      <ToastRegion message={toast} />
    </div>
  );
}


// Conta no topo: abre o perfil completo do funcionário (com a foto, que ele
// mesmo pode trocar) e mostra a foto atual.
function ContaFuncionario({ idFuncionario, nome, unidade }) {
  const { abrirPerfil } = usePerfil();
  const [foto, setFoto] = useState(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!idFuncionario) return undefined;
    const controller = new AbortController();
    listarFuncionarios({ signal: controller.signal })
      .then((lista) => {
        const eu = lista.find((f) => String(f.idFuncionario) === String(idFuncionario));
        setFoto(fotoPessoa(eu?.fotoFuncionario));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [idFuncionario, versao]);

  // trocou a foto no perfil: atualiza o avatar do topo
  useAoAlterarDados((evento) => {
    if (evento?.tipo === "funcionario" && String(evento.id) === String(idFuncionario)) setVersao((v) => v + 1);
  });

  return (
    <div className="mgr-account emp-account">
      <button
        type="button"
        className="mgr-account-button"
        aria-label="Abrir meu perfil"
        disabled={!idFuncionario}
        onClick={(event) => abrirPerfil("funcionario", idFuncionario, event.currentTarget)}
      >
        <PersonaAvatar className="mgr-account-avatar" role="funcionario" photo={foto} />
        <span className="mgr-account-person">
          <strong>{nome}</strong>
          <small>Funcionário da unidade · {unidade}</small>
        </span>
      </button>
      <Link className="account-action account-exit" to="/login?perfil=funcionario" onClick={sairDaConta}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" /></svg>
        Sair
      </Link>
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
