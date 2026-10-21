import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ManagerIcon from "../components/ManagerIcon";
import { DirectoryStats } from "../components/Directory";
import { ErroComRetry } from "../components/Chamados";
import { usePerfil } from "../components/perfil/perfilContext";
import useApiList from "../hooks/useApiList";
import { listarFarmacias, listarPacientes, listarRemedios, resumoFarmacia } from "../services/api";
import { PERIODOS, numero, propsLinha } from "../services/perfil";
import Ferramentas from "../components/Ferramentas";
import "../styles/adminDashboard.css";

/*
 * Visão geral da rede para o admin. Tudo vem da API:
 * GET /farmacia + GET /farmacia/:id/resumo?periodo=… (um por unidade),
 * GET /paciente e GET /remedios para os totais da plataforma.
 */

const ROTULO_STATUS = [
  ["pendente", "Pendentes"],
  ["em_andamento", "Em andamento"],
  ["aceito", "Aceitos"],
  ["resolvido", "Resolvidos"],
  ["recusado", "Recusados"],
  ["cancelado", "Cancelados"],
];

function useRede(periodo) {
  const [estado, setEstado] = useState({ unidades: [], loading: true, error: "" });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    // setState só depois de uma promessa (nada síncrono no effect)
    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) setEstado((atual) => ({ ...atual, loading: true, error: "" }));
        return listarFarmacias(options);
      })
      .then((farmacias) =>
        Promise.all(
          farmacias.map((farmacia) =>
            resumoFarmacia(farmacia.idFarmacia, { periodo }, options)
              .then((resumo) => ({ farmacia, resumo, erro: "" }))
              .catch((error) => {
                if (controller.signal.aborted) throw error;
                return { farmacia, resumo: null, erro: error.message };
              }),
          ),
        ),
      )
      .then((unidades) => {
        if (!controller.signal.aborted) setEstado({ unidades, loading: false, error: "" });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setEstado({ unidades: [], loading: false, error: error.message || "Erro ao consultar a API." });
      });
    return () => controller.abort();
  }, [periodo, versao]);

  const retry = useCallback(() => setVersao((v) => v + 1), []);
  return { ...estado, retry };
}

const atencaoDe = (r) => (r ? r.estoque.criticos + r.estoque.zerados + r.estoque.vencidos : 0);
const abertosDe = (r) => (r ? (r.chamados.porStatus.pendente ?? 0) + (r.chamados.porStatus.em_andamento ?? 0) : 0);

// Soma os números de todas as unidades
function consolidar(unidades) {
  const total = {
    atencao: 0,
    unidadesComAtencao: 0,
    abertos: 0,
    atendimentos: 0,
    pacientesAtendidos: 0,
    funcionarios: 0,
    pedidos: 0,
    pedidosEntregues: 0,
    porStatus: {},
    remedios: new Map(),
  };
  for (const { resumo: r } of unidades) {
    if (!r) continue;
    const atencao = atencaoDe(r);
    total.atencao += atencao;
    if (atencao > 0) total.unidadesComAtencao += 1;
    total.abertos += abertosDe(r);
    total.atendimentos += r.servicos.total;
    total.pacientesAtendidos += r.servicos.pacientesAtendidos;
    total.funcionarios += r.funcionarios.total;
    total.pedidos += r.rede.comoSolicitante.total;
    total.pedidosEntregues += r.rede.comoSolicitante.entregues;
    for (const [status, n] of Object.entries(r.chamados.porStatus)) {
      total.porStatus[status] = (total.porStatus[status] ?? 0) + n;
    }
    for (const item of r.servicos.topRemedios) {
      const atual = total.remedios.get(item.idRemedio) ?? { ...item, quantidade: 0, atendimentos: 0 };
      atual.quantidade += item.quantidade;
      atual.atendimentos += item.atendimentos;
      total.remedios.set(item.idRemedio, atual);
    }
  }
  return total;
}

function EstoqueCelula({ resumo }) {
  if (!resumo) return <span className="adm-dash-muted">—</span>;
  const { criticos, zerados, vencidos, totalItens } = resumo.estoque;
  const partes = [
    criticos && `${criticos} ${criticos === 1 ? "crítico" : "críticos"}`,
    zerados && `${zerados} ${zerados === 1 ? "zerado" : "zerados"}`,
    vencidos && `${vencidos} ${vencidos === 1 ? "vencido" : "vencidos"}`,
  ].filter(Boolean);
  return (
    <div className="adm-dash-estoque">
      <span>{numero(totalItens)} itens</span>
      {partes.length ? (
        <span className="mgr-badge yellow">{partes.join(" · ")}</span>
      ) : (
        <span className="mgr-badge green">Em dia</span>
      )}
    </div>
  );
}

function LinhasCarregando({ colunas }) {
  return Array.from({ length: 3 }, (_, i) => (
    <tr key={i} aria-hidden="true">
      {Array.from({ length: colunas }, (_, j) => (
        <td key={j}><span className="adm-dash-skeleton" /></td>
      ))}
    </tr>
  ));
}

export default function AdminDashboard() {
  useEffect(() => {
    document.title = "Visão geral | Intermedi";
  }, []);

  const { abrirPerfil } = usePerfil();
  const [periodo, setPeriodo] = useState("30d");
  const rede = useRede(periodo);
  const pacientes = useApiList(listarPacientes);
  const catalogo = useApiList(listarRemedios);

  const total = useMemo(() => consolidar(rede.unidades), [rede.unidades]);
  // unidades que precisam de atenção primeiro
  const unidades = useMemo(
    () =>
      [...rede.unidades].sort(
        (a, b) =>
          atencaoDe(b.resumo) - atencaoDe(a.resumo) ||
          abertosDe(b.resumo) - abertosDe(a.resumo) ||
          String(a.farmacia.nomeFarmacia).localeCompare(String(b.farmacia.nomeFarmacia), "pt-BR"),
      ),
    [rede.unidades],
  );
  const rotuloPeriodo = (PERIODOS.find(([valor]) => valor === periodo)?.[1] ?? "").toLowerCase();
  const noPeriodo = periodo === "tudo" ? "desde o início" : `nos últimos ${rotuloPeriodo}`;
  const carregando = rede.loading && !rede.unidades.length;
  const maisEntregues = [...total.remedios.values()].sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  const totalChamados = Object.values(total.porStatus).reduce((s, n) => s + n, 0);

  return (
    <div className={`adm-dash${rede.loading && rede.unidades.length ? " is-atualizando" : ""}`}>
      <header className="mgr-page-head">
        <div>
          <h1>Visão geral da rede</h1>
          <p>
            {carregando
              ? "Carregando dados das unidades…"
              : `${rede.unidades.length} ${rede.unidades.length === 1 ? "unidade" : "unidades"} · ${numero(pacientes.items.length)} pacientes · ${numero(catalogo.items.length)} medicamentos no catálogo`}
          </p>
        </div>
        <label className="adm-dash-periodo">
          <span>Período</span>
          <select value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
            {PERIODOS.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {valor === "tudo" ? "Desde o início" : `Últimos ${rotulo}`}
              </option>
            ))}
          </select>
        </label>
      </header>

      {rede.error ? (
        <section className="mgr-panel">
          <ErroComRetry message={rede.error} onRetry={rede.retry} />
        </section>
      ) : (
        <>
          <Ferramentas
            itens={[
              { to: "/admin/gerentes?acao=cadastrar", icone: "userPlus", titulo: "Cadastrar gerente", descricao: "Para uma unidade da rede" },
              { to: "/admin/farmacias?acao=cadastrar", icone: "pharmacy", titulo: "Cadastrar farmácia", descricao: "Uma nova unidade na rede" },
              { to: "/admin/medicamentos?acao=cadastrar", icone: "pill", titulo: "Cadastrar medicamento", descricao: "No catálogo da rede" },
              { to: "/admin/chamados", icone: "ticket", titulo: "Solicitações", descricao: "Chamados de todas as unidades", contador: carregando ? 0 : total.abertos },
              { to: "/admin/pacientes", icone: "heart", titulo: "Pacientes", descricao: "Buscar e consultar cadastros" },
            ]}
          />
          <DirectoryStats
            items={[
              ["Itens com atenção", carregando ? null : total.atencao, "alert",
                carregando ? undefined : total.unidadesComAtencao
                  ? `em ${total.unidadesComAtencao} ${total.unidadesComAtencao === 1 ? "unidade" : "unidades"}`
                  : "nenhum crítico, zerado ou vencido", false, "/admin/farmacias"],
              ["Chamados abertos", carregando ? null : total.abertos, "ticket", "pendentes ou em andamento", false, "/admin/chamados"],
              ["Atendimentos", carregando ? null : numero(total.atendimentos), "heart",
                carregando ? undefined : `${numero(total.pacientesAtendidos)} pacientes ${noPeriodo}`, false, "/admin/pacientes"],
              ["Pedidos entre farmácias", carregando ? null : total.pedidos, "truck",
                carregando ? undefined : `${total.pedidosEntregues} entregues ${noPeriodo}`, false, "/admin/chamados"],
            ]}
          />

          {total.unidadesComAtencao > 0 && (
            <div className="mgr-insight">
              <span className="mgr-insight-icon">
                <ManagerIcon name="alert" />
              </span>
              <div>
                <strong>
                  {total.unidadesComAtencao === 1
                    ? "1 unidade tem itens críticos, zerados ou vencidos"
                    : `${total.unidadesComAtencao} unidades têm itens críticos, zerados ou vencidos`}
                </strong>
                <p>Elas aparecem primeiro na tabela. Abra a unidade para ver quais remédios.</p>
              </div>
            </div>
          )}

          <section className="mgr-panel" aria-labelledby="adm-dash-unidades">
            <div className="mgr-panel-head">
              <div>
                <h2 id="adm-dash-unidades">Unidades</h2>
                <p>Estoque agora; chamados, atendimentos e pedidos {noPeriodo}.</p>
              </div>
              <Link to="/admin/farmacias">Ver farmácias →</Link>
            </div>
            <div className="mgr-table-wrap">
              <table className="adm-dash-tabela">
                <thead>
                  <tr>
                    <th scope="col">Unidade</th>
                    <th scope="col">Gerente</th>
                    <th scope="col" className="is-num">Equipe</th>
                    <th scope="col">Estoque</th>
                    <th scope="col" className="is-num">Chamados abertos</th>
                    <th scope="col" className="is-num">Atendimentos</th>
                    <th scope="col">Rede</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <LinhasCarregando colunas={7} />
                  ) : (
                    unidades.map(({ farmacia: f, resumo: r, erro }) => (
                      <tr
                        key={f.idFarmacia}
                        {...propsLinha((el) => abrirPerfil("farmacia", f.idFarmacia, el), `Abrir unidade ${f.nomeFarmacia}`)}
                      >
                        <td>
                          <button
                            type="button"
                            className="adm-dash-unidade"
                            onClick={(event) => abrirPerfil("farmacia", f.idFarmacia, event.currentTarget)}
                          >
                            {f.nomeFarmacia}
                          </button>
                          <small>{[f.bairroFarmacia, f.cidadeFarmacia, f.ufFarmacia].filter(Boolean).join(" · ")}</small>
                        </td>
                        {erro ? (
                          <td colSpan={6} className="adm-dash-erro">Não foi possível carregar os números desta unidade.</td>
                        ) : (
                          <>
                            <td>
                              {r.gerentes.length ? (
                                <>
                                  {r.gerentes[0].nomeGerente}
                                  {r.gerentes.length > 1 && <small>+{r.gerentes.length - 1} {r.gerentes.length === 2 ? "gerente" : "gerentes"}</small>}
                                </>
                              ) : (
                                <span className="mgr-badge red">Sem gerente</span>
                              )}
                            </td>
                            <td className="is-num">{r.funcionarios.total}</td>
                            <td><EstoqueCelula resumo={r} /></td>
                            <td className="is-num">
                              {abertosDe(r) ? <strong>{abertosDe(r)}</strong> : <span className="adm-dash-muted">0</span>}
                            </td>
                            <td className="is-num">{numero(r.servicos.total)}</td>
                            <td>
                              <span className="adm-dash-rede">
                                {numero(r.rede.comoFornecedora.unidadesEnviadas)} enviadas
                                <small>{numero(r.rede.comoSolicitante.unidadesRecebidas)} recebidas</small>
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!carregando && !unidades.length && (
              <p className="mgr-empty">Nenhuma unidade cadastrada ainda. Cadastre a primeira em Unidades.</p>
            )}
          </section>

          <div className="adm-dash-colunas">
            <section className="mgr-panel" aria-labelledby="adm-dash-chamados">
              <div className="mgr-panel-head">
                <div>
                  <h2 id="adm-dash-chamados">Chamados por situação</h2>
                  <p>{totalChamados} {totalChamados === 1 ? "chamado aberto" : "chamados abertos"} {noPeriodo}, somando todas as unidades.</p>
                </div>
              </div>
              {carregando ? (
                <p className="mgr-empty" role="status">Carregando…</p>
              ) : totalChamados ? (
                <ul className="adm-dash-barras">
                  {ROTULO_STATUS.filter(([status]) => total.porStatus[status]).map(([status, rotulo]) => (
                    <li key={status}>
                      <span>{rotulo}</span>
                      <span className="adm-dash-barra" aria-hidden="true">
                        <i className={`is-${status}`} style={{ width: `${(total.porStatus[status] / totalChamados) * 100}%` }} />
                      </span>
                      <strong>{total.porStatus[status]}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mgr-empty">Nenhum chamado {noPeriodo}.</p>
              )}
            </section>

            <section className="mgr-panel" aria-labelledby="adm-dash-remedios">
              <div className="mgr-panel-head">
                <div>
                  <h2 id="adm-dash-remedios">Remédios mais entregues</h2>
                  <p>Unidades entregues a pacientes {noPeriodo}, em toda a rede.</p>
                </div>
                <Link to="/admin/medicamentos">Catálogo →</Link>
              </div>
              {carregando ? (
                <p className="mgr-empty" role="status">Carregando…</p>
              ) : maisEntregues.length ? (
                <ol className="adm-dash-ranking">
                  {maisEntregues.map((r) => (
                    <li key={r.idRemedio}>
                      <span>
                        <strong>{r.nomeRemedio} {r.dosagemRemedio}</strong>
                        <small>{r.atendimentos} {r.atendimentos === 1 ? "atendimento" : "atendimentos"}</small>
                      </span>
                      <b>{numero(r.quantidade)} un.</b>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mgr-empty">Nenhuma entrega registrada {noPeriodo}.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
