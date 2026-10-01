import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EnviarFoto from "./EnviarFoto";
import { usePerfil } from "./perfilContext";
import {
  AbaChamados,
  AbaEquipe,
  AbaServicos,
  Detalhes,
  EstoqueAtencao,
  GraficoServicos,
  Grade,
  PerfilLayout,
  Secao,
  TopRemedios,
  UltimosServicos,
} from "./Blocos";
import PersonaAvatar from "../PersonaAvatar";
import { ErroComRetry } from "../Chamados";
import { EstoqueTabela } from "../Remedios";
import ManagerIcon from "../ManagerIcon";
import { avisarDadosAlterados, useFocoTitulo, usePerfilDados } from "../../hooks/useResumo";
import { fotoPessoa, listarEstoqueFarmacia, normalizeText } from "../../services/api";
import { comSituacao, ordenarEstoque } from "../../services/remedios";
import { formatarDataChamado } from "../../services/chamados";
import { endereco, numero } from "../../services/perfil";

const plural = (n, um, varios) => `${numero(n)} ${Number(n) === 1 ? um : varios}`;

// Cabeçalho institucional: logo, nome e uma faixa com o que se usa no dia a dia
// (onde fica, como falar com a unidade e quem responde por ela)
function TopoFarmacia({ farmacia: f, gerentes, acoes }) {
  const titulo = useFocoTitulo();
  const { abrirPerfil } = usePerfil();
  const local = endereco(f, "Farmacia");
  const cidade = [f.bairroFarmacia, [f.cidadeFarmacia, f.ufFarmacia].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  return (
    <header className="inst-topo">
      <div className="inst-identidade">
        <span className="inst-marca">
          {f.fotoFarmacia ? <img src={fotoPessoa(f.fotoFarmacia)} alt={`Logo da ${f.nomeFarmacia}`} /> : <ManagerIcon name="pharmacy" size={38} />}
        </span>
        <div className="inst-nome">
          <p className="inst-sobre">Unidade da rede Intermedi{f.cnesFarmacia ? ` · CNES ${f.cnesFarmacia}` : ""}</p>
          <h1 ref={titulo} className="perfil-foco-inicial" tabIndex={-1}>{f.nomeFarmacia}</h1>
          {cidade && <p className="inst-cidade">{cidade}</p>}
        </div>
        {acoes && <div className="inst-acoes">{acoes}</div>}
      </div>

      <div className="inst-faixa">
        <div>
          <span className="inst-faixa-rotulo"><ManagerIcon name="map" size={15} />Endereço</span>
          <p>{local || "Não informado"}</p>
          {local && (
            <a
              className="inst-faixa-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.nomeFarmacia}, ${local}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver no mapa ↗
            </a>
          )}
        </div>
        <div>
          <span className="inst-faixa-rotulo"><ManagerIcon name="phone" size={15} />Contato</span>
          {f.telFarmacia ? <a href={`tel:${f.telFarmacia.replace(/[^\d+]/g, "")}`}>{f.telFarmacia}</a> : <p>Telefone não informado</p>}
          {f.emailFarmacia && <a href={`mailto:${f.emailFarmacia}`}>{f.emailFarmacia}</a>}
        </div>
        <div>
          <span className="inst-faixa-rotulo"><ManagerIcon name="people" size={15} />Responsáveis</span>
          {gerentes.length ? (
            <ul className="inst-responsaveis">
              {gerentes.slice(0, 2).map((g) => (
                <li key={g.idGerente}>
                  <button type="button" onClick={(e) => abrirPerfil("gerente", g.idGerente, e.currentTarget)}>
                    <PersonaAvatar role="gerente" photo={fotoPessoa(g.fotoGerente)} name={g.nomeGerente} />
                    <span>{g.nomeGerente}</span>
                  </button>
                </li>
              ))}
              {gerentes.length > 2 && <li className="inst-mais">+{gerentes.length - 2}</li>}
            </ul>
          ) : (
            <p>Nenhum gerente cadastrado</p>
          )}
        </div>
        <div>
          <span className="inst-faixa-rotulo"><ManagerIcon name="calendar" size={15} />Na rede desde</span>
          <p>{f.createdAtFarmacia ? formatarDataChamado(f.createdAtFarmacia).slice(0, 10) : "—"}</p>
        </div>
      </div>
    </header>
  );
}

// Estoque completo da farmácia (GET /farmacia/:id/estoque), com busca e filtro.
// Os que precisam de atenção vêm primeiro.
const FILTROS_ESTOQUE = [
  ["", "Todos"],
  ["atencao", "Precisam de atenção"],
  ["critico", "Críticos"],
  ["zerado", "Zerados"],
  ["vencido", "Vencidos"],
];
function EstoqueDaFarmacia({ idFarmacia, link }) {
  const { abrirPerfil } = usePerfil();
  const [estado, setEstado] = useState({ itens: null, erro: "" });
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    listarEstoqueFarmacia(idFarmacia, {}, { signal: controller.signal })
      .then((dados) => setEstado({ itens: (dados.estoque ?? []).map(comSituacao), erro: "" }))
      .catch((erro) => { if (!controller.signal.aborted) setEstado({ itens: null, erro: erro.message }); });
    return () => controller.abort();
  }, [idFarmacia, tentativa]);

  if (estado.erro) return <ErroComRetry message={estado.erro} onRetry={() => { setEstado({ itens: null, erro: "" }); setTentativa((t) => t + 1); }} />;
  if (!estado.itens) return <p className="perfil-vazio" role="status">Carregando estoque…</p>;

  const termo = normalizeText(busca.trim());
  const passa = (item) =>
    !filtro
      ? true
      : filtro === "atencao"
        ? item.vencido || item.situacao !== "ok"
        : filtro === "vencido"
          ? item.vencido
          : item.situacao === filtro;
  const itens = ordenarEstoque(estado.itens).filter(
    (item) => passa(item) && (!termo || normalizeText(`${item.nomeRemedio} ${item.principioAtivoRemedio ?? ""} ${item.fabricanteRemedio ?? ""}`).includes(termo)),
  );
  return (
    <section className="inst-estoque">
      <div className="inst-estoque-filtros">
        <input
          type="search"
          aria-label="Buscar remédio no estoque"
          placeholder="Buscar remédio, princípio ativo ou fabricante…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="perfil-chips" role="group" aria-label="Filtrar estoque">
          {FILTROS_ESTOQUE.map(([valor, rotulo]) => (
            <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>{rotulo}</button>
          ))}
        </div>
        {link}
      </div>
      {itens.length ? (
        <EstoqueTabela itens={itens} onAbrir={(item, el) => abrirPerfil("remedio", item.idRemedio, el)} />
      ) : (
        <p className="perfil-vazio">{estado.itens.length ? "Nenhum remédio com esse filtro." : "O estoque desta farmácia está vazio."}</p>
      )}
      <p className="inst-nota">{plural(itens.length, "remédio", "remédios")} · clique em um remédio para ver o perfil dele</p>
    </section>
  );
}

// Pedidos entre farmácias: o que esta unidade fornece e o que ela pede à rede
function Fluxo({ titulo, descricao, destaques, linhas, partes }) {
  const total = partes.reduce((s, [, v]) => s + (Number(v) || 0), 0);
  return (
    <section className="inst-fluxo">
      <h2>{titulo}</h2>
      <p className="inst-fluxo-desc">{descricao}</p>
      <div className="inst-fluxo-destaques">
        {destaques.map(([rotulo, valor]) => (
          <div key={rotulo}><strong>{valor}</strong><span>{rotulo}</span></div>
        ))}
      </div>
      {total > 0 && (
        <span className="inst-fluxo-barra" aria-hidden="true">
          {partes.filter(([, v]) => v > 0).map(([chave, v]) => (
            <i key={chave} className={`parte-${chave}`} style={{ width: `${(v / total) * 100}%` }} />
          ))}
        </span>
      )}
      <dl className="inst-fluxo-linhas">
        {linhas.filter(Boolean).map(([rotulo, valor, chave]) => (
          <div key={rotulo}>
            <dt>{chave && <span className={`inst-ponto parte-${chave}`} aria-hidden="true" />}{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RedeDaFarmacia({ rede }) {
  const f = rede.comoFornecedora ?? {};
  const s = rede.comoSolicitante ?? {};
  return (
    <div className="inst-rede">
      <Fluxo
        titulo="Como fornecedora"
        descricao="Pedidos de outras farmácias para esta unidade"
        destaques={[["pedidos recebidos", numero(f.total)], ["unidades enviadas", numero(f.unidadesEnviadas)]]}
        partes={[["ok", f.aceitos], ["recusado", f.recusados], ["aguardando", f.pendentesAgora]]}
        linhas={[
          ["Aceitos", numero(f.aceitos), "ok"],
          ["Recusados", numero(f.recusados), "recusado"],
          ["Aguardando resposta agora", numero(f.pendentesAgora), "aguardando"],
        ]}
      />
      <Fluxo
        titulo="Como solicitante"
        descricao="Pedidos desta unidade à rede"
        destaques={[["pedidos feitos", numero(s.total)], ["unidades recebidas", numero(s.unidadesRecebidas)]]}
        partes={[["ok", s.entregues], ["caminho", s.aCaminho], ["aguardando", s.aguardando], ["recusado", s.recusados]]}
        linhas={[
          ["Entregues", numero(s.entregues), "ok"],
          ["A caminho", numero(s.aCaminho), "caminho"],
          ["Aguardando a outra farmácia", numero(s.aguardando), "aguardando"],
          ["Recusados", numero(s.recusados), "recusado"],
        ]}
      />
    </div>
  );
}

// Visão geral em duas colunas: o movimento à esquerda, o que pede atenção à direita
function Colunas({ principal, lateral }) {
  return (
    <div className="inst-colunas">
      <div className="inst-principal">{principal}</div>
      <aside className="inst-lateral" aria-label="Resumo da unidade">{lateral}</aside>
    </div>
  );
}

export default function PerfilFarmacia({ id }) {
  const { podeTrocarFoto, plataforma } = usePerfil();
  const estado = usePerfilDados("farmacia", id, (d) => d.farmacia?.nomeFarmacia);
  const linkEstoque = plataforma === "gerente" && <Link className="perfil-link" to="/gerente/remedios">Estoque completo →</Link>;

  return (
    <PerfilLayout
      estado={estado}
      variante="instituicao"
      montar={(d) => {
        const f = d.farmacia;
        const equipe = (d.funcionarios?.total ?? 0) + (d.gerentes?.length ?? 0);
        const e = d.estoque ?? {};
        const rede = d.rede ?? {};
        const pedidosRede = (rede.comoFornecedora?.total ?? 0) + (rede.comoSolicitante?.total ?? 0);
        return {
          topo: (
            <TopoFarmacia
              farmacia={f}
              gerentes={d.gerentes ?? []}
              acoes={podeTrocarFoto?.("farmacia", f) && (
                <EnviarFoto
                  tipo="farmacia"
                  id={f.idFarmacia}
                  nome={f.nomeFarmacia}
                  fotoAtual={f.fotoFarmacia}
                  onAlterada={() => { estado.reload(); avisarDadosAlterados({ tipo: "farmacia", id: f.idFarmacia }); }}
                />
              )}
            />
          ),
          periodo: d.periodo,
          semPeriodo: ["estoque"],
          abas: [
            ["geral", "Visão geral", () => (
              <Colunas
                principal={(
                  <>
                    <GraficoServicos bloco={d.servicos} periodo={d.periodo} titulo="Atendimentos" largo={false} />
                    <TopRemedios bloco={d.servicos} />
                  </>
                )}
                lateral={(
                  <>
                    <EstoqueAtencao estoque={e} acao={linkEstoque} />
                    <UltimosServicos bloco={d.servicos} titulo="Últimos atendimentos" />
                  </>
                )}
              />
            )],
            ["equipe", "Equipe", () => <AbaEquipe equipe={d.funcionarios} gerentes={d.gerentes} />, undefined, {
              valor: numero(equipe),
              rotulo: equipe === 1 ? "pessoa na equipe" : "pessoas na equipe",
              detalhe: `${plural(d.gerentes?.length, "gerente", "gerentes")} · ${plural(d.funcionarios?.total, "funcionário", "funcionários")}`,
            }],
            ["estoque", "Estoque", () => <EstoqueDaFarmacia idFarmacia={f.idFarmacia} link={linkEstoque} />, undefined, {
              valor: numero(e.totalItens),
              rotulo: Number(e.totalItens) === 1 ? "item no estoque" : "itens no estoque",
              detalhe: `${plural(e.unidades, "unidade", "unidades")} · ${plural(e.criticos, "crítico", "críticos")} · ${plural(e.zerados, "zerado", "zerados")} · ${plural(e.vencidos, "vencido", "vencidos")}`,
            }],
            ["servicos", "Serviços", () => <AbaServicos bloco={d.servicos} periodo={d.periodo} kpis={false} />, undefined, {
              valor: numero(d.servicos.total),
              rotulo: d.servicos.total === 1 ? "atendimento no período" : "atendimentos no período",
              detalhe: `${plural(d.servicos.pacientesAtendidos, "paciente", "pacientes")} · ${plural(d.servicos.unidadesEntregues, "unidade entregue", "unidades entregues")}`,
            }],
            ["chamados", "Chamados", () => <AbaChamados bloco={d.chamados} periodo={d.periodo} kpis={false} />, undefined, {
              valor: numero(d.chamados.total),
              rotulo: d.chamados.total === 1 ? "chamado no período" : "chamados no período",
              detalhe: `${plural(d.chamados.porStatus?.pendente, "pendente", "pendentes")} · ${plural(d.chamados.porStatus?.resolvido, "resolvido", "resolvidos")} · ${plural(d.chamados.unidadesSolicitadas, "unidade pedida", "unidades pedidas")}`,
            }],
            ["rede", "Rede", () => <RedeDaFarmacia rede={rede} />, undefined, {
              valor: numero(pedidosRede),
              rotulo: pedidosRede === 1 ? "pedido com a rede no período" : "pedidos com a rede no período",
              detalhe: `${plural(rede.comoSolicitante?.total, "feito", "feitos")} por esta farmácia · ${plural(rede.comoFornecedora?.total, "recebido", "recebidos")} de outras`,
            }],
            ["sobre", "Sobre", () => (
              <Grade>
                <Secao titulo="Dados da unidade" largo>
                  <Detalhes itens={[
                    ["Nome", f.nomeFarmacia],
                    ["CNES", f.cnesFarmacia],
                    ["Telefone", f.telFarmacia],
                    ["E-mail", f.emailFarmacia],
                    ["Endereço", endereco(f, "Farmacia")],
                    ["Na rede desde", f.createdAtFarmacia ? formatarDataChamado(f.createdAtFarmacia).slice(0, 10) : null],
                  ]} />
                </Secao>
              </Grade>
            )],
          ],
        };
      }}
    />
  );
}
