import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DirectoryStats } from "../components/Directory";
import { ChamadoModal, ErroComRetry, SeletorPersona } from "../components/Chamados";
import { TarjaBadge } from "../components/Remedios";
import SolicitarReposicao from "../components/SolicitarReposicao";
import { usePerfil } from "../components/perfil/perfilContext";
import { propsLinha } from "../services/perfil";
import useApiList from "../hooks/useApiList";
import { useFarmaciaDoFuncionario, usePolling } from "../hooks/useChamados";
import {
  cadastrarServico,
  listarEstoqueFarmacia,
  listarPacientes,
  listarRemedios,
  listarServicosDaFarmacia,
  normalizeText,
} from "../services/api";
import { formatarDataHora, nomeComDosagem, reposicaoDoEstoque } from "../services/remedios";
import TicketServico from "../components/TicketServico";

const novoItem = () => ({ key: crypto.randomUUID(), idRemedio: "", quantidade: "1" });
const mostrar = (valor) => (valor === null || valor === undefined || valor === "" ? "Não informado" : valor);

// Serviço = entrega ao paciente. Ao registrar, o back dá baixa no estoque da
// farmácia; se qualquer item falhar, nada é gravado.
export default function EmployeeServices() {
  const funcionario = useFarmaciaDoFuncionario();
  const { idFuncionario, idFarmacia } = funcionario;
  const { items: pacientes, loading: carregandoPacientes } = useApiList(listarPacientes);
  const { items: catalogo } = useApiList(listarRemedios);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const { abrirPerfil } = usePerfil();
  const [reposicao, setReposicao] = useState(null);

  const buscarEstoque = useCallback((options) => listarEstoqueFarmacia(idFarmacia, {}, options), [idFarmacia]);
  const estoque = usePolling(buscarEstoque, { enabled: Boolean(idFarmacia), interval: 0 });
  const buscarLista = useCallback((options) => listarServicosDaFarmacia(idFarmacia, options), [idFarmacia]);
  const lista = usePolling(buscarLista, { enabled: Boolean(idFarmacia), interval: 0 });

  const servicos = lista.data ?? [];
  const termo = normalizeText(busca.trim().replace(/^#/, ""));
  const filtrados = servicos.filter((s) =>
    /^\d+$/.test(termo)
      ? String(s.idServico) === termo
      : normalizeText(`${s.nomePaciente} ${s.nomeFuncionario} ${s.observacao ?? ""}`).includes(termo),
  );
  const pronto = Boolean(idFuncionario && idFarmacia && estoque.data && pacientes.length);

  return (
    <>
      <header className="mgr-page-head mgr-page-head-featured">
        <div>
          <p className="mgr-eyebrow">ESPAÇO DO FUNCIONÁRIO</p>
          <h1>Serviços</h1>
          <p>Registre a entrega de remédios ao paciente. A quantidade sai do estoque da farmácia.</p>
        </div>
        <button type="button" className="mgr-primary" disabled={!pronto} onClick={() => setAberto(true)}>
          + Novo serviço
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
          <DirectoryStats
            items={[
              ["Serviços da farmácia", lista.data ? servicos.length : null, "clipboard"],
              ["Pacientes atendidos", lista.data ? new Set(servicos.map((s) => s.idPaciente)).size : null, "heart"],
              ["Itens no estoque", estoque.data?.resumo?.totalItens ?? null, "pill"],
            ]}
          />
          <section className="mgr-panel" aria-label="Lista de serviços">
            <div className="mgr-toolbar">
              <input
                type="search"
                aria-label="Buscar serviços"
                placeholder="Buscar nº do serviço, paciente ou funcionário…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              {!funcionario.temSessao && (
                <SeletorPersona
                  label="Funcionário"
                  value={idFuncionario ?? ""}
                  onChange={funcionario.escolher}
                  options={funcionario.funcionarios.map((f) => [f.id, f.name])}
                />
              )}
              <button type="button" className="directory-row-action" onClick={() => { lista.reload(); estoque.reload(); }}>
                Atualizar
              </button>
            </div>
            {lista.loading ? (
              <p className="mgr-empty" role="status">Carregando serviços…</p>
            ) : lista.error && !lista.data ? (
              <ErroComRetry message={lista.error} onRetry={lista.retry} />
            ) : (
              <>
                <div className="mgr-table-wrap cp-lista">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Comprovante</th>
                        <th scope="col">Paciente</th>
                        <th scope="col">Atendido por</th>
                        <th scope="col" className="cp-lista-num">Itens</th>
                        <th scope="col" className="cp-lista-num">Data e hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((s) => (
                        <tr key={s.idServico} {...propsLinha((el) => abrirPerfil("servico", s.idServico, el), `Abrir serviço nº ${s.idServico}`)}>
                          <td>
                            <TicketServico servico={s} onAbrir={(el) => abrirPerfil("servico", s.idServico, el)} />
                          </td>
                          <td>{mostrar(s.nomePaciente)}</td>
                          <td>{mostrar(s.nomeFuncionario)}</td>
                          <td className="cp-lista-num">
                            <strong className="cp-mono">{Number(s.quantidadeTotal || 0).toLocaleString("pt-BR")} un.</strong>
                            <small>{s.totalMedicamentos} {Number(s.totalMedicamentos) === 1 ? "remédio" : "remédios"}</small>
                          </td>
                          <td className="cp-lista-num cp-mono cp-lista-data">{formatarDataHora(s.dataServico)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filtrados.length && (
                  <p className="mgr-empty">{servicos.length ? "Nenhum serviço encontrado." : "Nenhum serviço registrado nesta farmácia."}</p>
                )}
                <p className="mgr-table-note">{filtrados.length} de {servicos.length} serviços</p>
              </>
            )}
          </section>
        </>
      )}

      {aberto && (
        <NovoServico
          funcionario={funcionario}
          farmacia={estoque.data?.farmacia}
          estoque={estoque.data?.estoque ?? []}
          pacientes={pacientes}
          carregandoPacientes={carregandoPacientes}
          onClose={() => setAberto(false)}
          onRegistrado={() => { lista.reload(); estoque.reload(); }}
          onEstoqueDesatualizado={estoque.reload}
          onSolicitarReposicao={(itens) => { setAberto(false); setReposicao(reposicaoDoEstoque(itens)); }}
        />
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

function NovoServico({ funcionario, farmacia, estoque, pacientes, onClose, onRegistrado, onEstoqueDesatualizado, onSolicitarReposicao }) {
  const uid = useId();
  const [idPaciente, setIdPaciente] = useState("");
  const [observacao, setObservacao] = useState("");
  const [items, setItems] = useState(() => [novoItem()]);
  const [receitaConferida, setReceitaConferida] = useState(false);
  const [erros, setErros] = useState({});
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const enviandoRef = useRef(false);
  const primeiroCampo = useRef(null);
  useEffect(() => { primeiroCampo.current?.focus(); }, []);

  const porId = new Map(estoque.map((e) => [String(e.idRemedio), e]));
  const escolhidos = items.map((item) => porId.get(item.idRemedio)).filter(Boolean);
  const exigeReceita = escolhidos.some((e) => e.exigeReceita);
  const retemReceita = escolhidos.some((e) => e.retemReceita);
  const nomeFuncionario = funcionario.funcionarios.find((f) => String(f.id) === String(funcionario.idFuncionario))?.name;
  const id = (campo) => `${uid}-${campo}`;

  function atualizar(key, campo, valor) {
    setItems((atual) => atual.map((item) => (item.key === key ? { ...item, [campo]: valor } : item)));
    setErros((atual) => ({ ...atual, [`${key}-${campo}`]: undefined }));
  }

  function validar() {
    const encontrados = {};
    if (!idPaciente) encontrados.paciente = "Selecione o paciente.";
    items.forEach((item) => {
      const disponivel = porId.get(item.idRemedio);
      const qtd = Number(item.quantidade);
      if (!disponivel) encontrados[`${item.key}-idRemedio`] = "Selecione o remédio.";
      if (!Number.isInteger(qtd) || qtd <= 0) encontrados[`${item.key}-quantidade`] = "Informe um número inteiro maior que zero.";
      else if (disponivel && qtd > disponivel.quantidade) {
        encontrados[`${item.key}-quantidade`] = `Disponível: ${disponivel.quantidade} un.`;
      }
    });
    if (exigeReceita && !receitaConferida) encontrados.receita = "Confira a receita antes de registrar.";
    return encontrados;
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviandoRef.current) return;
    setErroEnvio("");
    const encontrados = validar();
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const { recebido } = await cadastrarServico({
        idFuncionario: Number(funcionario.idFuncionario),
        idPaciente: Number(idPaciente),
        idFarmacia: Number(funcionario.idFarmacia),
        ...(observacao.trim() && { observacao: observacao.trim() }),
        remedios: items.map((item) => ({ idRemedio: Number(item.idRemedio), quantidade: Number(item.quantidade) })),
      });
      setResultado(recebido);
      onRegistrado();
    } catch (e) {
      // 409: estoque insuficiente, fora do estoque ou lote vencido — o formulário continua
      // preenchido e o estoque é recarregado para mostrar o disponível atual
      setErroEnvio(e.message);
      if (e.status === 409) onEstoqueDesatualizado();
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  if (resultado) {
    const criticos = (resultado.baixas ?? []).filter((b) => b.critico);
    return (
      <ChamadoModal title={`Serviço nº ${resultado.idServico} registrado`} onClose={onClose} className="emp-service-modal">
        <div className="chamado-confirmacao" role="status">
          <p><strong>Serviço nº {resultado.idServico} registrado</strong></p>
        </div>
        <h3>Baixa no estoque</h3>
        <div className="mgr-table-wrap chamado-remedios">
          <table>
            <thead>
              <tr><th scope="col">Remédio</th><th scope="col">Entregue</th><th scope="col">Estoque</th></tr>
            </thead>
            <tbody>
              {(resultado.baixas ?? []).map((b) => (
                <tr key={b.idRemedio}>
                  <td><strong>{b.nomeRemedio}</strong></td>
                  <td>{b.quantidadeBaixada} un.</td>
                  <td>
                    <span className="remedio-baixa">
                      {b.estoqueAnterior} <span aria-hidden="true">→</span><span className="sr-only"> passou para </span> <strong>{b.estoqueAtual}</strong>
                      {b.critico && <span className="mgr-badge chamado-badge orange">Crítico</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {criticos.length > 0 && (
          <div className="remedio-aviso remedio-aviso-alerta" role="alert">
            <ul>
              {criticos.map((b) => (
                <li key={b.idRemedio}>
                  {b.nomeRemedio} ficou com {b.estoqueAtual} un. (mínimo {b.estoqueMinimo})
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mgr-primary"
              onClick={() =>
                onSolicitarReposicao(
                  criticos.map((b) => ({
                    idRemedio: b.idRemedio,
                    quantidade: b.estoqueAtual,
                    estoqueMinimo: b.estoqueMinimo,
                    situacao: b.estoqueAtual === 0 ? "zerado" : "critico",
                  })),
                )
              }
            >
              Solicitar reposição
            </button>
          </div>
        )}
        <div className="mgr-modal-actions">
          <button type="button" className="mgr-secondary" onClick={onClose}>Fechar</button>
        </div>
      </ChamadoModal>
    );
  }

  return (
    <ChamadoModal title="Novo serviço" onClose={onClose} className="emp-service-modal">
      <form className="mgr-form emp-service-form" onSubmit={enviar} noValidate aria-busy={enviando}>
        <fieldset disabled={enviando} className="emp-service-fields">
          <div className="mgr-form-row">
            {funcionario.temSessao ? (
              <label>Funcionário responsável<input readOnly value={nomeFuncionario || ""} /></label>
            ) : (
              <label>
                Funcionário responsável
                <select value={funcionario.idFuncionario ?? ""} onChange={(e) => funcionario.escolher(e.target.value)}>
                  {funcionario.funcionarios.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>
            )}
            <label>Farmácia do atendimento<input readOnly value={farmacia?.nomeFarmacia || ""} /></label>
          </div>
          <label htmlFor={id("paciente")}>
            Paciente
            <select
              id={id("paciente")}
              ref={primeiroCampo}
              value={idPaciente}
              aria-invalid={Boolean(erros.paciente)}
              aria-describedby={erros.paciente ? `${id("paciente")}-erro` : undefined}
              onChange={(e) => { setIdPaciente(e.target.value); setErros((a) => ({ ...a, paciente: undefined })); }}
            >
              <option value="">Selecione o paciente</option>
              {pacientes.map((p) => (
                <option key={p.idPaciente} value={p.idPaciente}>{p.nomePaciente} · CPF {p.cpfPaciente}</option>
              ))}
            </select>
            {erros.paciente && <small className="chamado-field-error" id={`${id("paciente")}-erro`}>{erros.paciente}</small>}
          </label>

          <fieldset className="emp-service-medicines">
            <legend>Remédios entregues</legend>
            {items.map((item, index) => {
              const disponivel = porId.get(item.idRemedio);
              const erroRemedio = erros[`${item.key}-idRemedio`];
              const erroQtd = erros[`${item.key}-quantidade`];
              const acima = disponivel && Number(item.quantidade) > disponivel.quantidade;
              const avisoQtd = erroQtd || (acima ? `Disponível: ${disponivel.quantidade} un.` : "");
              return (
                <div className="emp-service-item" key={item.key}>
                  <label htmlFor={id(`${item.key}-remedio`)}>
                    Remédio {index + 1}
                    <select
                      id={id(`${item.key}-remedio`)}
                      value={item.idRemedio}
                      aria-invalid={Boolean(erroRemedio)}
                      aria-describedby={erroRemedio ? `${id(`${item.key}-remedio`)}-erro` : undefined}
                      onChange={(e) => atualizar(item.key, "idRemedio", e.target.value)}
                    >
                      <option value="">Selecione o remédio</option>
                      {estoque.map((e) => {
                        const outro = items.some((o) => o.key !== item.key && o.idRemedio === String(e.idRemedio));
                        const motivo = e.vencido ? " (lote vencido)" : e.quantidade === 0 ? " (sem estoque)" : "";
                        return (
                          <option key={e.idRemedio} value={e.idRemedio} disabled={Boolean(motivo) || outro}>
                            {nomeComDosagem(e)} · disponível: {e.quantidade}{motivo}
                          </option>
                        );
                      })}
                    </select>
                    {erroRemedio && <small className="chamado-field-error" id={`${id(`${item.key}-remedio`)}-erro`}>{erroRemedio}</small>}
                  </label>
                  <label htmlFor={id(`${item.key}-qtd`)}>
                    Quantidade
                    <input
                      id={id(`${item.key}-qtd`)}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      max={disponivel?.quantidade}
                      value={item.quantidade}
                      aria-invalid={Boolean(avisoQtd)}
                      aria-describedby={avisoQtd ? `${id(`${item.key}-qtd`)}-erro` : undefined}
                      onChange={(e) => atualizar(item.key, "quantidade", e.target.value)}
                    />
                    {avisoQtd && <small className="chamado-field-error" id={`${id(`${item.key}-qtd`)}-erro`}>{avisoQtd}</small>}
                  </label>
                  <button
                    className="mgr-secondary"
                    type="button"
                    disabled={items.length === 1}
                    aria-label={`Remover remédio ${index + 1}`}
                    onClick={() => setItems((atual) => atual.filter((i) => i.key !== item.key))}
                  >
                    Remover
                  </button>
                  {disponivel?.exigeReceita && (
                    <p className="remedio-item-receita">
                      <TarjaBadge valor={disponivel.tarjaRemedio} />
                    </p>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="mgr-secondary"
              disabled={items.length >= estoque.length}
              onClick={() => setItems((atual) => [...atual, novoItem()])}
            >
              + Adicionar remédio
            </button>
          </fieldset>

          {exigeReceita && (
            <div className="remedio-aviso">
              <p>
                <strong>Exige receita médica.</strong>
                {retemReceita && " Receita será retida."}
              </p>
              <label className="remedio-check" htmlFor={id("receita")}>
                <input
                  id={id("receita")}
                  type="checkbox"
                  checked={receitaConferida}
                  aria-invalid={Boolean(erros.receita)}
                  aria-describedby={erros.receita ? `${id("receita")}-erro` : undefined}
                  onChange={(e) => { setReceitaConferida(e.target.checked); setErros((a) => ({ ...a, receita: undefined })); }}
                />
                Receita conferida
              </label>
              {erros.receita && <small className="chamado-field-error" id={`${id("receita")}-erro`}>{erros.receita}</small>}
            </div>
          )}

          <label htmlFor={id("obs")}>
            Observação (opcional)
            <textarea id={id("obs")} rows="3" maxLength={1000} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder={retemReceita ? "Ex.: Receita retida" : "Informações adicionais sobre o atendimento"} />
          </label>
          {erroEnvio && <p className="remedio-aviso remedio-aviso-erro" role="alert">{erroEnvio}</p>}
          <div className="mgr-modal-actions">
            <button className="mgr-secondary" type="button" onClick={onClose}>Cancelar</button>
            <button className="mgr-primary" type="submit" disabled={enviando}>{enviando ? "Enviando..." : "Registrar serviço"}</button>
          </div>
        </fieldset>
      </form>
    </ChamadoModal>
  );
}
