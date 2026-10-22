import { useCallback, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { DirectoryStats } from "../components/Directory";
import { ErroComRetry } from "../components/Chamados";
import CartaoChamado from "../components/CartaoChamado";
import Ferramentas from "../components/Ferramentas";
import { SkeletonTabela } from "../components/Skeleton";
import { usePerfil } from "../components/perfil/perfilContext";
import { INTERVALO_CHAMADOS, useFarmaciaDoFuncionario, usePolling } from "../hooks/useChamados";
import { listarChamadosFuncionario, listarEstoqueFarmacia, listarServicosDaFarmacia } from "../services/api";
import { INTERVALO_A_CAMINHO, temACaminho } from "../services/chamados";
import { primeiroNome } from "../services/nomes";

// Primeira aba do funcionário: as ferramentas do dia a dia (atender, pedir
// reposição, preparar pedidos) e os números da unidade, todos clicáveis.
export default function EmployeeOverview() {
  // os pedidos para preparar já aparecem no topo de todas as telas (PreparosFarmacia)
  const { nomeFuncionario = "Funcionário", unidade = "" } = useOutletContext() ?? {};
  const funcionario = useFarmaciaDoFuncionario();
  const { idFuncionario, idFarmacia } = funcionario;
  const { abrirPerfil } = usePerfil();
  const [hoje] = useState(() =>
    new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
  );

  const buscarChamados = useCallback(
    (options) => listarChamadosFuncionario(idFuncionario, "", options).then((data) => data.chamados ?? []),
    [idFuncionario],
  );
  const chamados = usePolling(buscarChamados, {
    enabled: Boolean(idFuncionario),
    interval: (lista) => (temACaminho(lista ?? []) ? INTERVALO_A_CAMINHO : INTERVALO_CHAMADOS),
  });
  const buscarEstoque = useCallback((options) => listarEstoqueFarmacia(idFarmacia, {}, options), [idFarmacia]);
  const estoque = usePolling(buscarEstoque, { enabled: Boolean(idFarmacia), interval: 0 });
  const buscarServicos = useCallback((options) => listarServicosDaFarmacia(idFarmacia, options), [idFarmacia]);
  const servicos = usePolling(buscarServicos, { enabled: Boolean(idFarmacia), interval: 0 });

  const meus = (chamados.data ?? []).filter((c) => String(c.funcionario?.idFuncionario) === String(idFuncionario));
  const pendentes = meus.filter((c) => c.status === "pendente").length;
  const resumo = estoque.data?.resumo;
  const atencao = resumo ? resumo.criticos + resumo.zerados + resumo.vencidos : null;
  const listaServicos = servicos.data ?? [];

  return (
    <>
      <header className="mgr-page-head">
        <div>
          <h1>Visão geral</h1>
          <p>{[unidade, primeiroNome(nomeFuncionario), hoje].filter(Boolean).join(" · ")}</p>
        </div>
      </header>

      <Ferramentas
        itens={[
          { to: "/funcionario/servicos?acao=novo-servico", icone: "clipboard", titulo: "Novo serviço", descricao: "Entregar remédio a um paciente" },
          { to: "/funcionario/chamados?acao=solicitar", icone: "ticket", titulo: "Pedir reposição", descricao: "Avisar o gerente do que falta" },
          { to: "/funcionario/pacientes", icone: "search", titulo: "Buscar paciente", descricao: "Cadastro e histórico" },
          { to: "/funcionario/remedios", icone: "pill", titulo: "Consultar estoque", descricao: "O que tem na unidade" },
        ]}
      />

      <DirectoryStats
        items={[
          ["Minhas solicitações", chamados.data ? meus.length : null, "ticket", "pedidos de reposição que você abriu", !chamados.data && chamados.loading, "/funcionario/chamados"],
          ["Aguardando o gerente", chamados.data ? pendentes : null, "clock", "solicitações pendentes", !chamados.data && chamados.loading, "/funcionario/chamados"],
          ["Itens com atenção", atencao, "alert", "críticos, zerados ou vencidos", !estoque.data && estoque.loading, "/funcionario/remedios"],
          ["Serviços da unidade", servicos.data ? listaServicos.length : null, "clipboard", "atendimentos registrados", !servicos.data && servicos.loading, "/funcionario/servicos"],
        ]}
      />

      <section className="mgr-panel" aria-labelledby="emp-visao-solicitacoes">
        <div className="mgr-panel-head">
          <div>
            <h2 id="emp-visao-solicitacoes">Minhas solicitações recentes</h2>
            <p>Acompanhe a resposta do gerente e a chegada dos remédios.</p>
          </div>
          <Link to="/funcionario/chamados">Ver todas →</Link>
        </div>
        {!idFuncionario && funcionario.loading ? (
          <SkeletonTabela rotulo="Carregando…" foto={false} />
        ) : chamados.loading && !chamados.data ? (
          <SkeletonTabela rotulo="Carregando solicitações…" foto={false} />
        ) : chamados.error && !chamados.data ? (
          <ErroComRetry message={chamados.error} onRetry={chamados.retry} />
        ) : meus.length ? (
          <ul className="chamado-list">
            {meus.slice(0, 4).map((c) => (
              <li key={c.idChamado}>
                <CartaoChamado chamado={c} onAbrir={(chamado, el) => abrirPerfil("chamado", chamado.idChamado, el)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mgr-empty">
            Nenhuma solicitação ainda. Quando faltar um remédio, use <Link to="/funcionario/chamados?acao=solicitar">Pedir reposição</Link>.
          </p>
        )}
      </section>
    </>
  );
}
