import { useEffect, useRef, useState } from "react";
import { usePerfil } from "./perfilContext";
import { EstadoPerfil } from "./Blocos";
import ManagerIcon from "../ManagerIcon";
import { LinhaRastreavel, RastreioMini } from "../Rastreio";
import {
  DespachoResumo,
  PrioridadeBadge,
  SituacaoItemBadge,
  StatusPedidoBadge,
} from "../Chamados";
import { DisponibilidadeRede, ResponderChamado, TentarDeNovo } from "../ChamadosGerente";
import { TarjaBadge } from "../Remedios";
import { avisarDadosAlterados, useFocoTitulo, usePerfilDados } from "../../hooks/useResumo";
import { useAtualizacaoPeriodica, useEnderecosFarmacias } from "../../hooks/useRastreio";
import { formatarDataChamado, statusChamado, tempoDesde } from "../../services/chamados";
import { comSegundos, duracao, encerrado, etapasDoProcesso, hora, item, ms, protocoloDoChamado } from "../../services/relatorio";
import { emAndamento, pedidosDoChamadoParaRastrear } from "../../services/rastreio";
import { turno } from "../../services/perfil";

// Registro de atividades montado com as datas que o sistema guarda
function atividades(c) {
  const lista = [{ quando: c.dataAbertura, texto: <><strong>Chamado aberto</strong> por {c.funcionario?.nomeFuncionario}</>, quem: "Funcionário" }];
  if (c.resposta) {
    lista.push({
      quando: c.resposta.dataResposta,
      texto: c.status === "recusado"
        ? <><strong>Recusado</strong> por {c.resposta.nomeGerente}{c.resposta.respostaGerente ? ` — “${c.resposta.respostaGerente}”` : ""}</>
        : <><strong>Aceito</strong> por {c.resposta.nomeGerente} · pedidos enviados à rede</>,
      quem: "Gerente",
    });
  }
  for (const p of c.pedidos ?? []) {
    lista.push({ quando: p.dataSolicitacao, texto: <><strong>Pedido #{p.idRedistribuicao}</strong> enviado à {p.nomeFarmaciaOrigem} ({item(p)})</>, quem: "Sistema" });
    if (p.dataRecusa) {
      lista.push({ quando: p.dataRecusa, texto: <><strong>{p.nomeFarmaciaOrigem} recusou</strong> o pedido #{p.idRedistribuicao}{p.motivoRecusa ? ` — “${p.motivoRecusa}”` : ""}</>, quem: "Fornecedora" });
    }
    if (p.dataAprovacao) {
      lista.push({ quando: p.dataAprovacao, texto: <><strong>{p.nomeFarmaciaOrigem} aceitou</strong> o pedido #{p.idRedistribuicao}{p.nomeGerenteResposta ? ` (${p.nomeGerenteResposta})` : ""}</>, quem: "Fornecedora" });
    }
    if (p.dataEnvio) {
      lista.push({ quando: p.dataEnvio, texto: <><strong>Saiu para entrega</strong> · {item(p)}, da {p.nomeFarmaciaOrigem}</>, quem: "Sistema" });
    }
    if (p.dataRecebimento) {
      lista.push({ quando: p.dataRecebimento, texto: <><strong>Entregue</strong> na {p.nomeFarmaciaDestino} · {item(p)}</>, quem: "Sistema" });
    }
  }
  if (c.status === "resolvido") {
    const fim = (c.pedidos ?? []).map((p) => p.dataRecebimento).filter(Boolean).sort().at(-1);
    if (fim) lista.push({ quando: fim, texto: <><strong>Chamado resolvido</strong> · todos os remédios chegaram</>, quem: "Sistema", fim: true });
  }
  return lista
    .filter((a) => a.quando)
    .map((a, i) => ({ ...a, ordem: i }))
    .sort((a, b) => ms(a.quando) - ms(b.quando) || a.ordem - b.ordem);
}

const SECOES = [
  ["solicitacao", "Solicitação"],
  ["itens", "Itens solicitados"],
  ["decisao", "Decisão do gerente"],
  ["pedidos", "Pedidos à rede"],
  ["atividades", "Registro de atividades"],
];

// Sumário fixo: rola até a seção e marca a que está na tela
function Sumario({ raiz }) {
  const [ativa, setAtiva] = useState(SECOES[0][0]);
  useEffect(() => {
    const secoes = SECOES.map(([id]) => raiz.current?.querySelector(`[data-secao="${id}"]`)).filter(Boolean);
    if (!secoes.length || typeof IntersectionObserver === "undefined") return undefined;
    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel) setAtiva(visivel.target.dataset.secao);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    secoes.forEach((s) => observador.observe(s));
    return () => observador.disconnect();
  }, [raiz]);
  function ir(id) {
    const alvo = raiz.current?.querySelector(`[data-secao="${id}"]`);
    if (!alvo) return;
    window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
    alvo.querySelector("h2")?.focus({ preventScroll: true });
    setAtiva(id);
  }
  return (
    <nav className="rel-sumario" aria-label="Seções do relatório">
      <p>Neste relatório</p>
      {SECOES.map(([id, rotulo], i) => (
        <button key={id} type="button" aria-current={ativa === id ? "true" : undefined} onClick={() => ir(id)}>
          {i + 1}. {rotulo}
        </button>
      ))}
      <div className="rel-seguro">
        <ManagerIcon name="lock" size={16} />
        <span>Registro somente leitura. As ações ficam gravadas com data, hora e responsável.</span>
      </div>
    </nav>
  );
}

function Secao({ id, numero, titulo, children }) {
  return (
    <section className="rel-secao" data-secao={id} aria-labelledby={`rel-${id}`}>
      <h2 id={`rel-${id}`} tabIndex={-1}><span className="rel-n">{numero}</span>{titulo}</h2>
      {children}
    </section>
  );
}

// GET /chamado/:id — relatório do chamado (funcionário, gerente e admin)
export default function RelatorioChamado({ id }) {
  const { abrirPerfil, plataforma, idFarmaciaAtual, idGerenteAtual } = usePerfil();
  const estado = usePerfilDados("chamado", id, (c) => protocoloDoChamado(c));
  const enderecos = useEnderecosFarmacias();
  const raiz = useRef(null);
  const [despacho, setDespacho] = useState(null);
  const [aviso, setAviso] = useState("");
  const [semFornecedor, setSemFornecedor] = useState(false);
  const c = estado.data;
  // acompanha sozinho enquanto há resposta pendente ou remédio a caminho
  const rastreaveis = c ? pedidosDoChamadoParaRastrear(c) : [];
  useAtualizacaoPeriodica(Boolean(c) && (c.status === "pendente" || rastreaveis.some(emAndamento)), estado.atualizar);

  return (
    <EstadoPerfil estado={estado}>
      {c && (
        <Relatorio
          c={c}
          raiz={raiz}
          enderecos={enderecos}
          abrirPerfil={abrirPerfil}
          podeResponder={plataforma === "gerente" && Boolean(idGerenteAtual) && String(c.farmacia?.idFarmacia) === String(idFarmaciaAtual)}
          idGerente={idGerenteAtual}
          despacho={despacho}
          aviso={aviso}
          semFornecedor={semFornecedor}
          setSemFornecedor={setSemFornecedor}
          aoResponder={(resultado) => {
            setDespacho(resultado);
            setAviso("");
            estado.atualizar();
            avisarDadosAlterados({ tipo: "chamado", id: c.idChamado });
          }}
          aoConflito={(mensagem) => {
            setAviso(mensagem);
            estado.atualizar();
            avisarDadosAlterados({ tipo: "chamado", id: c.idChamado });
          }}
          aoRedistribuir={() => {
            estado.atualizar();
            avisarDadosAlterados({ tipo: "chamado", id: c.idChamado });
          }}
        />
      )}
    </EstadoPerfil>
  );
}

function Relatorio({ c, raiz, enderecos, abrirPerfil, podeResponder, idGerente, despacho, aviso, semFornecedor, setSemFornecedor, aoResponder, aoConflito, aoRedistribuir }) {
  const titulo = useFocoTitulo();
  const f = c.funcionario ?? {};
  const unidade = enderecos[String(c.farmacia?.idFarmacia)] ?? {};
  const protocolo = protocoloDoChamado(c);
  const pedidosPorId = new Map((c.pedidos ?? []).map((p) => [p.idRedistribuicao, p]));
  const etapas = etapasDoProcesso(c);
  const pedidos = c.pedidos ?? [];
  const previsao = pedidos.filter((p) => p.status === "enviada").map((p) => p.dataPrevistaChegada).sort().at(-1);
  const ultimaChegada = pedidos.map((p) => p.dataRecebimento).filter(Boolean).sort().at(-1);
  const temSemFornecedor = (c.remedios ?? []).some((r) => r.situacao === "sem_fornecedor");
  const tom = statusChamado(c.status).tone;
  const link = (tipo, idAlvo, texto) => (idAlvo
    ? <button type="button" className="rel-link" onClick={(e) => abrirPerfil(tipo, idAlvo, e.currentTarget)}>{texto}</button>
    : texto || "—");

  return (
    <div className="rel-area" ref={raiz}>
      <article className="rel-doc" aria-labelledby="rel-titulo">
        <header className="rel-cabecalho">
          <div className="rel-emissor">
            <span className="rel-selo" aria-hidden="true">i</span>
            <div>
              <small>Rede Intermedi · Relatório de chamado</small>
              <strong>{c.farmacia?.nomeFarmacia}</strong>
            </div>
          </div>
          <div className="rel-protocolo">
            <small>Protocolo</small>
            <b className="rel-mono">{protocolo}</b>
            <span>Aberto em {formatarDataChamado(c.dataAbertura)}</span>
          </div>
          <button type="button" className="rel-imprimir" onClick={() => window.print()}>
            <ManagerIcon name="print" size={16} />
            Imprimir / PDF
          </button>
        </header>

        <div className="rel-titulo">
          <div>
            <h1 id="rel-titulo" ref={titulo} className="perfil-foco-inicial" tabIndex={-1}>{c.titulo}</h1>
            <p>Pedido de reposição de estoque <PrioridadeBadge prioridade={c.prioridade} /></p>
          </div>
          <span className={`rel-carimbo rel-${tom}`}>{statusChamado(c.status).label}</span>
        </div>

        <dl className="rel-ficha">
          <div>
            <dt>Solicitante</dt>
            <dd>{link("funcionario", f.idFuncionario, f.nomeFuncionario)}<small>{[f.cargoFuncionario, turno(f.turnoFuncionario), f.matriculaFuncionario && `Mat. ${f.matriculaFuncionario}`].filter(Boolean).join(" · ")}</small></dd>
          </div>
          <div>
            <dt>Unidade</dt>
            <dd>{link("farmacia", c.farmacia?.idFarmacia, c.farmacia?.nomeFarmacia)}<small>{[unidade.bairro, [unidade.cidade, unidade.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ") || "—"}</small></dd>
          </div>
          <div>
            <dt>Responsável</dt>
            <dd>
              {c.resposta
                ? link("gerente", c.resposta.idGerente, c.resposta.nomeGerente)
                : <span className="rel-pendente">Aguardando resposta</span>}
              <small>{c.resposta ? "Gerente da unidade" : (c.gerentes ?? []).map((g) => g.nomeGerente).join(", ") || "Gerentes da unidade"}</small>
            </dd>
          </div>
          <div>
            <dt>Aberto em</dt>
            <dd>{formatarDataChamado(c.dataAbertura)}<small>{tempoDesde(c.dataAbertura)}</small></dd>
          </div>
          <div>
            <dt>Respondido em</dt>
            <dd>{c.resposta ? formatarDataChamado(c.resposta.dataResposta) : "—"}<small>{c.resposta ? `${duracao(c.dataAbertura, c.resposta.dataResposta)} após a abertura` : "Ainda não respondido"}</small></dd>
          </div>
          <div>
            <dt>Encerramento</dt>
            <dd>
              {c.status === "resolvido" && ultimaChegada
                ? formatarDataChamado(ultimaChegada)
                : encerrado(c.status)
                  ? formatarDataChamado(c.resposta?.dataResposta)
                  : previsao ? `Previsto ${hora(previsao)}` : "—"}
              <small>
                {c.status === "resolvido"
                  ? `${duracao(c.dataAbertura, ultimaChegada)} do início ao fim`
                  : encerrado(c.status) ? "Encerrado sem reposição" : "Quando todos os remédios chegarem"}
              </small>
            </dd>
          </div>
        </dl>

        <div className="rel-processo">
          <ol aria-label="Andamento do chamado">
            {etapas.map((e) => (
              <li key={e.id} className={e.situacao} aria-current={e.situacao === "atual" ? "step" : undefined}>
                <span aria-hidden="true" />
                <strong>{e.titulo}</strong>
                <small>{e.quando || "—"}</small>
              </li>
            ))}
          </ol>
        </div>

        <Secao id="solicitacao" numero={1} titulo="Solicitação">
          {c.descricao ? (
            <blockquote className="rel-relato">
              “{c.descricao}”
              <cite>— {f.nomeFuncionario}, ao abrir o chamado</cite>
            </blockquote>
          ) : (
            <p className="rel-vazio">O funcionário não escreveu observações.</p>
          )}
        </Secao>

        <Secao id="itens" numero={2} titulo="Itens solicitados">
          <div className="rel-tabela">
            <table>
              <thead>
                <tr><th scope="col">Remédio</th><th scope="col" className="rel-num">Qtd.</th><th scope="col">Fornecedora</th><th scope="col">Situação</th></tr>
              </thead>
              <tbody>
                {(c.remedios ?? []).map((r) => {
                  const p = r.pedidoAtual;
                  const completo = p && pedidosPorId.get(p.idRedistribuicao);
                  const fornecedora = p?.idFarmaciaFornecedora && enderecos[String(p.idFarmaciaFornecedora)];
                  return (
                    <LinhaRastreavel key={r.idRemedio} colSpan={4} pedido={["a_caminho", "recebido"].includes(r.situacao) ? completo : null} celulas={(botao) => (<>
                      <td>
                        {link("remedio", r.idRemedio, <strong>{[r.nomeRemedio, r.dosagemRemedio].filter(Boolean).join(" ")}</strong>)}
                        {r.tarjaRemedio && <small><TarjaBadge valor={r.tarjaRemedio} /></small>}
                      </td>
                      <td className="rel-num">{r.quantidadeSolicitada} un.</td>
                      <td>
                        {p?.nomeFarmaciaFornecedora && r.situacao !== "sem_fornecedor"
                          ? <>{link("farmacia", p.idFarmaciaFornecedora, p.nomeFarmaciaFornecedora)}<small>{fornecedora?.bairro || ""}</small></>
                          : "—"}
                      </td>
                      <td>
                        {r.situacao ? <SituacaoItemBadge situacao={r.situacao} /> : "—"}
                        {r.situacao === "a_caminho" && completo && <div className="rel-mini"><RastreioMini pedido={completo} />{botao}</div>}
                        {r.situacao === "recebido" && p?.dataRecebimento && <small>Chegou em {formatarDataChamado(p.dataRecebimento)}</small>}
                    {r.situacao === "recebido" && completo && botao}
                      </td>
                    </>)} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </Secao>

        <Secao id="decisao" numero={3} titulo="Decisão do gerente">
          {aviso && <p className="chamado-inline-error chamado-aviso" role="alert">{aviso}</p>}
          {c.status === "pendente" ? (
            podeResponder ? (
              <div className="rel-responder">
                <p className="rel-vazio">Este chamado aguarda a sua decisão. Antes de aceitar, confira se a rede tem os remédios.</p>
                <DisponibilidadeRede chamado={c} idGerente={idGerente} onCarregado={(dados) => setSemFornecedor(dados.todosTemFornecedor === false)} />
                <ResponderChamado
                  chamado={c}
                  idGerente={idGerente}
                  avisoSemFornecedor={semFornecedor}
                  onRespondido={(_, resultado) => aoResponder(resultado)}
                  onConflito={aoConflito}
                />
              </div>
            ) : (
              <p className="rel-vazio">
                Aguardando a decisão de {(c.gerentes ?? []).map((g) => g.nomeGerente).join(" ou ") || "um gerente da unidade"}.
              </p>
            )
          ) : c.resposta ? (
            <div className={`rel-decisao ${c.status === "recusado" ? "recusado" : "aceito"}`}>
              <span className="rel-decisao-icone" aria-hidden="true">{c.status === "recusado" ? "✕" : "✓"}</span>
              <div>
                <strong>{c.status === "recusado" ? "Recusado" : "Aceito"} por {link("gerente", c.resposta.idGerente, c.resposta.nomeGerente)}</strong>
                {c.resposta.respostaGerente && <p>“{c.resposta.respostaGerente}”</p>}
                <small>
                  {formatarDataChamado(c.resposta.dataResposta)}
                  {c.status === "recusado" ? " · nenhum remédio foi pedido à rede" : " · os remédios foram pedidos às farmácias com estoque"}
                </small>
              </div>
            </div>
          ) : (
            <p className="rel-vazio">Sem decisão registrada.</p>
          )}
          {despacho && <DespachoResumo despacho={despacho} />}
          {podeResponder && c.status === "em_andamento" && temSemFornecedor && (
            <TentarDeNovo chamado={c} idGerente={idGerente} onRedistribuido={aoRedistribuir} />
          )}
        </Secao>

        <Secao id="pedidos" numero={4} titulo="Pedidos à rede">
          {pedidos.length ? (
            <div className="rel-tabela">
              <table>
                <thead>
                  <tr><th scope="col">Pedido</th><th scope="col">Remédio</th><th scope="col">Fornecedora</th><th scope="col">Situação</th><th scope="col" className="rel-num">Atualizado</th></tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => {
                    const ultima = [p.dataRecebimento, p.dataEnvio, p.dataRecusa, p.dataAprovacao, p.dataSolicitacao].find(Boolean);
                    return (
                      <tr key={p.idRedistribuicao}>
                        <td className="rel-mono">{link("pedido", p.idRedistribuicao, `#${p.idRedistribuicao}`)}</td>
                        <td>{item(p)}</td>
                        <td>{link("farmacia", p.idFarmaciaOrigem, p.nomeFarmaciaOrigem)}{p.motivoRecusa && <small>Motivo: {p.motivoRecusa}</small>}</td>
                        <td><StatusPedidoBadge status={p.status} /></td>
                        <td className="rel-num">{formatarDataChamado(ultima, { ano: false })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rel-vazio">
              {c.status === "pendente" ? "Os pedidos à rede são feitos quando o gerente aceita o chamado." : "Nenhum pedido foi feito à rede."}
            </p>
          )}
        </Secao>

        <Secao id="atividades" numero={5} titulo="Registro de atividades">
          <div className="rel-tabela">
            <table className="rel-auditoria">
              <thead>
                <tr><th scope="col">Data e hora</th><th scope="col">Atividade</th><th scope="col">Origem</th></tr>
              </thead>
              <tbody>
                {atividades(c).map((a, i) => (
                  <tr key={i} className={a.fim ? "rel-fim" : undefined}>
                    <td className="rel-mono">{comSegundos(a.quando)}</td>
                    <td>{a.texto}</td>
                    <td>{a.quem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>

        <footer className="rel-rodape">
          <span>Intermedi · Conectando farmácias. Aproximando o cuidado.</span>
          <span className="rel-mono">{protocolo}</span>
        </footer>
      </article>
      <Sumario raiz={raiz} />
    </div>
  );
}
