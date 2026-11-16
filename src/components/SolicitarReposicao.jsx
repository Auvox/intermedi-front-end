import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarEstoqueFarmacia, solicitarChamado } from "../services/api";
import { PRIORIDADE_CHAMADO } from "../services/chamados";
import { comSituacao, situacao } from "../services/remedios";
import BuscaSelect from "./BuscaSelect";
import { ChamadoModal, RemediosChamadoTable, StatusChamadoBadge } from "./Chamados";
import { BarraEstoque, FotoRemedio } from "./Remedios";

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
          <fieldset className="emp-service-medicines repo-itens">
            <legend>O que está faltando?</legend>
            {items.map((item, index) => {
              const erroRemedio = erros[`${item.key}-remedio`];
              const erroQuantidade = erros[`${item.key}-quantidade`];
              const noEstoque = estoque && item.idRemedio ? estoque.get(item.idRemedio) : undefined;
              const remedio = item.idRemedio ? medicines.find((m) => String(m.id) === item.idRemedio) : null;
              const remover = items.length > 1 && (
                <button
                  className="repo-remover"
                  type="button"
                  aria-label={`Remover remédio ${index + 1}`}
                  onClick={() => setItems((atual) => atual.filter((i) => i.key !== item.key))}
                >
                  Remover
                </button>
              );
              const quantidade = Number(item.quantidade) || 0;
              const passo = (delta) => atualizar(item.key, "quantidade", String(Math.max(1, quantidade + delta)));

              // ainda sem remédio: a busca (com o estoque de cada um na lista)
              if (!remedio) {
                return (
                  <div className="repo-escolher" key={item.key}>
                    <BuscaSelect
                      label={items.length > 1 ? `Remédio ${index + 1}` : "Qual remédio está faltando?"}
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
                      placeholder="Digite o nome do remédio"
                      invalido={Boolean(erroRemedio)}
                      describedBy={erroRemedio ? erroId(item.key, "remedio") : undefined}
                      semResultado="Nenhum remédio encontrado."
                    >
                      {erroRemedio && <small className="chamado-field-error" id={erroId(item.key, "remedio")}>{erroRemedio}</small>}
                    </BuscaSelect>
                    {remover}
                  </div>
                );
              }

              // remédio escolhido: cartão com foto, estoque atual e a quantidade
              return (
                <div className="repo-cartao" key={item.key}>
                  <FotoRemedio foto={remedio.photo} nome={remedio.name} tamanho="md" />
                  <div className="repo-cartao-info">
                    <strong>{remedio.name}{remedio.dose ? ` ${remedio.dose}` : ""}</strong>
                    {remedio.presentation && <span>{remedio.presentation}</span>}
                    {estoque && (
                      <div className="repo-estoque-atual">
                        <span>{noEstoque ? "No estoque agora" : "Este remédio não tem na unidade"}</span>
                        {noEstoque && <BarraEstoque quantidade={noEstoque.quantidade} minimo={noEstoque.estoqueMinimo} />}
                      </div>
                    )}
                  </div>
                  <div className="repo-quantidade">
                    <label htmlFor={erroId(item.key, "qtd")}>Quantas unidades?</label>
                    <div className="repo-passos">
                      <button type="button" onClick={() => passo(-10)} aria-label="Menos 10">−</button>
                      <input
                        id={erroId(item.key, "qtd")}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        placeholder="0"
                        value={item.quantidade}
                        onChange={(e) => atualizar(item.key, "quantidade", e.target.value)}
                        aria-invalid={Boolean(erroQuantidade)}
                        aria-describedby={erroQuantidade ? erroId(item.key, "quantidade") : undefined}
                      />
                      <button type="button" onClick={() => passo(10)} aria-label="Mais 10">+</button>
                    </div>
                    {erroQuantidade && <small className="chamado-field-error" id={erroId(item.key, "quantidade")}>{erroQuantidade}</small>}
                  </div>
                  <div className="repo-cartao-acoes">
                    <button type="button" className="repo-trocar" onClick={() => atualizar(item.key, "idRemedio", "")}>Trocar</button>
                    {remover}
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              className="repo-adicionar"
              disabled={items.length >= medicines.length}
              onClick={() => setItems((atual) => [...atual, novoItem()])}
            >
              + Adicionar outro remédio
            </button>
          </fieldset>
          <fieldset className="repo-prioridade">
            <legend>Quão urgente?</legend>
            <div className="repo-prioridade-opcoes">
              {Object.entries(PRIORIDADE_CHAMADO).map(([valor, { label }]) => (
                <button
                  key={valor}
                  type="button"
                  className={`is-${valor}`}
                  aria-pressed={prioridade === valor}
                  onClick={() => setPrioridade(valor)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            Título (opcional)
            <input
              value={titulo}
              maxLength={140}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Gerado a partir dos remédios"
            />
          </label>
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
