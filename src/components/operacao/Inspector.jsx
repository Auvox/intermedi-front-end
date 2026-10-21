import { Link } from "react-router-dom";
import ManagerIcon from "../ManagerIcon";
import PersonaAvatar from "../PersonaAvatar";
import { BarraEstoque, TarjaBadge } from "../Remedios";
import { PrioridadeBadge, StatusChamadoBadge } from "../Chamados";
import { formatarValidade } from "../../services/remedios";
import { formatarDataChamado, statusPedido, tempoDesde } from "../../services/chamados";
import { numero } from "../../services/perfil";
import { SITUACAO_VISUAL, VALIDADE_ALERTA_DIAS, objetoSelecionado, progressoEntrega } from "../../services/operacao";
import { preparoDoPedido } from "../../services/rastreio";
import { useRelogio } from "../../hooks/useRastreio";

const ABAS = [
  ["alertas", "Alertas"],
  ["estoque", "Estoque"],
  ["equipe", "Equipe"],
  ["chamados", "Chamados"],
  ["entregas", "Entregas"],
];

// Painel ao lado da cena. Sem seleção: lista navegável de tudo o que está na
// cena (também é a forma de usar a tela pelo teclado). Com seleção: os dados
// reais do objeto e as ações, que abrem as telas que já existem no sistema.
export default function Inspector({ operacao, selecionado, aba, onAba, onSelecionar, onFechar, acoes }) {
  const objeto = objetoSelecionado(operacao, selecionado);
  if (!selecionado || !objeto) {
    return (
      <div className="op-inspetor-corpo">
        {selecionado && !objeto && (
          <p className="op-aviso" role="status">O objeto selecionado não está mais na unidade (os dados foram atualizados).</p>
        )}
        <header className="op-inspetor-topo">
          <p className="op-eyebrow">OBJETOS DA CENA</p>
          <h2>Navegue pela unidade</h2>
          <p className="op-muted">Clique em algo na cena ou escolha abaixo.</p>
        </header>
        <div className="op-abas" role="tablist" aria-label="Tipos de objeto">
          {ABAS.map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`op-aba-${id}`}
              aria-selected={aba === id}
              aria-controls="op-aba-painel"
              onClick={() => onAba(id)}
            >
              {rotulo}
              <span className="op-abas-n">{contagem(operacao, id)}</span>
            </button>
          ))}
        </div>
        <div id="op-aba-painel" role="tabpanel" aria-labelledby={`op-aba-${aba}`} className="op-lista">
          <ListaDaAba operacao={operacao} aba={aba} onSelecionar={onSelecionar} />
        </div>
      </div>
    );
  }

  const tipo = selecionado.split(":")[0];
  const Conteudo = CONTEUDO[tipo];
  return (
    <div className="op-inspetor-corpo">
      <div className="op-inspetor-acoes-topo">
        <button type="button" className="op-voltar" onClick={onFechar}>
          <span aria-hidden="true">←</span> Todos os objetos
        </button>
      </div>
      <Conteudo objeto={objeto} operacao={operacao} onSelecionar={onSelecionar} acoes={acoes} />
    </div>
  );
}

function contagem(operacao, aba) {
  return {
    alertas: operacao.alertas.length,
    estoque: operacao.itens.length,
    equipe: operacao.funcionarios.length,
    chamados: operacao.chamadosPendentes.length,
    entregas: operacao.entregas.length,
  }[aba];
}

function Selo({ tone, children, title }) {
  return <span className={`mgr-badge chamado-badge ${tone}`} title={title}>{children}</span>;
}

function Linha({ rotulo, children }) {
  return (
    <div className="op-linha">
      <dt>{rotulo}</dt>
      <dd>{children ?? "—"}</dd>
    </div>
  );
}

function Cabecalho({ eyebrow, titulo, children }) {
  return (
    <header className="op-inspetor-topo">
      <p className="op-eyebrow">{eyebrow}</p>
      <h2 aria-live="polite">{titulo}</h2>
      {children}
    </header>
  );
}

function ItemLista({ onClick, titulo, detalhe, selo, icone }) {
  return (
    <li>
      <button type="button" className="op-item" onClick={onClick} disabled={!onClick}>
        {icone && <span className="op-item-icone"><ManagerIcon name={icone} size={16} /></span>}
        <span className="op-item-texto">
          <strong>{titulo}</strong>
          {detalhe && <small>{detalhe}</small>}
        </span>
        {selo}
      </button>
    </li>
  );
}

const seloSituacao = (situacao) => {
  const s = SITUACAO_VISUAL[situacao];
  return <Selo tone={s.tone}>{situacao === "vencendo" ? "Vence em breve" : s.label}</Selo>;
};

function ListaDaAba({ operacao, aba, onSelecionar }) {
  if (aba === "alertas") {
    if (!operacao.alertas.length) return <p className="op-vazio">Nenhum alerta agora. Tudo em dia na unidade.</p>;
    return (
      <ul>
        {operacao.alertas.map((a) => (
          <ItemLista
            key={a.key}
            onClick={() => onSelecionar(a.alvo)}
            icone={a.tipo === "chamado" ? "ticket" : a.tipo === "pedido" ? "truck" : a.tipo === "validade" ? "clock" : "alert"}
            titulo={a.titulo}
            detalhe={a.detalhe}
            selo={<Selo tone={a.nivel === "alto" ? "red" : "yellow"}>{a.nivel === "alto" ? "Alta" : "Média"}</Selo>}
          />
        ))}
      </ul>
    );
  }
  if (aba === "estoque") {
    if (!operacao.corredores.length) return <p className="op-vazio">O estoque desta farmácia está vazio.</p>;
    return operacao.corredores.map((c) => (
      <div key={c.key} className="op-grupo">
        <button type="button" className="op-grupo-titulo" onClick={() => onSelecionar(c.key)}>
          Corredor {String(c.numero).padStart(2, "0")} · {c.categoria}
        </button>
        <ul>
          {c.itens.map((i) => (
            <ItemLista
              key={i.key}
              onClick={() => onSelecionar(i.key)}
              titulo={i.nomeCompleto}
              detalhe={`${numero(i.quantidade)} un. · mínimo ${numero(i.minimo)}`}
              selo={seloSituacao(i.situacao)}
            />
          ))}
        </ul>
      </div>
    ));
  }
  if (aba === "equipe") {
    const pessoas = [
      ...(operacao.gerente ? [{ key: operacao.gerente.key, nome: operacao.gerente.nome, detalhe: "Gerente da unidade", selo: null }] : []),
      ...operacao.funcionarios.map((f) => ({
        key: f.key,
        nome: f.nome,
        detalhe: `${f.cargo} · ${f.turnoLabel}`,
        selo: <Selo tone={f.status.tone}>{f.status.label}</Selo>,
      })),
    ];
    if (pessoas.length <= 1 && !operacao.funcionarios.length) {
      return <p className="op-vazio">Nenhum funcionário cadastrado nesta farmácia.</p>;
    }
    return (
      <ul>
        {pessoas.map((p) => (
          <ItemLista key={p.key} onClick={() => onSelecionar(p.key)} icone="people" titulo={p.nome} detalhe={p.detalhe} selo={p.selo} />
        ))}
      </ul>
    );
  }
  if (aba === "chamados") {
    if (!operacao.chamadosPendentes.length) return <p className="op-vazio">Nenhum chamado pendente. Tudo em dia!</p>;
    return (
      <ul>
        {operacao.chamadosPendentes.map((c) => (
          <ItemLista
            key={c.key}
            onClick={() => onSelecionar(c.key)}
            icone="ticket"
            titulo={c.titulo}
            detalhe={`${c.protocolo} · ${c.nomeFuncionario} · ${tempoDesde(c.dataAbertura)}`}
            selo={<PrioridadeBadge prioridade={c.prioridade} />}
          />
        ))}
      </ul>
    );
  }
  if (!operacao.entregas.length) return <p className="op-vazio">Nenhuma entrega entre farmácias em andamento.</p>;
  return (
    <ul>
      {operacao.entregas.map((e) => (
        <ItemLista
          key={e.key}
          onClick={() => onSelecionar(e.key)}
          icone="truck"
          titulo={`${e.quantidade}× ${e.nomeRemedio}`}
          detalhe={`${e.sentido === "entrada" ? "De" : "Para"} ${e.outraFarmacia}`}
          selo={<Selo tone={statusPedido(e.status).tone}>{statusPedido(e.status).label}</Selo>}
        />
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------
//  Conteúdo por tipo de objeto
// ---------------------------------------------------------------------

function Remedio({ objeto: i, acoes }) {
  const situacao = SITUACAO_VISUAL[i.situacao];
  return (
    <>
      <Cabecalho eyebrow="MEDICAMENTO" titulo={i.nomeCompleto}>
        <div className="op-selos">
          <Selo tone={situacao.tone}>{situacao.label}</Selo>
          {i.tarja && <TarjaBadge valor={i.tarja} />}
        </div>
      </Cabecalho>
      {i.alertaTexto && <p className={`op-alerta-caixa op-tom-${situacao.tone}`}>{i.alertaTexto}</p>}
      <dl className="op-dados">
        <Linha rotulo="Nome">{i.nome}</Linha>
        <Linha rotulo="Quantidade"><BarraEstoque quantidade={i.quantidade} minimo={i.minimo} /></Linha>
        <Linha rotulo="Lote">{i.lote}</Linha>
        <Linha rotulo="Validade">
          {i.validade ? (
            <>
              {formatarValidade(i.validade)}
              {i.diasParaVencer !== null && (
                <small className="op-muted"> · {i.diasParaVencer < 0 ? "vencido" : `${i.diasParaVencer} dias`}</small>
              )}
            </>
          ) : "Não informada"}
        </Linha>
        <Linha rotulo="Localização">{i.localizacao}</Linha>
        <Linha rotulo="Categorias">{i.categorias.join(", ") || "Sem categoria"}</Linha>
        <Linha rotulo="Apresentação">{[i.apresentacao, i.fabricante].filter(Boolean).join(" · ") || null}</Linha>
      </dl>
      <p className="op-nota">Localização lógica: o corredor é a categoria principal do remédio (o sistema não guarda a posição física).</p>
      <div className="op-botoes">
        <button type="button" className="mgr-primary" onClick={(e) => acoes.abrirPerfil("remedio", i.idRemedio, e.currentTarget)}>
          Ver detalhes
        </button>
        <Link className="mgr-secondary" to="/gerente/remedios">Abrir no estoque</Link>
      </div>
    </>
  );
}

function Corredor({ objeto: c, onSelecionar }) {
  const unidades = c.itens.reduce((soma, i) => soma + i.quantidade, 0);
  const alertas = c.itens.filter((i) => i.situacao !== "ok").length;
  return (
    <>
      <Cabecalho eyebrow="PRATELEIRA" titulo={`Corredor ${String(c.numero).padStart(2, "0")} · ${c.categoria}`}>
        <p className="op-muted">
          {c.itens.length} {c.itens.length === 1 ? "remédio" : "remédios"} · {numero(unidades)} un. · {alertas ? `${alertas} com alerta` : "sem alertas"}
        </p>
      </Cabecalho>
      <ul className="op-lista">
        {c.itens.map((i) => (
          <ItemLista
            key={i.key}
            onClick={() => onSelecionar(i.key)}
            titulo={`Vão ${i.vao} · ${i.nomeCompleto}`}
            detalhe={`${numero(i.quantidade)} un. · lote ${i.lote || "—"} · validade ${formatarValidade(i.validade)}`}
            selo={seloSituacao(i.situacao)}
          />
        ))}
      </ul>
    </>
  );
}

function Funcionario({ objeto: f, operacao, onSelecionar, acoes }) {
  const posto = {
    balcao: `Balcão ${f.posto.numero}`,
    orientacao: "Orientação farmacêutica",
    estoque: "Estoque",
    apoio: "Apoio ao atendimento",
    doca: "Doca · carregando o caminhão",
    equipe: "Área da equipe",
  }[f.posto.tipo];
  return (
    <>
      <Cabecalho eyebrow="FUNCIONÁRIO" titulo={f.nome}>
        <div className="op-pessoa">
          <PersonaAvatar role="funcionario" photo={f.foto} name={f.nome} className="op-avatar" />
          <div className="op-selos">
            <Selo tone={f.status.tone} title={f.status.ilustrativo ? "Status simulado: o sistema ainda não registra presença em tempo real." : "Calculado pelo turno cadastrado."}>
              {f.status.label}
            </Selo>
            {f.status.ilustrativo && <span className="op-tag" title="Status simulado: o sistema ainda não registra presença em tempo real.">ilustrativo</span>}
          </div>
        </div>
      </Cabecalho>
      <dl className="op-dados">
        <Linha rotulo="Nome">{f.nome}</Linha>
        <Linha rotulo="Cargo">{f.cargo}</Linha>
        <Linha rotulo="Status">{f.status.label}{f.status.ilustrativo ? " (ilustrativo)" : ""}</Linha>
        <Linha rotulo="Turno">{f.turnoLabel} · {f.noTurno ? "no turno agora" : "fora do turno"}</Linha>
        <Linha rotulo="Farmácia">{operacao.farmacia.nome}</Linha>
        <Linha rotulo="Posto na cena">{posto}</Linha>
        <Linha rotulo="Chamados">{numero(f.chamados)} nos últimos 30 dias</Linha>
        <Linha rotulo="Serviços">{numero(f.servicos)} nos últimos 30 dias</Linha>
        <Linha rotulo="Matrícula">{f.matricula}</Linha>
      </dl>
      {f.chamadosPendentes.length > 0 && (
        <div className="op-secao">
          <h3>Chamados pendentes abertos por {f.primeiroNome}</h3>
          <ul className="op-lista">
            {f.chamadosPendentes.map((key) => {
              const c = operacao.chamadosPendentes.find((x) => x.key === key);
              return c && (
                <ItemLista key={key} onClick={() => onSelecionar(key)} icone="ticket" titulo={c.titulo} detalhe={c.protocolo} selo={<PrioridadeBadge prioridade={c.prioridade} />} />
              );
            })}
          </ul>
        </div>
      )}
      <div className="op-botoes">
        <button type="button" className="mgr-primary" onClick={(e) => acoes.abrirPerfil("funcionario", f.idFuncionario, e.currentTarget)}>
          Ver perfil
        </button>
        <Link className="mgr-secondary" to={`/gerente/servicos?funcionario=${encodeURIComponent(f.nome)}`}>Ver serviços</Link>
      </div>
    </>
  );
}

function Gerente({ objeto: g, operacao, acoes }) {
  return (
    <>
      <Cabecalho eyebrow="GERENTE" titulo={g.nome} />
      <dl className="op-dados">
        <Linha rotulo="Nome">{g.nome}</Linha>
        <Linha rotulo="Cargo">Gerente da unidade</Linha>
        <Linha rotulo="Farmácia">{operacao.farmacia.nome}</Linha>
        <Linha rotulo="Chamados pendentes">{operacao.kpis.chamados.pendentes}</Linha>
      </dl>
      <div className="op-botoes">
        <button type="button" className="mgr-primary" onClick={(e) => acoes.abrirPerfil("gerente", g.idGerente, e.currentTarget)}>
          Ver perfil
        </button>
      </div>
    </>
  );
}

function Chamado({ objeto: c, operacao, onSelecionar, acoes }) {
  const estoque = new Map(operacao.itens.map((i) => [i.idRemedio, i]));
  return (
    <>
      <Cabecalho eyebrow="CHAMADO" titulo={c.titulo}>
        <div className="op-selos">
          <PrioridadeBadge prioridade={c.prioridade} />
          <StatusChamadoBadge status={c.status} />
        </div>
      </Cabecalho>
      <dl className="op-dados">
        <Linha rotulo="ID">{c.protocolo}</Linha>
        <Linha rotulo="Tipo">Reposição de estoque</Linha>
        <Linha rotulo="Funcionário">
          {c.idFuncionario ? (
            <button type="button" className="op-link" onClick={() => onSelecionar(`funcionario:${c.idFuncionario}`)}>{c.nomeFuncionario}</button>
          ) : c.nomeFuncionario}
        </Linha>
        <Linha rotulo="Aberto">{formatarDataChamado(c.dataAbertura)} ({tempoDesde(c.dataAbertura)})</Linha>
      </dl>
      {c.descricao && <p className="op-descricao">{c.descricao}</p>}
      <div className="op-secao">
        <h3>Remédios pedidos</h3>
        <p className="op-nota">Destacados em amarelo nas prateleiras.</p>
        <ul className="op-lista">
          {c.remedios.map((r) => {
            const noEstoque = estoque.get(r.idRemedio);
            return (
              <ItemLista
                key={r.idRemedio}
                onClick={noEstoque ? () => onSelecionar(noEstoque.key) : undefined}
                icone="pill"
                titulo={`${r.quantidade}× ${r.nome}`}
                detalhe={noEstoque ? `Hoje: ${numero(noEstoque.quantidade)} un. (mínimo ${numero(noEstoque.minimo)})` : "Ainda não está no estoque desta farmácia"}
                selo={noEstoque ? seloSituacao(noEstoque.situacao) : null}
              />
            );
          })}
        </ul>
      </div>
      <div className="op-botoes">
        <button type="button" className="mgr-primary" onClick={(e) => acoes.validarChamado(c.idChamado, e.currentTarget)}>
          Validar
        </button>
        <button type="button" className="mgr-secondary" onClick={(e) => acoes.abrirPerfil("chamado", c.idChamado, e.currentTarget)}>
          Ver detalhes
        </button>
      </div>
      <p className="op-nota">Validar abre o relatório do chamado na seção "Decisão do gerente", onde você aceita ou recusa.</p>
    </>
  );
}

function ListaChamados({ operacao, onSelecionar }) {
  return (
    <>
      <Cabecalho eyebrow="GERÊNCIA" titulo="Chamados pendentes">
        <p className="op-muted">Solicitações da equipe aguardando a sua decisão.</p>
      </Cabecalho>
      <div className="op-lista"><ListaDaAba operacao={operacao} aba="chamados" onSelecionar={onSelecionar} /></div>
    </>
  );
}

function Alertas({ operacao, onSelecionar }) {
  return (
    <>
      <Cabecalho eyebrow="ALERTAS" titulo="O que precisa de atenção">
        <p className="op-muted">Estoque, validade (até {VALIDADE_ALERTA_DIAS} dias), chamados e pedidos da rede.</p>
      </Cabecalho>
      <div className="op-lista"><ListaDaAba operacao={operacao} aba="alertas" onSelecionar={onSelecionar} /></div>
    </>
  );
}

function Entrega({ objeto: e, acoes }) {
  // relógio de 1 s enquanto há preparo ou viagem (caixas e trajeto ao vivo)
  const agora = useRelogio(["preparando", "enviada"].includes(e.status), 1000);
  const progresso = progressoEntrega(e, agora);
  const preparo = preparoDoPedido(e, agora);
  const naEstrada = progresso !== null;
  const status = naEstrada ? statusPedido("enviada") : statusPedido(e.status);
  const pct = progresso === null ? null : Math.round(progresso * 100);
  return (
    <>
      <Cabecalho eyebrow={e.sentido === "entrada" ? "ENTREGA PARA ESTA FARMÁCIA" : "ENVIO PARA OUTRA FARMÁCIA"} titulo={`${e.quantidade}× ${e.nomeRemedio}`}>
        <div className="op-selos"><Selo tone={status.tone}>{status.label}</Selo></div>
      </Cabecalho>
      <dl className="op-dados">
        <Linha rotulo={e.sentido === "entrada" ? "Origem" : "Destino"}>{e.outraFarmacia}</Linha>
        {e.dataInicioPreparo && (
          <Linha rotulo="Preparo">
            {e.nomeFuncionarioPreparo ?? "Equipe"}
            {preparo && !naEstrada && (
              <small className="op-muted"> · {preparo.carregadas}/{preparo.caixas} {preparo.caixas === 1 ? "caixa" : "caixas"} no caminhão · sai em {preparo.restante} s</small>
            )}
          </Linha>
        )}
        {e.caixas && !naEstrada && (
          <Linha rotulo="Carga">{e.caixas} {e.caixas === 1 ? "caixa" : "caixas"} de {e.unidadesPorCaixa} un. · {e.caixas * (e.segundosPorViagem ?? 5)} s para carregar</Linha>
        )}
        <Linha rotulo="Saída">{e.dataEnvio ? formatarDataChamado(e.dataEnvio) : "Ainda não saiu"}</Linha>
        <Linha rotulo="Previsão">{e.dataPrevistaChegada ? formatarDataChamado(e.dataPrevistaChegada) : "—"}</Linha>
        {pct !== null && (
          <Linha rotulo="Viagem">
            <span className="op-progresso" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct}% do trajeto`}>
              <i style={{ width: `${pct}%` }} />
            </span>
            <small className="op-muted">{pct}% do trajeto</small>
          </Linha>
        )}
      </dl>
      {e.aguardandoVoce && <p className="op-alerta-caixa op-tom-orange">Outra farmácia pediu este remédio do seu estoque e aguarda a sua resposta.</p>}
      {e.aguardandoEquipe && (
        <p className="op-alerta-caixa op-tom-orange">Pedido aceito. A equipe recebeu o aviso "Prepare {e.quantidade}× {e.nomeRemedio}"; o primeiro que apertar Começar carrega o caminhão.</p>
      )}
      {e.sentido === "entrada" && !naEstrada && e.status === "aprovada" && (
        <p className="op-alerta-caixa op-tom-blue">A {e.outraFarmacia} aceitou o pedido e vai preparar o envio.</p>
      )}
      {e.sentido === "entrada" && !naEstrada && e.status === "preparando" && (
        <p className="op-alerta-caixa op-tom-blue">Em preparo na {e.outraFarmacia}: o caminhão sai quando as caixas forem carregadas.</p>
      )}
      <div className="op-botoes">
        <button type="button" className="mgr-primary" onClick={(ev) => acoes.abrirPerfil("pedido", e.idRedistribuicao, ev.currentTarget)}>
          Ver detalhes
        </button>
        {e.aguardandoVoce && <Link className="mgr-secondary" to="/gerente/pedidos">Responder pedido</Link>}
      </div>
    </>
  );
}

function Balcao({ objeto: b, operacao, onSelecionar, acoes }) {
  const pessoa = operacao.funcionarios.find((f) => f.key === b.funcionario);
  const servicos = operacao.servicos;
  return (
    <>
      <Cabecalho eyebrow="PONTO DE ATENDIMENTO" titulo={b.nome} />
      <dl className="op-dados">
        <Linha rotulo="Funcionário">
          {pessoa ? (
            <button type="button" className="op-link" onClick={() => onSelecionar(pessoa.key)}>{pessoa.nome} · {pessoa.status.label}</button>
          ) : "Ninguém neste posto no turno atual"}
        </Linha>
        <Linha rotulo="Serviços da unidade">{servicos ? `${numero(servicos.total)} nos últimos 30 dias` : "—"}</Linha>
      </dl>
      {servicos?.ultimos?.length > 0 && (
        <div className="op-secao">
          <h3>Últimos atendimentos da unidade</h3>
          <ul className="op-lista">
            {servicos.ultimos.slice(0, 4).map((s) => (
              <ItemLista
                key={s.idServico}
                onClick={(ev) => acoes.abrirPerfil("servico", s.idServico, ev.currentTarget)}
                icone="clipboard"
                titulo={s.nomePaciente}
                detalhe={`${s.nomeFuncionario} · ${formatarDataChamado(s.dataServico)}`}
              />
            ))}
          </ul>
        </div>
      )}
      <div className="op-botoes">
        <Link className="mgr-primary" to="/gerente/servicos">Ver serviços</Link>
      </div>
    </>
  );
}

function Operacao({ operacao }) {
  const { indicador } = operacao;
  return (
    <>
      <Cabecalho eyebrow="OPERAÇÃO" titulo={`${indicador.valor} / 100 · ${indicador.label}`}>
        <p className="op-muted">Indicador geral calculado no painel a partir dos dados da unidade.</p>
      </Cabecalho>
      <ul className="op-partes">
        {indicador.partes.map((p) => (
          <li key={p.id}>
            <span>{p.label} <small>peso {p.peso}%</small></span>
            <span className="op-progresso" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.valor * 100)} aria-label={`${p.label}: ${Math.round(p.valor * 100)}%`}>
              <i style={{ width: `${Math.round(p.valor * 100)}%` }} />
            </span>
            <strong>{Math.round(p.valor * 100)}%</strong>
          </li>
        ))}
      </ul>
      <p className="op-nota">
        Estoque saudável: itens sem falta, sem nível crítico e sem lote vencido. Validade: vencidos contam inteiro e os que vencem
        em até {VALIDADE_ALERTA_DIAS} dias contam metade. Chamados: cada pendente desconta (alta e urgente valem o dobro).
        Equipe: alguém no turno agora.
      </p>
    </>
  );
}

const CONTEUDO = {
  remedio: Remedio,
  corredor: Corredor,
  funcionario: Funcionario,
  gerente: Gerente,
  chamado: Chamado,
  chamados: ListaChamados,
  alertas: Alertas,
  entrega: Entrega,
  balcao: Balcao,
  operacao: Operacao,
};
