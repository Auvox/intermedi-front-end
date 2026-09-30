import { useCallback, useEffect, useId, useState } from "react";
import useFotoPreview from "../hooks/useFotoPreview";
import { ChamadoModal, ErroComRetry, ToastRegion } from "../components/Chamados";
import { ConfirmarModal, FotoRemedio, TarjaBadge } from "../components/Remedios";
import RemedioForm from "../components/RemedioForm";
import { usePolling, useToast } from "../hooks/useChamados";
import useDebounce from "../hooks/useDebounce";
import {
  apagarRemedio,
  buscarRemedio,
  enviarFotoRemedio,
  listarCatalogo,
  listarCategorias,
  removerFotoRemedio,
} from "../services/api";
import { formatarDataHora, nomeComDosagem, tipo, validarFoto } from "../services/remedios";

const mostrar = (valor) => (valor === null || valor === undefined || valor === "" ? "Não informado" : valor);

// Catálogo geral de medicamentos. Só o admin cadastra; os gerentes
// adicionam ao estoque remédios que existem aqui.
export default function AdminMedicines() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const buscaDebounced = useDebounce(busca.trim(), 300);
  const [categorias, setCategorias] = useState([]);
  const [modal, setModal] = useState(null); // { tipo: "form"|"detalhe"|"foto"|"apagar", remedio }
  const [toast, notify] = useToast();

  const fetcher = useCallback(
    (options) => listarCatalogo({ busca: buscaDebounced, categoria }, options),
    [buscaDebounced, categoria],
  );
  const { data, loading, error, reload, retry, setData } = usePolling(fetcher, { interval: 0 });
  const remedios = data?.remedios ?? [];

  const carregarCategorias = useCallback(() => {
    listarCategorias().then(setCategorias).catch(() => setCategorias([]));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    listarCategorias({ signal: controller.signal }).then(setCategorias).catch(() => {});
    return () => controller.abort();
  }, []);

  // Atualiza o item na lista sem recarregar tudo
  function substituir(remedio) {
    setData((atual) =>
      atual && { ...atual, remedios: atual.remedios.map((r) => (r.idRemedio === remedio.idRemedio ? remedio : r)) },
    );
  }
  function salvo(remedio, mensagem) {
    setModal(null);
    notify(mensagem);
    reload();
    carregarCategorias();
    if (remedio) substituir(remedio);
  }

  const filtrando = Boolean(buscaDebounced || categoria);
  return (
    <>
      <header className="mgr-page-head">
        <div>
          <p className="mgr-eyebrow">CATÁLOGO DA REDE</p>
          <h1>Medicamentos</h1>
          <p>Cadastre os remédios do sistema. Os gerentes só adicionam ao estoque o que estiver aqui.</p>
        </div>
        <button type="button" className="mgr-primary" onClick={() => setModal({ tipo: "form" })}>
          + Cadastrar medicamento
        </button>
      </header>

      <section className="mgr-panel" aria-label="Catálogo de medicamentos">
        <div className="mgr-toolbar">
          <input
            type="search"
            aria-label="Buscar medicamento"
            placeholder="Buscar nome, princípio ativo ou dosagem…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select aria-label="Filtrar por categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.idCategoria} value={c.nomeCategoria}>
                {c.nomeCategoria} ({c.totalRemedios})
              </option>
            ))}
          </select>
          <button type="button" className="mgr-secondary" onClick={reload}>Atualizar</button>
        </div>

        {loading ? (
          <p className="mgr-empty" role="status">Carregando catálogo…</p>
        ) : error && !data ? (
          <ErroComRetry message={error} onRetry={retry} />
        ) : remedios.length ? (
          <ul className="remedio-catalogo">
            {remedios.map((r) => (
              <li key={r.idRemedio} className="remedio-card">
                <FotoRemedio foto={r.fotoRemedio} nome={r.nomeRemedio} tamanho="md" />
                <div className="remedio-card-corpo">
                  <h3>{nomeComDosagem(r)}</h3>
                  <p className="remedio-card-principio">{mostrar(r.principioAtivoRemedio)}</p>
                  <p className="remedio-card-meta">
                    {[r.fabricanteRemedio, r.apresentacaoRemedio].filter(Boolean).join(" · ")}
                  </p>
                  <div className="remedio-selos">
                    <TarjaBadge valor={r.tarjaRemedio} />
                    {r.tipoRemedio && <span className="remedio-tipo">{tipo(r.tipoRemedio)}</span>}
                  </div>
                  <p className="remedio-card-meta">
                    {r.categorias || "Sem categoria"} · ANVISA {mostrar(r.registroAnvisaRemedio)}
                  </p>
                </div>
                <div className="remedio-acoes remedio-card-acoes">
                  <button type="button" className="directory-row-action" aria-label={`Ver detalhes de ${r.nomeRemedio}`} onClick={() => setModal({ tipo: "detalhe", remedio: r })}>
                    Ver detalhes
                  </button>
                  <button type="button" className="directory-row-action" aria-label={`Editar ${r.nomeRemedio}`} onClick={() => setModal({ tipo: "form", remedio: r })}>
                    Editar
                  </button>
                  <button type="button" className="directory-row-action" aria-label={`${r.fotoRemedio ? "Trocar ou remover a foto" : "Adicionar foto"} de ${r.nomeRemedio}`} onClick={() => setModal({ tipo: "foto", remedio: r })}>
                    {r.fotoRemedio ? "Trocar/remover foto" : "Adicionar foto"}
                  </button>
                  <button
                    type="button"
                    className="directory-row-action remedio-acao-perigo"
                    aria-label={`Apagar ${r.nomeRemedio}`}
                    onClick={() => setModal({ tipo: "apagar", remedio: r })}
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mgr-empty">
            <p>{filtrando ? "Nenhum medicamento encontrado para estes filtros." : "Nenhum medicamento cadastrado."}</p>
            {!filtrando && (
              <button type="button" className="mgr-primary" onClick={() => setModal({ tipo: "form" })}>
                Cadastrar medicamento
              </button>
            )}
          </div>
        )}
        {data && (
          <p className="mgr-table-note" role="status">
            {remedios.length} {remedios.length === 1 ? "medicamento" : "medicamentos"}
            {filtrando ? " encontrados" : " no catálogo"}
          </p>
        )}
      </section>

      {modal?.tipo === "form" && (
        <RemedioForm remedio={modal.remedio} categorias={categorias} onClose={() => setModal(null)} onSalvo={salvo} />
      )}
      {modal?.tipo === "detalhe" && <DetalheRemedio remedio={modal.remedio} onClose={() => setModal(null)} />}
      {modal?.tipo === "foto" && (
        <FotoModal
          remedio={modal.remedio}
          onClose={() => setModal(null)}
          onSalvo={(remedio, mensagem) => {
            substituir(remedio);
            setModal(null);
            notify(mensagem);
          }}
        />
      )}
      {modal?.tipo === "apagar" && (
        <ApagarRemedio
          remedio={modal.remedio}
          onClose={() => setModal(null)}
          onApagado={(nome) => {
            setModal(null);
            notify(`${nome} apagado do catálogo.`);
            reload();
            carregarCategorias();
          }}
        />
      )}
      <ToastRegion message={toast} />
    </>
  );
}

// "Bula resumida" com os dados completos do remédio
function DetalheRemedio({ remedio, onClose }) {
  const [estado, setEstado] = useState({ dados: remedio, loading: true, erro: "" });
  useEffect(() => {
    const controller = new AbortController();
    buscarRemedio(remedio.idRemedio, { signal: controller.signal })
      .then((dados) => setEstado({ dados, loading: false, erro: "" }))
      .catch((e) => {
        if (!controller.signal.aborted) setEstado((atual) => ({ ...atual, loading: false, erro: e.message }));
      });
    return () => controller.abort();
  }, [remedio.idRemedio]);
  const r = estado.dados;
  const linha = (rotulo, valor) => (
    <div><dt>{rotulo}</dt><dd>{mostrar(valor)}</dd></div>
  );
  return (
    <ChamadoModal title={nomeComDosagem(r)} onClose={onClose} className="remedio-detalhe-modal">
      {estado.loading && <p className="remedio-obrigatorio-nota" role="status">Atualizando informações…</p>}
      {estado.erro && <p className="remedio-aviso remedio-aviso-erro" role="alert">{estado.erro}</p>}
      <div className="remedio-bula">
        <FotoRemedio foto={r.fotoRemedio} nome={r.nomeRemedio} tamanho="lg" />
        <div>
          <p className="remedio-card-principio">{mostrar(r.principioAtivoRemedio)}</p>
          <div className="remedio-selos">
            <TarjaBadge valor={r.tarjaRemedio} />
            {r.tipoRemedio && <span className="remedio-tipo">{tipo(r.tipoRemedio)}</span>}
          </div>
          {r.exigeReceita && (
            <p className="remedio-aviso">
              Exige receita médica{r.retemReceita ? " · a receita fica retida na farmácia" : ""}.
            </p>
          )}
          {r.descRemedio && <p>{r.descRemedio}</p>}
        </div>
      </div>
      <dl className="chamado-dados remedio-bula-dados">
        {linha("Registro ANVISA", r.registroAnvisaRemedio)}
        {linha("Fabricante", r.fabricanteRemedio)}
        {linha("Forma farmacêutica", r.formaFarmaceuticaRemedio)}
        {linha("Via de administração", r.viaAdministracaoRemedio)}
        {linha("Apresentação", r.apresentacaoRemedio)}
        {linha("Categorias", r.categorias)}
      </dl>
      <h3>Indicações</h3>
      <p>{mostrar(r.indicacoesRemedio)}</p>
      <h3>Contraindicações</h3>
      <p>{mostrar(r.contraindicacoesRemedio)}</p>
      <h3>Armazenamento</h3>
      <p>{mostrar(r.armazenamentoRemedio)}</p>
      <p className="mgr-table-note">
        Cadastrado em {formatarDataHora(r.createdAtRemedio)}
        {r.updatedAtRemedio && ` · atualizado em ${formatarDataHora(r.updatedAtRemedio)}`}
      </p>
    </ChamadoModal>
  );
}

// Trocar ou remover a foto (a antiga é apagada no servidor)
function FotoModal({ remedio, onClose, onSalvo }) {
  const uid = useId();
  const [arquivo, setArquivo] = useState(null);
  const [preview, definirPreview] = useFotoPreview();
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);

  function escolher(file) {
    const mensagem = validarFoto(file);
    setErro(mensagem);
    setArquivo(mensagem ? null : file);
    definirPreview(mensagem ? null : file);
  }

  async function executar(acao, mensagem) {
    setEnviando(true);
    setErro("");
    try {
      const { resultado } = await acao();
      onSalvo(resultado, mensagem);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ChamadoModal title={`Foto de ${remedio.nomeRemedio}`} onClose={onClose}>
      <div className="remedio-foto-campo">
        {preview ? (
          <span className="remedio-foto remedio-foto-lg"><img src={preview} alt="Pré-visualização da nova foto" /></span>
        ) : (
          <FotoRemedio foto={remedio.fotoRemedio} nome={remedio.nomeRemedio} tamanho="lg" />
        )}
        <label htmlFor={`${uid}-foto`}>
          Nova foto
          <input
            id={`${uid}-foto`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? `${uid}-erro` : `${uid}-dica`}
            disabled={enviando}
            onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          />
          <small className="remedio-obrigatorio-nota" id={`${uid}-dica`}>JPEG, PNG ou WebP, até 5 MB.</small>
          {erro && <small className="chamado-field-error" id={`${uid}-erro`} role="alert">{erro}</small>}
        </label>
      </div>
      {confirmarRemocao && (
        <p className="remedio-aviso">Remover a foto de {remedio.nomeRemedio}? O remédio passa a mostrar o ícone padrão.</p>
      )}
      <div className="mgr-modal-actions">
        {remedio.fotoRemedio && !confirmarRemocao && (
          <button type="button" className="mgr-delete-button chamado-recusar" disabled={enviando} onClick={() => setConfirmarRemocao(true)}>
            Remover foto
          </button>
        )}
        {confirmarRemocao && (
          <>
            <button type="button" className="mgr-secondary" disabled={enviando} onClick={() => setConfirmarRemocao(false)}>Voltar</button>
            <button
              type="button"
              className="mgr-delete-button chamado-recusar"
              disabled={enviando}
              onClick={() => executar(() => removerFotoRemedio(remedio.idRemedio), "Foto removida.")}
            >
              {enviando ? "Enviando..." : "Confirmar remoção"}
            </button>
          </>
        )}
        {!confirmarRemocao && (
          <button
            type="button"
            className="mgr-primary"
            disabled={enviando || !arquivo}
            onClick={() => executar(() => enviarFotoRemedio(remedio.idRemedio, arquivo), "Foto atualizada.")}
          >
            {enviando ? "Enviando..." : "Enviar foto"}
          </button>
        )}
      </div>
    </ChamadoModal>
  );
}

// Apagar do catálogo; 409 = remédio já usado (o histórico precisa ser preservado)
function ApagarRemedio({ remedio, onClose, onApagado }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [emUso, setEmUso] = useState("");

  async function apagar() {
    setEnviando(true);
    setErro("");
    try {
      await apagarRemedio(remedio.idRemedio);
      onApagado(remedio.nomeRemedio);
    } catch (e) {
      if (e.status === 409) setEmUso(e.message);
      else setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (emUso) {
    return (
      <ChamadoModal title={`Não é possível apagar ${remedio.nomeRemedio}`} onClose={onClose}>
        <p className="remedio-aviso" role="alert">{emUso}</p>
        <p>
          Esse remédio já faz parte do histórico (estoque, chamados ou serviços), por isso ele precisa continuar no
          catálogo. Se necessário, peça aos gerentes que o tirem do estoque das farmácias.
        </p>
        <div className="mgr-modal-actions">
          <button type="button" className="mgr-primary" onClick={onClose}>Entendi</button>
        </div>
      </ChamadoModal>
    );
  }
  return (
    <ConfirmarModal
      titulo="Apagar medicamento"
      rotulo="Apagar do catálogo"
      enviando={enviando}
      erro={erro}
      onConfirmar={apagar}
      onCancelar={onClose}
    >
      <p>Apagar {remedio.nomeRemedio} do catálogo?</p>
      <p className="remedio-obrigatorio-nota">Essa ação não pode ser desfeita.</p>
    </ConfirmarModal>
  );
}
