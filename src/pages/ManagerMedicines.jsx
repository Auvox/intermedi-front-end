import { useCallback, useEffect, useId, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ChamadoModal, ErroComRetry } from "../components/Chamados";
import { ConfirmarModal, EstoqueTabela, FotoRemedio, ResumoEstoque, TarjaBadge } from "../components/Remedios";
import { usePolling } from "../hooks/useChamados";
import useDebounce from "../hooks/useDebounce";
import {
  adicionarEstoque,
  atualizarEstoque,
  listarCatalogo,
  listarEstoqueGerente,
  removerEstoque,
} from "../services/api";
import { nomeComDosagem, ordenarEstoque } from "../services/remedios";

const FILTROS_SITUACAO = [
  ["", "Todas as situações"],
  ["ok", "Em estoque"],
  ["critico", "Críticos"],
  ["zerado", "Zerados"],
  ["vencido", "Lote vencido"],
];

// Estoque da farmácia do gerente. O gerente não cadastra remédios no catálogo:
// ele adiciona ao estoque os remédios que o admin já cadastrou.
export default function ManagerMedicines() {
  const { gerente, notify } = useOutletContext();
  const { idGerente } = gerente;
  const [busca, setBusca] = useState("");
  const [situacaoFiltro, setSituacaoFiltro] = useState("");
  const buscaDebounced = useDebounce(busca.trim(), 300);
  const [modal, setModal] = useState(null); // { tipo: "adicionar"|"entrada"|"ajustar"|"remover", item }

  const fetcher = useCallback(
    (options) => listarEstoqueGerente(idGerente, { busca: buscaDebounced, situacao: situacaoFiltro }, options),
    [idGerente, buscaDebounced, situacaoFiltro],
  );
  const { data, loading, error, reload, retry } = usePolling(fetcher, { enabled: Boolean(idGerente), interval: 0 });
  const itens = ordenarEstoque(data?.estoque ?? []);

  function concluido(mensagem) {
    setModal(null);
    notify(mensagem);
    reload();
  }

  const header = (
    <header className="mgr-page-head">
      <div>
        <p className="mgr-eyebrow">GESTÃO DA UNIDADE</p>
        <h1>Estoque de remédios</h1>
        <p>
          {data?.farmacia?.nomeFarmacia ? `${data.farmacia.nomeFarmacia} · ` : ""}
          Adicione remédios do catálogo, registre entradas e ajuste o inventário.
        </p>
      </div>
      <button
        type="button"
        className="mgr-primary"
        disabled={!idGerente}
        onClick={() => setModal({ tipo: "adicionar" })}
      >
        + Adicionar do catálogo
      </button>
    </header>
  );

  if (!idGerente) {
    return (
      <>
        {header}
        <section className="mgr-panel">
          {gerente.loading ? (
            <p className="mgr-empty" role="status">Carregando gerente…</p>
          ) : (
            <ErroComRetry
              message={gerente.error || "Selecione um gerente na barra superior para ver o estoque."}
              onRetry={gerente.error ? gerente.retry : undefined}
            />
          )}
        </section>
      </>
    );
  }

  return (
    <>
      {header}
      <ResumoEstoque resumo={data?.resumo} filtro={situacaoFiltro} onFiltrar={setSituacaoFiltro} />
      <section className="mgr-panel" aria-label="Estoque da farmácia">
        <div className="mgr-toolbar">
          <input
            type="search"
            aria-label="Buscar no estoque"
            placeholder="Buscar remédio no estoque…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select aria-label="Filtrar por situação" value={situacaoFiltro} onChange={(e) => setSituacaoFiltro(e.target.value)}>
            {FILTROS_SITUACAO.map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
          </select>
          <button type="button" className="mgr-secondary" onClick={reload}>Atualizar</button>
        </div>
        {loading ? (
          <p className="mgr-empty" role="status">Carregando estoque…</p>
        ) : error && !data ? (
          <ErroComRetry message={error} onRetry={retry} />
        ) : itens.length ? (
          <EstoqueTabela
            itens={itens}
            acoes={(item) => (
              <>
                <button type="button" className="directory-row-action" aria-label={`Registrar entrada de ${item.nomeRemedio}`} onClick={() => setModal({ tipo: "entrada", item })}>
                  + Entrada
                </button>
                <button type="button" className="directory-row-action" aria-label={`Ajustar ${item.nomeRemedio}`} onClick={() => setModal({ tipo: "ajustar", item })}>
                  Ajustar
                </button>
                <button type="button" className="directory-row-action remedio-acao-perigo" aria-label={`Tirar ${item.nomeRemedio} do estoque`} onClick={() => setModal({ tipo: "remover", item })}>
                  Remover
                </button>
              </>
            )}
          />
        ) : (
          <div className="mgr-empty">
            <p>
              {busca || situacaoFiltro
                ? "Nenhum remédio do estoque corresponde a estes filtros."
                : "O estoque desta farmácia está vazio."}
            </p>
            {!busca && !situacaoFiltro && (
              <button type="button" className="mgr-primary" onClick={() => setModal({ tipo: "adicionar" })}>
                Adicionar do catálogo
              </button>
            )}
          </div>
        )}
        {data && (
          <p className="mgr-table-note" role="status">
            {itens.length} {itens.length === 1 ? "item" : "itens"} · Crítico: quantidade no mínimo ou abaixo · Lote vencido não pode ser entregue.
          </p>
        )}
      </section>

      {modal?.tipo === "adicionar" && (
        <AdicionarDoCatalogo idGerente={idGerente} onClose={() => setModal(null)} onAdicionado={concluido} />
      )}
      {modal?.tipo === "entrada" && (
        <EntradaModal idGerente={idGerente} item={modal.item} onClose={() => setModal(null)} onSalvo={concluido} />
      )}
      {modal?.tipo === "ajustar" && (
        <AjustarModal idGerente={idGerente} item={modal.item} onClose={() => setModal(null)} onSalvo={concluido} />
      )}
      {modal?.tipo === "remover" && (
        <RemoverModal idGerente={idGerente} item={modal.item} onClose={() => setModal(null)} onRemovido={concluido} />
      )}
    </>
  );
}

// Campo numérico/texto com label, erro ligado por aria-describedby e dica opcional
function Campo({ id, label, erro, dica, children }) {
  return (
    <label htmlFor={id}>
      {label}
      {children}
      {dica && <small className="remedio-obrigatorio-nota" id={`${id}-dica`}>{dica}</small>}
      {erro && <small className="chamado-field-error" id={`${id}-erro`}>{erro}</small>}
    </label>
  );
}
const describedBy = (id, erro, dica) => [erro && `${id}-erro`, dica && `${id}-dica`].filter(Boolean).join(" ") || undefined;
const inteiro = (valor, minimo) => {
  const n = Number(valor);
  return String(valor).trim() !== "" && Number.isInteger(n) && n >= minimo;
};

function AdicionarDoCatalogo({ idGerente, onClose, onAdicionado }) {
  const uid = useId();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca.trim(), 300);
  const [catalogo, setCatalogo] = useState({ remedios: [], loading: true, erro: "" });
  const [noEstoque, setNoEstoque] = useState(new Set());
  const [escolhido, setEscolhido] = useState(null);
  const [form, setForm] = useState({ quantidade: "", estoqueMinimo: "20", lote: "", validade: "" });
  const [erros, setErros] = useState({});
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Ids que já estão no estoque (sem filtros) para esconder do catálogo
  useEffect(() => {
    const controller = new AbortController();
    listarEstoqueGerente(idGerente, {}, { signal: controller.signal })
      .then((data) => setNoEstoque(new Set((data.estoque ?? []).map((e) => e.idRemedio))))
      .catch(() => {});
    return () => controller.abort();
  }, [idGerente]);

  useEffect(() => {
    const controller = new AbortController();
    listarCatalogo({ busca: buscaDebounced }, { signal: controller.signal })
      .then((data) => setCatalogo({ remedios: data.remedios ?? [], loading: false, erro: "" }))
      .catch((e) => {
        if (!controller.signal.aborted) setCatalogo({ remedios: [], loading: false, erro: e.message });
      });
    return () => controller.abort();
  }, [buscaDebounced]);

  const alterar = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    const encontrados = {};
    if (!inteiro(form.quantidade, 0)) encontrados.quantidade = "Informe um número inteiro igual ou maior que zero.";
    if (!inteiro(form.estoqueMinimo, 0)) encontrados.estoqueMinimo = "Informe um número inteiro igual ou maior que zero.";
    setErros(encontrados);
    setErroEnvio("");
    if (Object.keys(encontrados).length) return;
    setEnviando(true);
    try {
      const { recebido } = await adicionarEstoque(idGerente, {
        idRemedio: escolhido.idRemedio,
        quantidade: Number(form.quantidade),
        estoqueMinimo: Number(form.estoqueMinimo),
        ...(form.lote.trim() && { lote: form.lote.trim() }),
        ...(form.validade && { validade: form.validade }),
      });
      onAdicionado(`${recebido?.nomeRemedio ?? escolhido.nomeRemedio} adicionado ao estoque.`);
    } catch (e) {
      setErroEnvio(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (escolhido) {
    const id = (campo) => `${uid}-${campo}`;
    return (
      <ChamadoModal title="Adicionar ao estoque" onClose={onClose}>
        <div className="remedio-escolhido">
          <FotoRemedio foto={escolhido.fotoRemedio} nome={escolhido.nomeRemedio} tamanho="md" />
          <div>
            <strong>{nomeComDosagem(escolhido)}</strong>
            <small>{escolhido.apresentacaoRemedio}</small>
            <TarjaBadge valor={escolhido.tarjaRemedio} />
          </div>
          <button type="button" className="mgr-text-button" onClick={() => setEscolhido(null)} disabled={enviando}>
            Trocar remédio
          </button>
        </div>
        <form className="mgr-form" onSubmit={enviar} noValidate aria-busy={enviando}>
          <fieldset disabled={enviando} className="emp-service-fields">
            <div className="mgr-form-row">
              <Campo id={id("quantidade")} label="Quantidade *" erro={erros.quantidade}>
                <input
                  id={id("quantidade")}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  autoFocus
                  value={form.quantidade}
                  aria-invalid={Boolean(erros.quantidade)}
                  aria-describedby={describedBy(id("quantidade"), erros.quantidade)}
                  onChange={(e) => alterar("quantidade", e.target.value)}
                />
              </Campo>
              <Campo id={id("estoqueMinimo")} label="Estoque mínimo *" erro={erros.estoqueMinimo} dica="Abaixo disso o remédio fica crítico.">
                <input
                  id={id("estoqueMinimo")}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.estoqueMinimo}
                  aria-invalid={Boolean(erros.estoqueMinimo)}
                  aria-describedby={describedBy(id("estoqueMinimo"), erros.estoqueMinimo, true)}
                  onChange={(e) => alterar("estoqueMinimo", e.target.value)}
                />
              </Campo>
            </div>
            <div className="mgr-form-row">
              <Campo id={id("lote")} label="Lote (opcional)">
                <input id={id("lote")} maxLength={40} value={form.lote} onChange={(e) => alterar("lote", e.target.value)} />
              </Campo>
              <Campo id={id("validade")} label="Validade (opcional)">
                <input id={id("validade")} type="date" value={form.validade} onChange={(e) => alterar("validade", e.target.value)} />
              </Campo>
            </div>
            {erroEnvio && <p className="remedio-aviso remedio-aviso-erro" role="alert">{erroEnvio}</p>}
            <div className="mgr-modal-actions">
              <button type="button" className="mgr-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="mgr-primary" disabled={enviando}>
                {enviando ? "Enviando..." : "Adicionar ao estoque"}
              </button>
            </div>
          </fieldset>
        </form>
      </ChamadoModal>
    );
  }

  return (
    <ChamadoModal title="Adicionar do catálogo" onClose={onClose} className="remedio-form-modal">
      <label className="remedio-busca-catalogo" htmlFor={`${uid}-busca`}>
        Buscar no catálogo
        <input
          id={`${uid}-busca`}
          type="search"
          autoFocus
          placeholder="Nome, princípio ativo ou dosagem…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </label>
      {catalogo.loading ? (
        <p className="mgr-empty" role="status">Carregando catálogo…</p>
      ) : catalogo.erro ? (
        <p className="remedio-aviso remedio-aviso-erro" role="alert">{catalogo.erro}</p>
      ) : catalogo.remedios.length ? (
        <ul className="remedio-lista-escolha">
          {catalogo.remedios.map((r) => {
            const jaTem = noEstoque.has(r.idRemedio);
            return (
              <li key={r.idRemedio}>
                <FotoRemedio foto={r.fotoRemedio} nome={r.nomeRemedio} />
                <div>
                  <strong>{nomeComDosagem(r)}</strong>
                  <small>{[r.apresentacaoRemedio, r.fabricanteRemedio].filter(Boolean).join(" · ")}</small>
                  <TarjaBadge valor={r.tarjaRemedio} />
                </div>
                <button
                  type="button"
                  className="directory-row-action"
                  disabled={jaTem}
                  aria-label={jaTem ? `${r.nomeRemedio} já está no estoque` : `Escolher ${r.nomeRemedio}`}
                  onClick={() => setEscolhido(r)}
                >
                  {jaTem ? "Já está no estoque" : "Escolher"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mgr-empty">Nenhum remédio encontrado no catálogo. Peça ao admin para cadastrá-lo.</p>
      )}
    </ChamadoModal>
  );
}

// Reposição: soma ao atual sem sobrescrever baixas feitas ao mesmo tempo
function EntradaModal({ idGerente, item, onClose, onSalvo }) {
  const uid = useId();
  const [entrada, setEntrada] = useState("");
  const [erro, setErro] = useState("");
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    if (!inteiro(entrada, 1)) {
      setErro("Informe um número inteiro maior que zero.");
      return;
    }
    setEnviando(true);
    setErroEnvio("");
    try {
      const { resultado } = await atualizarEstoque(idGerente, item.idRemedio, { entrada: Number(entrada) });
      onSalvo(`Entrada registrada: ${item.nomeRemedio} agora tem ${resultado?.quantidade ?? "?"} un.`);
    } catch (e) {
      setErroEnvio(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ChamadoModal title={`Entrada de ${nomeComDosagem(item)}`} onClose={onClose}>
      <form className="mgr-form" onSubmit={enviar} noValidate aria-busy={enviando}>
        <p>Estoque atual: <strong>{item.quantidade} un.</strong> (mínimo {item.estoqueMinimo})</p>
        <Campo id={`${uid}-entrada`} label="Quantidade que chegou *" erro={erro}>
          <input
            id={`${uid}-entrada`}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            autoFocus
            value={entrada}
            disabled={enviando}
            aria-invalid={Boolean(erro)}
            aria-describedby={describedBy(`${uid}-entrada`, erro)}
            onChange={(e) => { setEntrada(e.target.value); setErro(""); }}
          />
        </Campo>
        {inteiro(entrada, 1) && (
          <p className="remedio-obrigatorio-nota">Novo total: {Number(item.quantidade) + Number(entrada)} un.</p>
        )}
        {erroEnvio && <p className="remedio-aviso remedio-aviso-erro" role="alert">{erroEnvio}</p>}
        <div className="mgr-modal-actions">
          <button type="button" className="mgr-secondary" disabled={enviando} onClick={onClose}>Cancelar</button>
          <button type="submit" className="mgr-primary" disabled={enviando}>{enviando ? "Enviando..." : "Registrar entrada"}</button>
        </div>
      </form>
    </ChamadoModal>
  );
}

// Inventário: define quantidade, mínimo, lote e validade (manda só o que mudou)
function AjustarModal({ idGerente, item, onClose, onSalvo }) {
  const uid = useId();
  const inicial = {
    quantidade: String(item.quantidade ?? ""),
    estoqueMinimo: String(item.estoqueMinimo ?? ""),
    lote: item.lote ?? "",
    validade: item.validade ?? "",
  };
  const [form, setForm] = useState(inicial);
  const [erros, setErros] = useState({});
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const id = (campo) => `${uid}-${campo}`;
  const alterar = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    const encontrados = {};
    if (!inteiro(form.quantidade, 0)) encontrados.quantidade = "Informe um número inteiro igual ou maior que zero.";
    if (!inteiro(form.estoqueMinimo, 0)) encontrados.estoqueMinimo = "Informe um número inteiro igual ou maior que zero.";
    setErros(encontrados);
    setErroEnvio("");
    if (Object.keys(encontrados).length) return;

    const body = {};
    if (Number(form.quantidade) !== Number(inicial.quantidade)) body.quantidade = Number(form.quantidade);
    if (Number(form.estoqueMinimo) !== Number(inicial.estoqueMinimo)) body.estoqueMinimo = Number(form.estoqueMinimo);
    if (form.lote.trim() !== inicial.lote) body.lote = form.lote.trim(); // "" limpa
    if (form.validade !== inicial.validade) body.validade = form.validade; // "" limpa
    if (!Object.keys(body).length) {
      onClose();
      return;
    }
    setEnviando(true);
    try {
      await atualizarEstoque(idGerente, item.idRemedio, body);
      onSalvo(`${item.nomeRemedio} atualizado.`);
    } catch (e) {
      setErroEnvio(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ChamadoModal title={`Ajustar ${nomeComDosagem(item)}`} onClose={onClose}>
      <form className="mgr-form" onSubmit={enviar} noValidate aria-busy={enviando}>
        <fieldset disabled={enviando} className="emp-service-fields">
          <div className="mgr-form-row">
            <Campo id={id("quantidade")} label="Quantidade (inventário) *" erro={erros.quantidade} dica="Define o total contado. Para reposição, prefira + Entrada.">
              <input
                id={id("quantidade")}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.quantidade}
                aria-invalid={Boolean(erros.quantidade)}
                aria-describedby={describedBy(id("quantidade"), erros.quantidade, true)}
                onChange={(e) => alterar("quantidade", e.target.value)}
              />
            </Campo>
            <Campo id={id("estoqueMinimo")} label="Estoque mínimo *" erro={erros.estoqueMinimo} dica="Abaixo disso o remédio fica crítico.">
              <input
                id={id("estoqueMinimo")}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.estoqueMinimo}
                aria-invalid={Boolean(erros.estoqueMinimo)}
                aria-describedby={describedBy(id("estoqueMinimo"), erros.estoqueMinimo, true)}
                onChange={(e) => alterar("estoqueMinimo", e.target.value)}
              />
            </Campo>
          </div>
          <div className="mgr-form-row">
            <Campo id={id("lote")} label="Lote">
              <input id={id("lote")} maxLength={40} value={form.lote} onChange={(e) => alterar("lote", e.target.value)} />
            </Campo>
            <Campo id={id("validade")} label="Validade">
              <input id={id("validade")} type="date" value={form.validade} onChange={(e) => alterar("validade", e.target.value)} />
            </Campo>
          </div>
          {erroEnvio && <p className="remedio-aviso remedio-aviso-erro" role="alert">{erroEnvio}</p>}
          <div className="mgr-modal-actions">
            <button type="button" className="mgr-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="mgr-primary" disabled={enviando}>{enviando ? "Enviando..." : "Salvar ajuste"}</button>
          </div>
        </fieldset>
      </form>
    </ChamadoModal>
  );
}

function RemoverModal({ idGerente, item, onClose, onRemovido }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  async function remover() {
    setEnviando(true);
    setErro("");
    try {
      await removerEstoque(idGerente, item.idRemedio);
      onRemovido(`${item.nomeRemedio} removido do estoque.`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <ConfirmarModal titulo="Remover do estoque" rotulo="Remover do estoque" enviando={enviando} erro={erro} onConfirmar={remover} onCancelar={onClose}>
      <p>Tirar {item.nomeRemedio} do estoque da sua farmácia? O remédio continua no catálogo.</p>
    </ConfirmarModal>
  );
}
