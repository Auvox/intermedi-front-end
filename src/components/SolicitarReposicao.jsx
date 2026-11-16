import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarEstoqueFarmacia, solicitarChamado } from "../services/api";
import { PRIORIDADE_CHAMADO } from "../services/chamados";
import { comSituacao, situacao } from "../services/remedios";
import BuscaSelect from "./BuscaSelect";
import { ChamadoModal, RemediosChamadoTable, StatusChamadoBadge } from "./Chamados";
import { BarraEstoque } from "./Remedios";

const novoItem = (idRemedio = "", quantidade = "") => ({
  key: crypto.randomUUID(),
  idRemedio: String(idRemedio),
  quantidade: String(quantidade),
});

const nomesGerentes = (gerentes = []) => {
  const nomes = gerentes.map((g) => g.nomeGerente).filter(Boolean);
  if (!nomes.length) return "o gerente da farmácia";
  return nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
};

// Estoque da farmácia somado por remédio (um remédio pode ter vários lotes)
function estoquePorRemedio(linhas = []) {
  const porRemedio = new Map();
  for (const linha of linhas) {
    const chave = String(linha.idRemedio);
    const atual = porRemedio.get(chave) ?? { quantidade: 0, estoqueMinimo: 0 };
    porRemedio.set(chave, {
      quantidade: atual.quantidade + (Number(linha.quantidade) || 0),
      estoqueMinimo: Math.max(atual.estoqueMinimo, Number(linha.estoqueMinimo) || 0),
    });
  }
  return new Map([...porRemedio].map(([chave, item]) => [chave, comSituacao(item)]));
}

// zerados e críticos primeiro: são os que mais precisam de reposição
const ORDEM_SITUACAO = { zerado: 0, critico: 1, ok: 2 };

// "120 un. · Em estoque", com a cor da situação
function EstoqueNaLista({ item }) {
  if (!item) return <span className="repo-estoque repo-estoque-neutral"><i aria-hidden="true" />Não tem na unidade</span>;
  const { label, tone } = situacao(item.situacao);
  return (
    <span className={`repo-estoque repo-estoque-${tone}`}>
      <i aria-hidden="true" />
      {item.quantidade.toLocaleString("pt-BR")} un. · {label}
    </span>
  );
}

function validar(items) {
  const erros = {};
  items.forEach((item) => {
    const quantidade = Number(item.quantidade);
    if (!item.idRemedio) erros[`${item.key}-remedio`] = "Selecione o remédio.";
    if (!item.quantidade || !Number.isInteger(quantidade) || quantidade <= 0) {
      erros[`${item.key}-quantidade`] = "Informe um número inteiro maior que zero.";
    }
  });
  return erros;
}

// Formulário do funcionário para pedir reposição de estoque ao gerente.
// itensIniciais ([{ idRemedio, quantidade }]) e prioridadeInicial já preenchem o
// pedido (ex.: a partir de um item crítico do estoque); tudo pode ser editado.
export default function SolicitarReposicao({
  medicines,
  funcionario,
  remedioInicial,
  itensIniciais,
  prioridadeInicial = "media",
  onClose,
  onSuccess,
}) {
  const { idFuncionario } = funcionario;
  const uid = useId();
  const [items, setItems] = useState(() =>
    itensIniciais?.length
      ? itensIniciais.map((item) => novoItem(item.idRemedio, item.quantidade))
      : [novoItem(remedioInicial)],
  );
  const [prioridade, setPrioridade] = useState(prioridadeInicial);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erros, setErros] = useState({});
  const [erroEnvio, setErroEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [chamado, setChamado] = useState(null);
  const [estoque, setEstoque] = useState(null);
  const { idFarmacia } = funcionario;

  // quanto tem de cada remédio na farmácia agora (aparece na escolha do remédio)
  useEffect(() => {
    if (!idFarmacia) return undefined;
    const controller = new AbortController();
    listarEstoqueFarmacia(idFarmacia, {}, { signal: controller.signal })
      .then((dados) => setEstoque(estoquePorRemedio(dados?.estoque)))
      .catch(() => {});
    return () => controller.abort();
  }, [idFarmacia]);

  const remediosOrdenados = useMemo(() => {
    if (!estoque) return medicines;
    const ordem = (m) => {
      const item = estoque.get(String(m.id));
      return item ? ORDEM_SITUACAO[item.situacao] ?? 2 : 3;
    };
    return [...medicines].sort((a, b) => ordem(a) - ordem(b));
  }, [medicines, estoque]);

  function atualizar(key, campo, valor) {
    setItems((atual) => atual.map((item) => (item.key === key ? { ...item, [campo]: valor } : item)));
    setErros((atual) => ({ ...atual, [`${key}-${campo === "idRemedio" ? "remedio" : "quantidade"}`]: undefined }));
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    const encontrados = validar(items);
    setErros(encontrados);
    setErroEnvio("");
    if (Object.keys(encontrados).length) return;

    const body = {
      prioridade,
      remedios: items.map((item) => ({ idRemedio: Number(item.idRemedio), quantidade: Number(item.quantidade) })),
      ...(titulo.trim() && { titulo: titulo.trim() }),
      ...(descricao.trim() && { descricao: descricao.trim() }),
    };
    setEnviando(true);
    try {
      const { chamado: criado } = await solicitarChamado(idFuncionario, body);
      setChamado(criado);
      onSuccess?.(criado);
    } catch (error) {
      setErroEnvio(error.message);
    } finally {
      setEnviando(false);
    }
  }

  if (chamado) {
    return (
      <ChamadoModal title="Solicitação enviada" onClose={onClose}>
        <div className="chamado-confirmacao" role="status">
          <p>
            <strong>
              Solicitação #{chamado.idChamado} enviada para {nomesGerentes(chamado.gerentes)}
            </strong>
          </p>
          <StatusChamadoBadge status={chamado.status} />
        </div>
        <RemediosChamadoTable remedios={chamado.remedios} />
        <div className="mgr-modal-actions">
          <Link className="mgr-secondary" to="/funcionario/chamados" onClick={onClose}>
            Ver minhas solicitações
          </Link>
          <button type="button" className="mgr-primary" onClick={onClose}>Fechar</button>
        </div>
      </ChamadoModal>
    );
  }

  if (!idFuncionario) {
    return (
      <ChamadoModal title="Solicitar reposição" onClose={onClose}>
        {funcionario.loading ? (
          <p className="mgr-empty" role="status">Carregando funcionários…</p>
        ) : (
          <p className="mgr-empty" role="alert">
            {funcionario.error || "Nenhum funcionário cadastrado na API."}
          </p>
        )}
      </ChamadoModal>
    );
  }

  const erroId = (key, campo) => `${uid}-${key}-${campo}`;
  return (
    <ChamadoModal title="Solicitar reposição" onClose={onClose} className="emp-service-modal">
      <form className="mgr-form emp-service-form" onSubmit={enviar} noValidate aria-busy={enviando}>
        <fieldset disabled={enviando} className="emp-service-fields">
          {!funcionario.temSessao && (
            <label>
              Funcionário solicitante
              <select value={idFuncionario} onChange={(e) => funcionario.escolher(e.target.value)}>
                {funcionario.funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}{f.role ? ` · ${f.role}` : ""}</option>
                ))}
              </select>
            </label>
          )}
          <fieldset className="emp-service-medicines">
            <legend>Remédios para repor</legend>
            {items.map((item, index) => {
              const erroRemedio = erros[`${item.key}-remedio`];
              const erroQuantidade = erros[`${item.key}-quantidade`];
              const noEstoque = estoque && item.idRemedio ? estoque.get(item.idRemedio) : undefined;
              return (
                <div className="emp-service-item repo-item" key={item.key}>
                  <BuscaSelect
                    label={`Remédio ${index + 1}`}
                    // um remédio só aparece uma vez no pedido
                    itens={remediosOrdenados.filter(
                      (m) => !items.some((outro) => outro.key !== item.key && outro.idRemedio === String(m.id)),
                    )}
                    valorId={item.idRemedio}
                    onChange={(m) => atualizar(item.key, "idRemedio", m ? String(m.id) : "")}
                    getId={(m) => m.id}
                    rotulo={(m) => `${m.name}${m.dose ? ` · ${m.dose}` : ""}`}
                    detalhe={estoque ? (m) => <EstoqueNaLista item={estoque.get(String(m.id))} /> : undefined}
                    textoBusca={(m) => `${m.name} ${m.dose ?? ""}`}
                    placeholder="Busque o remédio"
                    invalido={Boolean(erroRemedio)}
                    describedBy={erroRemedio ? erroId(item.key, "remedio") : undefined}
                    semResultado="Nenhum remédio encontrado."
                  >
                    {estoque && item.idRemedio && (
                      <div className="repo-estoque-atual">
                        <span>{noEstoque ? "No estoque agora" : "Este remédio não tem na unidade"}</span>
                        {noEstoque && <BarraEstoque quantidade={noEstoque.quantidade} minimo={noEstoque.estoqueMinimo} />}
                      </div>
                    )}
                    {erroRemedio && <small className="chamado-field-error" id={erroId(item.key, "remedio")}>{erroRemedio}</small>}
                  </BuscaSelect>
                  <label>
                    Quantidade
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={item.quantidade}
                      onChange={(e) => atualizar(item.key, "quantidade", e.target.value)}
                      aria-invalid={Boolean(erroQuantidade)}
                      aria-describedby={erroQuantidade ? erroId(item.key, "quantidade") : undefined}
                    />
                    {erroQuantidade && <small className="chamado-field-error" id={erroId(item.key, "quantidade")}>{erroQuantidade}</small>}
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
                </div>
              );
            })}
            <button
              type="button"
              className="mgr-secondary"
              disabled={items.length >= medicines.length}
              onClick={() => setItems((atual) => [...atual, novoItem()])}
            >
              + Adicionar remédio
            </button>
          </fieldset>
          <div className="mgr-form-row">
            <label>
              Prioridade
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                {Object.entries(PRIORIDADE_CHAMADO).map(([valor, { label }]) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Título (opcional)
              <input
                value={titulo}
                maxLength={140}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Gerado a partir dos remédios"
              />
            </label>
          </div>
          <label>
            Descrição (opcional)
            <textarea
              rows="3"
              maxLength={2000}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: muitas receitas essa semana"
            />
          </label>
          {items.length >= 2 && (
            <p className="chamado-pacote-resumo" aria-live="polite">
              <span className="mgr-badge chamado-badge blue">Pacote · {items.length} remédios</span>
              Um chamado só; o gerente pede todos à rede de uma vez.
            </p>
          )}
          {erroEnvio && <p role="alert">{erroEnvio}</p>}
          <div className="mgr-modal-actions">
            <button className="mgr-secondary" type="button" onClick={onClose}>Cancelar</button>
            <button className="mgr-primary" type="submit" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar solicitação"}
            </button>
          </div>
        </fieldset>
      </form>
    </ChamadoModal>
  );
}
