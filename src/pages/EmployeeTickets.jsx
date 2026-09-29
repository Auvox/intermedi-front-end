import { useCallback, useState } from "react";
import { DirectoryStats } from "../components/Directory";
import {
  CriticoBadge,
  ErroComRetry,
  PrioridadeBadge,
  RespostaChamado,
  SeletorPersona,
  StatusChamadoBadge,
} from "../components/Chamados";
import SolicitarReposicao from "../components/SolicitarReposicao";
import useApiList from "../hooks/useApiList";
import { useFuncionarioAtual, usePolling } from "../hooks/useChamados";
import { listarChamadosFuncionario, listarRemedios } from "../services/api";
import { STATUS_CHAMADO, formatarDataChamado } from "../services/chamados";

// "Minhas solicitações": chamados de reposição abertos pelo funcionário.
export default function EmployeeTickets() {
  const funcionario = useFuncionarioAtual();
  const { idFuncionario } = funcionario;
  const [status, setStatus] = useState("");
  const [solicitando, setSolicitando] = useState(false);
  const { items: medicines } = useApiList(listarRemedios);

  const fetcher = useCallback(
    (options) => listarChamadosFuncionario(idFuncionario, status, options).then((data) => data.chamados ?? []),
    [idFuncionario, status],
  );
  const { data, loading, error, reload, retry } = usePolling(fetcher, { enabled: Boolean(idFuncionario) });
  // Filtra também no cliente para não mostrar a lista anterior (outro status ou
  // outro funcionário) enquanto a nova chega
  const todos = (data ?? []).filter((c) => String(c.funcionario?.idFuncionario) === String(idFuncionario));
  const chamados = todos.filter((c) => !status || c.status === status);

  return (
    <>
      <header className="mgr-page-head mgr-page-head-featured">
        <div>
          <p className="mgr-eyebrow">ESPAÇO DO FUNCIONÁRIO</p>
          <h1>Minhas solicitações</h1>
          <p>Acompanhe os pedidos de reposição enviados ao gerente e veja a resposta.</p>
        </div>
        <button
          type="button"
          className="mgr-primary"
          disabled={!idFuncionario || !medicines.length}
          onClick={() => setSolicitando(true)}
        >
          Solicitar reposição
        </button>
      </header>

      {!idFuncionario ? (
        <section className="mgr-panel">
          {funcionario.loading ? (
            <p className="mgr-empty" role="status">Carregando funcionários…</p>
          ) : (
            <p className="mgr-empty" role="alert">
              {funcionario.error || "Nenhum funcionário cadastrado na API."}
            </p>
          )}
        </section>
      ) : (
        <>
          {!status && data && (
            <DirectoryStats
              items={[
                ["Solicitações", todos.length, "ticket"],
                ["Pendentes", todos.filter((c) => c.status === "pendente").length, "clock"],
                ["Respondidas", todos.filter((c) => c.resposta).length, "check"],
              ]}
            />
          )}
          <section className="mgr-panel" aria-labelledby="emp-chamados-title">
            <div className="mgr-toolbar">
              <h2 id="emp-chamados-title">Solicitações</h2>
              {!funcionario.temSessao && (
                <SeletorPersona
                  label="Funcionário"
                  value={idFuncionario}
                  onChange={funcionario.escolher}
                  options={funcionario.funcionarios.map((f) => [f.id, f.name])}
                />
              )}
              <label className="chamado-filter">
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Todos</option>
                  {Object.entries(STATUS_CHAMADO).map(([valor, { label }]) => (
                    <option key={valor} value={valor}>{label}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="directory-row-action" onClick={reload}>Atualizar</button>
            </div>
            {loading ? (
              <p className="mgr-empty" role="status">Carregando solicitações…</p>
            ) : error && !data ? (
              <ErroComRetry message={error} onRetry={retry} />
            ) : (
              <>
                {error && <p className="chamado-inline-error" role="alert">{error}</p>}
                {chamados.length ? (
                  <ul className="chamado-list">
                    {chamados.map((c) => (
                      <li key={c.idChamado}>
                        <article className="chamado-card" aria-labelledby={`chamado-${c.idChamado}`}>
                          <div className="chamado-card-head">
                            <h3 id={`chamado-${c.idChamado}`}>{c.titulo}</h3>
                            <div className="chamado-card-badges">
                              <PrioridadeBadge prioridade={c.prioridade} />
                              <StatusChamadoBadge status={c.status} />
                            </div>
                          </div>
                          <p className="chamado-card-meta">
                            #{c.idChamado} · {formatarDataChamado(c.dataAbertura)} · {c.farmacia?.nomeFarmacia}
                          </p>
                          <ul className="chamado-card-remedios" aria-label="Remédios solicitados">
                            {c.remedios.map((r) => (
                              <li key={r.idRemedio}>
                                <strong>{r.nomeRemedio}</strong>
                                {r.dosagemRemedio && ` ${r.dosagemRemedio}`} · {r.quantidadeSolicitada} un.
                                <small> (estoque {r.estoqueAtual})</small>
                                {r.critico && <CriticoBadge />}
                              </li>
                            ))}
                          </ul>
                          {c.descricao && <p className="chamado-card-desc">{c.descricao}</p>}
                          {c.resposta ? (
                            <RespostaChamado chamado={c} />
                          ) : (
                            c.status === "pendente" && (
                              <p className="chamado-aguardando">Aguardando resposta do gerente.</p>
                            )
                          )}
                        </article>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mgr-empty">
                    {status === "pendente"
                      ? "Nenhuma solicitação pendente."
                      : status
                        ? "Nenhuma solicitação com este status."
                        : "Você ainda não fez nenhuma solicitação."}
                  </p>
                )}
                <p className="mgr-table-note">
                  {chamados.length} solicitações · Atualiza automaticamente a cada 30 s
                </p>
              </>
            )}
          </section>
        </>
      )}

      {solicitando && (
        <SolicitarReposicao
          medicines={medicines}
          funcionario={funcionario}
          onClose={() => setSolicitando(false)}
          onSuccess={reload}
        />
      )}
    </>
  );
}
