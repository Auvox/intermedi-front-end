import { useId, useRef } from "react";
import { usePerfil } from "./perfilContext";
import CardNumero from "./CardNumero";
import GraficoBarras from "./GraficoBarras";
import ListaCompacta from "./ListaCompacta";
import SeletorPeriodo from "./SeletorPeriodo";
import PersonaAvatar from "../PersonaAvatar";
import ManagerIcon from "../ManagerIcon";
import { ErroComRetry, PrioridadeBadge, StatusChamadoBadge } from "../Chamados";
import { BarraEstoque, FotoRemedio, SituacaoBadges } from "../Remedios";
import { fotoPessoa } from "../../services/api";
import { useFocoTitulo } from "../../hooks/useResumo";
import { PRIORIDADE_CHAMADO, STATUS_CHAMADO, formatarDataChamado } from "../../services/chamados";
import { comSituacao, formatarValidade } from "../../services/remedios";
import { numero, turno } from "../../services/perfil";

// =====================================================================
//  Estrutura da página de perfil
// =====================================================================

// Página inteira de um perfil: cabeçalho (hero), período, tabs e conteúdo da tab.
// montar(data) → { cabecalho | topo, periodo?, semPeriodo?: [ids],
//                   abas: [[id, rótulo, () => conteúdo, contador?, total?]] }
// topo: cabeçalho próprio (ex.: farmácia) no lugar do PerfilCabecalho.
// total: { valor, rotulo, detalhe } mostrado em destaque no início da tab.
// O seletor de período só aparece nas tabs que dependem dele ("detalhes" nunca depende).
// variante "instituicao" (farmácia) ou "produto" (remédio): esqueleto no formato da página
export function PerfilLayout({ estado, montar, variante }) {
  const { secao, mudarSecao } = usePerfil();
  return (
    <EstadoPerfil estado={estado} variante={variante}>
      {estado.data && (() => {
        const { cabecalho, topo, periodo, semPeriodo = [], abas: todas } = montar(estado.data);
        const abas = todas.filter(Boolean);
        const ativa = abas.some(([id]) => id === secao) ? secao : abas[0][0];
        const atual = abas.find(([id]) => id === ativa);
        const conteudo = (
          <>
            {atual[4] && <TotalAba {...atual[4]} />}
            {periodo && !["detalhes", "sobre", ...semPeriodo].includes(ativa) && <Periodo info={periodo} />}
            {atual[2]()}
          </>
        );
        return (
          <>
            {topo ?? <PerfilCabecalho {...cabecalho} />}
            {abas.length > 1 ? (
              <Abas abas={abas} ativa={ativa} onTrocar={mudarSecao}>{conteudo}</Abas>
            ) : (
              <div className="perfil-aba-conteudo">{conteudo}</div>
            )}
          </>
        );
      })()}
    </EstadoPerfil>
  );
}

// Total da tab em destaque: número grande na cor da página + o que ele conta
export function TotalAba({ valor, rotulo, detalhe }) {
  return (
    <div className="perfil-total">
      <strong className="perfil-total-valor">{valor}</strong>
      <span className="perfil-total-texto">
        <span className="perfil-total-rotulo">{rotulo}</span>
        {detalhe && <small>{detalhe}</small>}
      </span>
    </div>
  );
}

// Cabeçalho em faixa: avatar, nome, subtítulo, selos, informações e ações
// destaque: quadro à direita com o dado mais importante do perfil (ex.: estoque do remédio)
export function PerfilCabecalho({ foto, role, icone, nome, sobretitulo, subtitulo, selos, meta, acoes, destaque }) {
  const titulo = useFocoTitulo();
  return (
    <header className={`perfil-hero perfil-hero-${role || "detalhe"}`}>
      <div className="perfil-hero-avatar">
        {role === "remedio" ? (
          <FotoRemedio foto={foto} nome={nome} tamanho="lg" />
        ) : role === "farmacia" ? (
          <span className="perfil-avatar-farmacia">
            {foto ? <img src={fotoPessoa(foto)} alt={`Foto de ${nome}`} /> : <ManagerIcon name="pharmacy" size={42} />}
          </span>
        ) : icone ? (
          <span className="perfil-avatar-icone"><ManagerIcon name={icone} size={34} /></span>
        ) : (
          <PersonaAvatar className="perfil-avatar-pessoa" role={role} photo={fotoPessoa(foto)} name={nome} />
        )}
      </div>
      <div className="perfil-hero-texto">
        {sobretitulo && <p className="perfil-hero-sobretitulo">{sobretitulo}</p>}
        <h1 ref={titulo} className="perfil-foco-inicial" tabIndex={-1}>{nome}</h1>
        {subtitulo && <p className="perfil-hero-subtitulo">{subtitulo}</p>}
        {selos && <div className="perfil-hero-selos">{selos}</div>}
        {meta?.filter(Boolean).length > 0 && (
          <ul className="perfil-hero-meta">
            {meta.filter(Boolean).map(([ic, conteudo], i) => (
              <li key={i}><ManagerIcon name={ic} size={15} /><span>{conteudo}</span></li>
            ))}
          </ul>
        )}
      </div>
      {destaque ? (
        <div className="perfil-hero-lado">
          {destaque}
          {acoes && <div className="perfil-hero-acoes">{acoes}</div>}
        </div>
      ) : acoes && <div className="perfil-hero-acoes">{acoes}</div>}
    </header>
  );
}

// Carregando (skeleton), erro com "Tentar de novo" e troca de período esmaecida
export function EstadoPerfil({ estado, variante, children }) {
  const { data, loading, error, reload } = estado;
  if (!data && loading && variante === "instituicao") {
    return (
      <div className="perfil-skeleton inst-skeleton" role="status" aria-label="Carregando farmácia">
        <div className="inst-sk-topo"><span /><div><i /><i /><i /></div></div>
        <div className="inst-sk-faixa">{[0, 1, 2, 3].map((i) => <div key={i}><i /><i /><i /></div>)}</div>
        <div className="inst-sk-abas">{[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} />)}</div>
        <div className="inst-sk-corpo"><span /><span /></div>
      </div>
    );
  }
  if (!data && loading && variante === "produto") {
    return (
      <div className="perfil-skeleton prod-skeleton" role="status" aria-label="Carregando remédio">
        <div className="prod-sk-topo">
          <span className="prod-sk-foto" />
          <div><i /><i /><i /><span className="prod-sk-quadro" /></div>
        </div>
        <div className="inst-sk-abas">{[0, 1, 2, 3].map((i) => <i key={i} />)}</div>
      </div>
    );
  }
  if (!data && loading) {
    return (
      <div className="perfil-skeleton" role="status" aria-label="Carregando perfil">
        <div className="perfil-skeleton-hero"><span /><div><i /><i /><i /></div></div>
        <div className="perfil-skeleton-abas">{[0, 1, 2, 3].map((i) => <i key={i} />)}</div>
        <div className="perfil-kpis">{[0, 1, 2, 3].map((i) => <span key={i} className="perfil-skeleton-card" />)}</div>
        <span className="perfil-skeleton-grafico" />
      </div>
    );
  }
  if (!data && error) return <div className="perfil-erro"><ErroComRetry message={error} onRetry={reload} /></div>;
  return (
    <div className={loading ? "perfil-atualizando" : undefined} aria-busy={loading}>
      {error && (
        <div className="chamado-inline-error perfil-erro-inline" role="alert">
          {error} <button type="button" className="mgr-text-button" onClick={reload}>Tentar de novo</button>
        </div>
      )}
      {children}
    </div>
  );
}

export function Periodo({ info }) {
  const { periodo, mudarPeriodo } = usePerfil();
  return (
    <div className="perfil-periodo-faixa">
      <SeletorPeriodo valor={periodo} info={info} onChange={mudarPeriodo} />
    </div>
  );
}

// Tabs acessíveis: setas ←/→, Home e End trocam de tab (foco "roving")
export function Abas({ abas, ativa, onTrocar, rotulo = "Seções do perfil", children }) {
  const uid = useId();
  const lista = useRef(null);
  function teclado(event) {
    const ids = abas.map(([id]) => id);
    const i = ids.indexOf(ativa);
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 }[event.key];
    if (destino === undefined) return;
    event.preventDefault();
    const novo = ids[(destino + ids.length) % ids.length];
    onTrocar(novo);
    lista.current?.querySelector(`[data-aba="${novo}"]`)?.focus();
  }
  return (
    <>
      <div className="perfil-abas" role="tablist" aria-label={rotulo} ref={lista} onKeyDown={teclado}>
        {abas.map(([id, label, , contador]) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-aba={id}
            id={`${uid}-tab-${id}`}
            aria-selected={ativa === id}
            aria-controls={`${uid}-painel`}
            tabIndex={ativa === id ? 0 : -1}
            onClick={() => onTrocar(id)}
          >
            {label}
            {contador !== undefined && contador !== null && <span className="perfil-aba-contador">{contador}</span>}
          </button>
        ))}
      </div>
      <div className="perfil-aba-conteudo" role="tabpanel" id={`${uid}-painel`} aria-labelledby={`${uid}-tab-${ativa}`} tabIndex={0}>
        {children}
      </div>
    </>
  );
}

// Card com título (substitui os subtítulos soltos)
export function Secao({ titulo, descricao, acao, largo = false, children }) {
  return (
    <section className={`perfil-card-secao${largo ? " largo" : ""}`}>
      <div className="perfil-card-secao-topo">
        <div>
          <h2>{titulo}</h2>
          {descricao && <p>{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="perfil-card-secao-corpo">{children}</div>
    </section>
  );
}

export const Grade = ({ children }) => <div className="perfil-grade">{children}</div>;
export const Kpis = ({ children }) => <div className="perfil-kpis">{children}</div>;

// Botão com aparência de link que abre outro perfil
export function LinkPerfil({ tipo, id, children }) {
  const { abrirPerfil } = usePerfil();
  if (!id) return <>{children}</>;
  return (
    <button type="button" className="perfil-link" onClick={() => abrirPerfil(tipo, id)}>
      {children}
    </button>
  );
}

export function Detalhes({ itens }) {
  return (
    <dl className="perfil-detalhes">
      {itens.filter(Boolean).map(([rotulo, valor]) => (
        <div key={rotulo}><dt>{rotulo}</dt><dd>{valor === null || valor === undefined || valor === "" || valor === false ? "—" : valor}</dd></div>
      ))}
    </dl>
  );
}

// =====================================================================
//  Blocos de dados (conteúdo das tabs)
// =====================================================================

export function GraficoServicos({ bloco, periodo, titulo = "Atendimentos no período", largo = true }) {
  return (
    <Secao titulo={titulo} descricao={`Por ${periodo?.agrupamento === "mes" ? "mês" : "dia"}`} largo={largo}>
      <GraficoBarras titulo={titulo} serie={bloco.serie} agrupamento={periodo?.agrupamento} />
    </Secao>
  );
}

export function TopRemedios({ bloco, titulo = "Remédios que mais saíram" }) {
  const { abrirPerfil } = usePerfil();
  return (
    <Secao titulo={titulo}>
      <ListaCompacta
        rotulo={titulo}
        vazio="Nenhum serviço neste período."
        itens={(bloco.topRemedios ?? []).map((r, i) => ({
          chave: r.idRemedio,
          inicio: <><span className="perfil-rank">{i + 1}</span><FotoRemedio foto={r.fotoRemedio} nome={r.nomeRemedio} /></>,
          titulo: [r.nomeRemedio, r.dosagemRemedio].filter(Boolean).join(" "),
          subtitulo: `${numero(r.atendimentos)} ${r.atendimentos === 1 ? "atendimento" : "atendimentos"}`,
          lateral: `${numero(r.quantidade)} un.`,
          rotulo: `Abrir perfil de ${r.nomeRemedio}`,
          onAbrir: () => abrirPerfil("remedio", r.idRemedio),
        }))}
      />
    </Secao>
  );
}

export function UltimosServicos({ bloco, titulo = "Últimos serviços" }) {
  const { abrirPerfil } = usePerfil();
  return (
    <Secao titulo={titulo}>
      <ListaCompacta
        rotulo={titulo}
        vazio="Nenhum serviço neste período."
        itens={(bloco.ultimos ?? []).map((s) => ({
          chave: s.idServico,
          inicio: <span className="perfil-lista-icone"><ManagerIcon name="clipboard" size={16} /></span>,
          titulo: `Serviço nº ${s.idServico} · ${s.nomePaciente}`,
          subtitulo: `${formatarDataChamado(s.dataServico)} · ${s.nomeFuncionario} · ${s.nomeFarmacia}`,
          lateral: `${numero(s.quantidadeTotal)} un.`,
          rotulo: `Abrir serviço nº ${s.idServico}`,
          onAbrir: () => abrirPerfil("servico", s.idServico),
        }))}
      />
    </Secao>
  );
}

// Tab "Serviços": KPIs + gráfico + remédios que mais saíram + últimos
export function AbaServicos({ bloco, periodo, kpis = true, rotuloPacientes = "Pacientes atendidos" }) {
  return (
    <>
      {kpis && (
        <Kpis>
          <CardNumero titulo="Serviços realizados" valor={numero(bloco.total)} variacao={bloco.variacao} icone="clipboard" />
          {bloco.pacientesAtendidos !== undefined && (
            <CardNumero titulo={rotuloPacientes} valor={numero(bloco.pacientesAtendidos)} icone="heart" />
          )}
          <CardNumero titulo="Unidades entregues" valor={numero(bloco.unidadesEntregues)} icone="pill" />
        </Kpis>
      )}
      <Grade>
        <GraficoServicos bloco={bloco} periodo={periodo} />
        <TopRemedios bloco={bloco} />
        <UltimosServicos bloco={bloco} />
      </Grade>
    </>
  );
}

// porStatus como barra empilhada com os tons de STATUS_CHAMADO
export function BarraStatus({ porStatus = {} }) {
  const total = Object.values(porStatus).reduce((s, v) => s + v, 0);
  const itens = Object.entries(STATUS_CHAMADO).filter(([k]) => porStatus[k] > 0);
  return (
    <div className="perfil-status">
      <span className="perfil-status-barra" aria-hidden="true">
        {itens.map(([k, { tone }]) => (
          <i key={k} className={`tom-${tone}`} style={{ width: `${(porStatus[k] / total) * 100}%` }} />
        ))}
      </span>
      <ul className="perfil-status-legenda">
        {Object.entries(STATUS_CHAMADO).map(([k, { label, tone }]) => (
          <li key={k} className={porStatus[k] ? undefined : "zerado"}>
            <span className={`perfil-ponto tom-${tone}`} aria-hidden="true" />{label}<strong>{numero(porStatus[k])}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UltimosChamados({ bloco, titulo = "Últimos chamados" }) {
  const { abrirPerfil } = usePerfil();
  return (
    <Secao titulo={titulo} largo>
      <ListaCompacta
        rotulo={titulo}
        vazio="Nenhum chamado neste período."
        itens={(bloco.ultimos ?? []).map((c) => ({
          chave: c.idChamado,
          inicio: <span className="perfil-lista-icone"><ManagerIcon name="ticket" size={16} /></span>,
          titulo: `#${c.idChamado} · ${c.titulo}`,
          subtitulo: `${formatarDataChamado(c.dataAbertura)} · ${c.nomeFuncionario} · ${c.totalRemedios} ${c.totalRemedios === 1 ? "remédio" : "remédios"}`,
          lateral: <><PrioridadeBadge prioridade={c.prioridade} /> <StatusChamadoBadge status={c.status} /></>,
          rotulo: `Abrir chamado #${c.idChamado}`,
          onAbrir: () => abrirPerfil("chamado", c.idChamado),
        }))}
      />
    </Secao>
  );
}

// Tab "Chamados": KPIs + status/prioridade + gráfico + últimos
export function AbaChamados({ bloco, periodo, kpis = true }) {
  return (
    <>
      {kpis && (
        <Kpis>
          <CardNumero titulo="Chamados abertos" valor={numero(bloco.total)} variacao={bloco.variacao} icone="ticket" />
          <CardNumero titulo="Unidades pedidas" valor={numero(bloco.unidadesSolicitadas)} icone="pill" />
          <CardNumero titulo="Pendentes" valor={numero(bloco.porStatus?.pendente)} icone="clock" />
          <CardNumero titulo="Resolvidos" valor={numero(bloco.porStatus?.resolvido)} icone="check" />
        </Kpis>
      )}
      <Grade>
        <Secao titulo="Por status">
          <BarraStatus porStatus={bloco.porStatus} />
          <h3 className="perfil-subtitulo-card">Por prioridade</h3>
          <ul className="perfil-status-legenda">
            {Object.entries(PRIORIDADE_CHAMADO).map(([k, { label }]) => (
              <li key={k} className={bloco.porPrioridade?.[k] ? undefined : "zerado"}>{label}<strong>{numero(bloco.porPrioridade?.[k])}</strong></li>
            ))}
          </ul>
        </Secao>
        <Secao titulo="Chamados no período" descricao={`Por ${periodo?.agrupamento === "mes" ? "mês" : "dia"}`}>
          <GraficoBarras titulo="Chamados no período" serie={bloco.serie} agrupamento={periodo?.agrupamento} rotuloTotal="Chamados" />
        </Secao>
        <UltimosChamados bloco={bloco} />
      </Grade>
    </>
  );
}

// Tab "Rede": pedidos entre farmácias como fornecedora × solicitante
export function AbaRede({ rede }) {
  const f = rede?.comoFornecedora ?? {};
  const s = rede?.comoSolicitante ?? {};
  return (
    <Grade>
      <Secao titulo="Como fornecedora" descricao="Pedidos de outras farmácias para esta">
        <Kpis>
          <CardNumero titulo="Pedidos recebidos" valor={numero(f.total)} icone="truck" />
          <CardNumero titulo="Unidades enviadas" valor={numero(f.unidadesEnviadas)} icone="pill" />
        </Kpis>
        <Detalhes itens={[
          ["Aceitos", numero(f.aceitos)],
          ["Recusados", numero(f.recusados)],
          ["Aguardando resposta agora", numero(f.pendentesAgora)],
          f.respondidosPorEle !== undefined && ["Respondidos por ele", numero(f.respondidosPorEle)],
        ]} />
      </Secao>
      <Secao titulo="Como solicitante" descricao="Pedidos desta farmácia à rede">
        <Kpis>
          <CardNumero titulo="Pedidos feitos" valor={numero(s.total)} icone="truck" />
          <CardNumero titulo="Unidades recebidas" valor={numero(s.unidadesRecebidas)} icone="pill" />
        </Kpis>
        <Detalhes itens={[
          ["Entregues", numero(s.entregues)],
          ["A caminho", numero(s.aCaminho)],
          ["Aguardando", numero(s.aguardando)],
          ["Recusados", numero(s.recusados)],
        ]} />
      </Secao>
    </Grade>
  );
}

// Distribuição por turno (barras horizontais)
function PorTurno({ porTurno = {}, total = 0 }) {
  return (
    <ul className="perfil-turnos">
      {Object.entries(porTurno).map(([t, qtd]) => (
        <li key={t}>
          <span>{turno(t)}</span>
          <span className="perfil-turno-barra" aria-hidden="true"><i style={{ width: `${total ? (qtd / total) * 100 : 0}%` }} /></span>
          <strong>{qtd}</strong>
        </li>
      ))}
    </ul>
  );
}

export function RankingEquipe({ equipe, titulo = "Ranking da equipe no período" }) {
  const { abrirPerfil } = usePerfil();
  return (
    <Secao titulo={titulo} descricao="Serviços e chamados de cada funcionário" largo>
      <ListaCompacta
        rotulo={titulo}
        vazio="Nenhum funcionário cadastrado."
        itens={(equipe?.lista ?? []).map((f, i) => ({
          chave: f.idFuncionario,
          inicio: <><span className="perfil-rank">{i + 1}</span><PersonaAvatar role="funcionario" photo={fotoPessoa(f.fotoFuncionario)} name={f.nomeFuncionario} /></>,
          titulo: f.nomeFuncionario,
          subtitulo: [f.cargoFuncionario, turno(f.turnoFuncionario), f.matriculaFuncionario && `Matrícula ${f.matriculaFuncionario}`].filter(Boolean).join(" · "),
          lateral: <span className="perfil-numeros"><b>{numero(f.servicos)}</b> serv.<b>{numero(f.chamados)}</b> cham.</span>,
          rotulo: `Abrir perfil de ${f.nomeFuncionario}`,
          onAbrir: () => abrirPerfil("funcionario", f.idFuncionario),
        }))}
      />
    </Secao>
  );
}

// Tab "Equipe": gerentes (opcional) + distribuição por turno + ranking
export function AbaEquipe({ equipe, gerentes }) {
  const { abrirPerfil } = usePerfil();
  return (
    <Grade>
      {gerentes && (
        <Secao titulo={`Gerentes (${gerentes.length})`}>
          <ListaCompacta
            rotulo="Gerentes"
            vazio="Nenhum gerente cadastrado."
            itens={gerentes.map((g) => ({
              chave: g.idGerente,
              inicio: <PersonaAvatar role="gerente" photo={fotoPessoa(g.fotoGerente)} name={g.nomeGerente} />,
              titulo: g.nomeGerente,
              subtitulo: [g.crfGerente, g.emailGerente, g.telGerente].filter(Boolean).join(" · "),
              rotulo: `Abrir perfil de ${g.nomeGerente}`,
              onAbrir: () => abrirPerfil("gerente", g.idGerente),
            }))}
          />
        </Secao>
      )}
      <Secao titulo={`Funcionários por turno (${numero(equipe?.total)})`}>
        <PorTurno porTurno={equipe?.porTurno} total={equipe?.total} />
      </Secao>
      <RankingEquipe equipe={equipe} />
    </Grade>
  );
}

export function EstoqueAtencao({ estoque, acao, largo = false }) {
  const { abrirPerfil } = usePerfil();
  return (
    <Secao titulo="Precisa de atenção" descricao="Vencidos, zerados e críticos" acao={acao} largo={largo}>
      <ListaCompacta
        rotulo="Remédios que precisam de atenção"
        vazio="Nenhum remédio crítico, zerado ou vencido."
        itens={(estoque?.atencao ?? []).map((r) => ({
          chave: r.idRemedio,
          inicio: <FotoRemedio foto={r.fotoRemedio} nome={r.nomeRemedio} />,
          titulo: [r.nomeRemedio, r.dosagemRemedio].filter(Boolean).join(" "),
          subtitulo: `${numero(r.quantidade)} un. · mínimo ${numero(r.estoqueMinimo)} · validade ${formatarValidade(r.validade)}`,
          lateral: <SituacaoBadges item={r} />,
          rotulo: `Abrir perfil de ${r.nomeRemedio}`,
          onAbrir: () => abrirPerfil("remedio", r.idRemedio),
        }))}
      />
    </Secao>
  );
}

// Tab "Estoque": KPIs + precisa de atenção
export function AbaEstoque({ estoque, link, kpis = true }) {
  return (
    <>
      {kpis && <Kpis>
        <CardNumero titulo="Itens no estoque" valor={numero(estoque?.totalItens)} icone="box" detalhe={`${numero(estoque?.unidades)} unidades`} />
        <CardNumero titulo="Críticos" valor={numero(estoque?.criticos)} icone="alert" />
        <CardNumero titulo="Zerados" valor={numero(estoque?.zerados)} icone="pill" />
        <CardNumero titulo="Vencidos" valor={numero(estoque?.vencidos)} icone="clock" />
      </Kpis>}
      <Grade>
        <EstoqueAtencao estoque={estoque} acao={link} largo />
      </Grade>
    </>
  );
}

// Farmácias que têm o remédio (perfil do remédio)
// A farmácia de quem está vendo aparece primeiro, marcada como "Sua farmácia"
export function EstoqueNaRede({ farmacias = [] }) {
  const { abrirPerfil, idFarmaciaAtual } = usePerfil();
  if (!farmacias.length) return <p className="perfil-vazio">Nenhuma farmácia tem este remédio em estoque.</p>;
  const minha = (f) => idFarmaciaAtual && String(f.idFarmacia) === String(idFarmaciaAtual);
  const ordenadas = [...farmacias.filter(minha), ...farmacias.filter((f) => !minha(f))].map(comSituacao);
  return (
    <ListaCompacta
      rotulo="Farmácias com este remédio"
      itens={ordenadas.map((f) => ({
        chave: f.idFarmacia,
        inicio: <span className="perfil-lista-icone"><ManagerIcon name="pharmacy" size={16} /></span>,
        titulo: minha(f) ? <>{f.nomeFarmacia} <span className="perfil-sua-farmacia">Sua farmácia</span></> : f.nomeFarmacia,
        subtitulo: `Lote ${f.lote || "—"} · validade ${formatarValidade(f.validade)}`,
        lateral: <span className="perfil-estoque-lateral"><BarraEstoque quantidade={f.quantidade} minimo={f.estoqueMinimo} /><SituacaoBadges item={f} /></span>,
        rotulo: `Abrir perfil da ${f.nomeFarmacia}`,
        onAbrir: () => abrirPerfil("farmacia", f.idFarmacia),
      }))}
    />
  );
}
