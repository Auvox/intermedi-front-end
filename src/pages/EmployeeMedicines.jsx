import { useCallback, useState } from "react";
import { ErroComRetry, SeletorPersona } from "../components/Chamados";
import { EstoqueTabela, ResumoEstoque } from "../components/Remedios";
import SolicitarReposicao from "../components/SolicitarReposicao";
import { usePerfil } from "../components/perfil/perfilContext";
import useApiList from "../hooks/useApiList";
import { useFarmaciaDoFuncionario, usePolling } from "../hooks/useChamados";
import useDebounce from "../hooks/useDebounce";
import { listarEstoqueFarmacia, listarRemedios } from "../services/api";
import { ordenarEstoque, precisaReposicao, reposicaoDoEstoque } from "../services/remedios";
import "../styles/employeeMedicines.css";

const FILTROS_SITUACAO = [
  ["", "Todas as situações"],
  ["ok", "Em estoque"],
  ["critico", "Críticos"],
  ["zerado", "Zerados"],
  ["vencido", "Lote vencido"],
];

// Estoque da farmácia onde o funcionário trabalha (somente consulta)
export default function EmployeeMedicines() {
  const funcionario = useFarmaciaDoFuncionario();
  const { abrirPerfil } = usePerfil();
  const { idFarmacia } = funcionario;
  const { items: catalogo } = useApiList(listarRemedios);
  const [busca, setBusca] = useState("");
  const [situacaoFiltro, setSituacaoFiltro] = useState("");
  const buscaDebounced = useDebounce(busca.trim(), 300);
  // null = fechado; {} = pedido em branco; { itensIniciais, prioridadeInicial } = preenchido
  const [reposicao, setReposicao] = useState(null);

  const fetcher = useCallback(
    (options) => listarEstoqueFarmacia(idFarmacia, { busca: buscaDebounced, situacao: situacaoFiltro }, options),
    [idFarmacia, buscaDebounced, situacaoFiltro],
  );
  const { data, loading, error, reload, retry } = usePolling(fetcher, { enabled: Boolean(idFarmacia) });
  const itens = ordenarEstoque(data?.estoque ?? []);

  return (
    <>
      <header className="mgr-page-head mgr-page-head-featured">
        <div>
          <p className="mgr-eyebrow">ESPAÇO DO FUNCIONÁRIO</p>
          <h1>Remédios</h1>
          <p>
            Estoque {data?.farmacia?.nomeFarmacia ? `da ${data.farmacia.nomeFarmacia}` : "da sua farmácia"}.
            Estoque baixo? Solicite reposição ao gerente.
          </p>
        </div>
        <button
          type="button"
          className="mgr-primary"
          disabled={!funcionario.idFuncionario || !catalogo.length}
          onClick={() => setReposicao({})}
        >
          Solicitar reposição
        </button>
      </header>

      {!idFarmacia ? (
        <section className="mgr-panel">
          {funcionario.loading ? (
            <p className="mgr-empty" role="status">Carregando funcionário…</p>
          ) : (
            <p className="mgr-empty" role="alert">
              {funcionario.error || "Não foi possível identificar a farmácia deste funcionário."}
            </p>
          )}
        </section>
      ) : (
        <>
          <ResumoEstoque resumo={data?.resumo} filtro={situacaoFiltro} onFiltrar={setSituacaoFiltro} />
          <section className="mgr-panel" aria-label="Estoque da farmácia">
            <div className="mgr-toolbar">
              <input
                type="search"
                aria-label="Buscar remédio no estoque"
                placeholder="Buscar remédio…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <select aria-label="Filtrar por situação" value={situacaoFiltro} onChange={(e) => setSituacaoFiltro(e.target.value)}>
                {FILTROS_SITUACAO.map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
              </select>
              {!funcionario.temSessao && (
                <SeletorPersona
                  label="Funcionário"
                  value={funcionario.idFuncionario ?? ""}
                  onChange={funcionario.escolher}
                  options={funcionario.funcionarios.map((f) => [f.id, f.name])}
                />
              )}
              <button type="button" className="directory-row-action" onClick={reload}>Atualizar</button>
            </div>
            {loading ? (
              <p className="mgr-empty" role="status">Carregando estoque…</p>
            ) : error && !data ? (
              <ErroComRetry message={error} onRetry={retry} />
            ) : itens.length ? (
              <EstoqueTabela
                itens={itens}
                onAbrir={(item, el) => abrirPerfil("remedio", item.idRemedio, el)}
                acoes={(item) =>
                  precisaReposicao(item) ? (
                    <button
                      type="button"
                      className="directory-row-action"
                      aria-label={`Solicitar reposição de ${item.nomeRemedio}`}
                      onClick={() => setReposicao(reposicaoDoEstoque([item]))}
                    >
                      Solicitar reposição
                    </button>
                  ) : (
                    <span className="remedio-obrigatorio-nota">—</span>
                  )
                }
              />
            ) : (
              <p className="mgr-empty">
                {busca || situacaoFiltro ? "Nenhum remédio do estoque corresponde a estes filtros." : "O estoque desta farmácia está vazio."}
              </p>
            )}
            {data && (
              <p className="mgr-table-note" role="status">
                {itens.length} {itens.length === 1 ? "item" : "itens"} · Somente consulta · Lote vencido não pode ser entregue.
              </p>
            )}
          </section>
        </>
      )}

      {reposicao && (
        <SolicitarReposicao
          medicines={catalogo}
          funcionario={funcionario}
          itensIniciais={reposicao.itensIniciais}
          prioridadeInicial={reposicao.prioridadeInicial}
          onClose={() => setReposicao(null)}
        />
      )}
    </>
  );
}
