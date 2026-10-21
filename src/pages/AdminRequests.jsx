import { useCallback, useEffect, useMemo, useState } from "react";
import { ErroComRetry, PrioridadeBadge, StatusChamadoBadge } from "../components/Chamados";
import { DirectoryStats } from "../components/Directory";
import { usePerfil } from "../components/perfil/perfilContext";
import { listarChamadosGerente, listarGerentes, normalizeText } from "../services/api";
import { STATUS_CHAMADO, formatarDataChamado, tempoDesde } from "../services/chamados";
import { propsLinha } from "../services/perfil";

/*
 * Solicitações de reposição de toda a rede, só para consulta.
 * Não há endpoint geral de chamados: junta GET /gerente/:id/chamados de cada
 * gerente (sem repetir quando a farmácia tem mais de um gerente).
 */
function useChamadosDaRede() {
  const [estado, setEstado] = useState({ chamados: [], loading: true, error: "" });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) setEstado((atual) => ({ ...atual, loading: true, error: "" }));
        return listarGerentes(options);
      })
      .then((gerentes) =>
        Promise.all(gerentes.map((g) => listarChamadosGerente(g.idGerente, "", options).then((d) => d.chamados ?? []))),
      )
      .then((listas) => {
        if (controller.signal.aborted) return;
        const porId = new Map();
        for (const chamado of listas.flat()) porId.set(chamado.idChamado, chamado);
        const chamados = [...porId.values()].sort((a, b) => String(b.dataAbertura).localeCompare(String(a.dataAbertura)));
        setEstado({ chamados, loading: false, error: "" });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setEstado({ chamados: [], loading: false, error: error.message || "Erro ao consultar a API." });
      });
    return () => controller.abort();
  }, [versao]);

  const retry = useCallback(() => setVersao((v) => v + 1), []);
  return { ...estado, retry };
}

const POR_PAGINA = 12;

export default function AdminRequests() {
  useEffect(() => {
    document.title = "Solicitações | Intermedi";
  }, []);
  const { abrirPerfil } = usePerfil();
  const { chamados, loading, error, retry } = useChamadosDaRede();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [farmacia, setFarmacia] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);

  const farmacias = useMemo(
    () => [...new Set(chamados.map((c) => c.farmacia?.nomeFarmacia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [chamados],
  );
  const termo = normalizeText(busca.trim());
  const filtrados = chamados.filter(
    (c) =>
      (!status || c.status === status) &&
      (!farmacia || c.farmacia?.nomeFarmacia === farmacia) &&
      (!termo ||
        normalizeText(
          `${c.titulo} #${c.idChamado} ${c.funcionario?.nomeFuncionario ?? ""} ${c.farmacia?.nomeFarmacia ?? ""} ${(c.remedios ?? []).map((r) => r.nomeRemedio).join(" ")}`,
        ).includes(termo)),
  );
  const conta = (s) => chamados.filter((c) => c.status === s).length;
  const filtrar = (setter) => (event) => {
    setter(event.target.value);
    setLimite(POR_PAGINA);
  };

  return (
    <>
      <header className="mgr-page-head">
        <div>
          <h1>Solicitações</h1>
          <p>Pedidos de reposição abertos pelas equipes das farmácias. Quem responde é o gerente de cada farmácia.</p>
        </div>
      </header>

      <DirectoryStats
        items={[
          ["Pendentes", loading ? null : conta("pendente"), "clock", "aguardando o gerente"],
          ["Em andamento", loading ? null : conta("em_andamento") + conta("aceito"), "truck", "pedidos à rede a caminho"],
          ["Resolvidos", loading ? null : conta("resolvido"), "check", "remédio recebido"],
          ["Recusados", loading ? null : conta("recusado"), "alert", "recusados pelo gerente"],
        ]}
      />

      <section className="mgr-panel" aria-labelledby="adm-solicitacoes-titulo">
        <div className="mgr-toolbar">
          <h2 id="adm-solicitacoes-titulo" className="sr-only">Lista de solicitações</h2>
          <input
            type="search"
            aria-label="Buscar solicitação"
            placeholder="Buscar assunto, remédio, funcionário ou farmácia…"
            value={busca}
            onChange={filtrar(setBusca)}
          />
          <select aria-label="Filtrar por farmácia" value={farmacia} onChange={filtrar(setFarmacia)}>
            <option value="">Todas as farmácias</option>
            {farmacias.map((nome) => (
              <option key={nome}>{nome}</option>
            ))}
          </select>
          <select aria-label="Filtrar por situação" value={status} onChange={filtrar(setStatus)}>
            <option value="">Todas as situações</option>
            {Object.entries(STATUS_CHAMADO).map(([valor, { label }]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="mgr-empty" role="status">Carregando solicitações…</p>
        ) : error ? (
          <ErroComRetry message={error} onRetry={retry} />
        ) : filtrados.length ? (
          <div className="mgr-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Solicitação</th>
                  <th scope="col">Farmácia</th>
                  <th scope="col">Solicitante</th>
                  <th scope="col">Aberta em</th>
                  <th scope="col">Prioridade</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, limite).map((c) => (
                  <tr
                    key={c.idChamado}
                    {...propsLinha((el) => abrirPerfil("chamado", c.idChamado, el), `Abrir solicitação #${c.idChamado}`)}
                  >
                    <td>
                      <strong>{c.titulo}</strong>
                      <small>
                        #{c.idChamado}
                        {c.remedios?.length
                          ? ` · ${c.remedios.map((r) => `${r.nomeRemedio} (${r.quantidadeSolicitada})`).join(", ")}`
                          : ""}
                      </small>
                    </td>
                    <td>{c.farmacia?.nomeFarmacia ?? "—"}</td>
                    <td>
                      {c.funcionario?.nomeFuncionario ?? "—"}
                      {c.funcionario?.cargoFuncionario && <small>{c.funcionario.cargoFuncionario}</small>}
                    </td>
                    <td>
                      {formatarDataChamado(c.dataAbertura)}
                      <small>{tempoDesde(c.dataAbertura)}</small>
                    </td>
                    <td><PrioridadeBadge prioridade={c.prioridade} /></td>
                    <td><StatusChamadoBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mgr-empty">
            {chamados.length ? "Nenhuma solicitação com esses filtros." : "Nenhuma solicitação aberta na rede ainda."}
          </p>
        )}

        {!loading && !error && (
          <div className="adm-pagination">
            <p className="mgr-table-note" role="status">
              {Math.min(limite, filtrados.length)} de {filtrados.length} solicitações · clique em uma linha para ver os detalhes
            </p>
            {filtrados.length > limite && (
              <button type="button" className="mgr-secondary" onClick={() => setLimite((n) => n + POR_PAGINA)}>
                Mostrar mais
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
