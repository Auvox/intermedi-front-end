import { useEffect, useLayoutEffect, useRef } from "react";
import ManagerIcon from "../../components/ManagerIcon";
import PersonaIcon from "../../components/PersonaIcon";
import logoCor from "../../assets/logoIntermedi.png";
import "./plataforma.css";

// Telas da plataforma recriadas em HTML só para visualização na landing.
// Seguem o visual das áreas logadas (barra lateral, cabeçalho colorido,
// painéis brancos) e usam os dados da base de demonstração. Nada aqui chama
// a API nem é clicável: tudo é aria-hidden e o texto da landing descreve a tela.

const NAV = {
  gerente: [["dashboard", "Visão geral"], ["team", "Funcionários"], ["heart", "Pacientes"], ["pill", "Remédios"], ["ticket", "Chamados", 1], ["clipboard", "Serviços"], ["truck", "Pedidos da rede"], ["cube", "Operação 3D"]],
  funcionario: [["dashboard", "Visão geral"], ["heart", "Pacientes"], ["pill", "Remédios"], ["ticket", "Solicitações"], ["clipboard", "Serviços"]],
  admin: [["dashboard", "Visão geral"], ["pill", "Medicamentos"], ["pharmacy", "Farmácias"], ["manager", "Gerentes"], ["heart", "Pacientes"], ["ticket", "Solicitações"], ["chart", "Desempenho"]],
};

const PESSOA = {
  gerente: { nome: "Fernanda Costa", cargo: "Gerente da unidade", espaco: "Espaço do gerente", unidade: "Farmácia Pedro João Neto", rotulo: "Unidade" },
  funcionario: { nome: "Lucas Pereira", cargo: "Funcionário da unidade", espaco: "Espaço do funcionário", unidade: "Farmácia Pedro João Neto", rotulo: "Unidade" },
  admin: { nome: "Admin", cargo: "Administrador da plataforma", espaco: "Espaço do admin", unidade: "Rede Intermedi", rotulo: "Plataforma" },
};

export function Icone({ nome, tamanho = 20 }) {
  if (nome === "team" || nome === "manager" || nome === "heart") {
    const papel = nome === "team" ? "funcionario" : nome === "manager" ? "gerente" : "paciente";
    return <PersonaIcon role={papel} size={tamanho} />;
  }
  if (nome === "dashboard" || nome === "chart") {
    return (
      <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {nome === "dashboard"
          ? <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>
          : <path d="M4 20V4m0 16h16M8 16v-5m4 5V8m4 8v-3" />}
      </svg>
    );
  }
  return <ManagerIcon name={nome} size={tamanho} />;
}

// Desenha o conteúdo em tamanho fixo (largura x altura) e escala para caber
// na largura do contêiner. Como é HTML, fica nítido em qualquer escala.
export function Escala({ largura, altura, preencher = false, className = "", children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const medir = () => el.style.setProperty("--s", String(el.clientWidth / largura));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [largura]);
  return (
    <div ref={ref} data-ui className={`pui-escala ${className}`} style={preencher ? undefined : { aspectRatio: `${largura} / ${altura}` }} aria-hidden="true">
      <div className="pui-escala-conteudo" style={{ width: largura, height: altura }}>{children}</div>
    </div>
  );
}

export function Selo({ tom, children }) {
  return <span className={`pui-selo pui-selo-${tom}`}>{children}</span>;
}

function hoje() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

// Casca das plataformas: barra lateral, barra de cima e conteúdo
export function Casca({ papel, ativo, migalha, children }) {
  const pessoa = PESSOA[papel];
  return (
    <div className={`pui pui-${papel}`}>
      <aside className="pui-lateral">
        <img className="pui-logo" src={logoCor} alt="" width="1920" height="1080" />
        <p className="pui-espaco"><i />{pessoa.espaco}</p>
        <ul className="pui-menu">
          {NAV[papel].map(([icone, rotulo, contagem]) => (
            <li key={rotulo} className={rotulo === ativo ? "is-ativo" : undefined}>
              <Icone nome={icone} />
              <span>{rotulo}</span>
              {contagem ? <b>{contagem}</b> : null}
            </li>
          ))}
        </ul>
        <div className="pui-unidade">
          <span className="pui-unidade-icone"><Icone nome="pharmacy" tamanho={16} /></span>
          <span><small>{pessoa.rotulo}</small>{pessoa.unidade}</span>
        </div>
      </aside>
      <div className="pui-principal">
        <header className="pui-topo">
          <p className="pui-migalha">{migalha.map((m, i) => <span key={m} className={i === migalha.length - 1 ? "is-atual" : undefined}>{m}</span>)}</p>
          <div className="pui-topo-direita">
            <span className="pui-sino"><Icone nome="bell" tamanho={18} /><b>{papel === "admin" ? 2 : 1}</b></span>
            <span className="pui-pessoa">
              <PersonaIcon role={papel} size={22} />
              <span><strong>{pessoa.nome}</strong><small>{pessoa.cargo}</small></span>
            </span>
          </div>
        </header>
        <div className="pui-conteudo">{children}</div>
      </div>
    </div>
  );
}

function Cabecalho({ titulo, frase, acao }) {
  return (
    <div className="pui-cabecalho">
      <div><h4>{titulo}</h4><p>{frase}</p></div>
      {acao && <span className="pui-cabecalho-acao">{acao}</span>}
    </div>
  );
}

function Indicador({ icone, rotulo, valor, dica, tom }) {
  return (
    <div className="pui-indicador">
      <Icone nome={icone} />
      <p>{rotulo}</p>
      <strong>{valor}</strong>
      {dica && <small className={tom ? `pui-tom-${tom}` : undefined}>{dica}</small>}
    </div>
  );
}

/* ---------------- Telas inteiras (demonstração) ---------------- */

export function TelaPainel() {
  return (
    <Casca papel="gerente" ativo="Visão geral" migalha={["Painel de gestão", "Minha unidade"]}>
      <Cabecalho titulo="Visão geral" frase={`Farmácia Pedro João Neto · Fernanda · ${hoje()}`} />
      <p className="pui-secao">Ferramentas</p>
      <div className="pui-ferramentas">
        {[["ticket", "Responder chamados", "Pedidos de reposição da equipe", 1], ["truck", "Pedidos da rede", "Outras farmácias pedindo a você"], ["pill", "Adicionar ao estoque", "Um remédio do catálogo"], ["cube", "Operação 3D", "A unidade em tempo real"]].map(([icone, titulo, frase, n]) => (
          <div key={titulo} className="pui-ferramenta">
            <span className="pui-ferramenta-icone"><Icone nome={icone} /></span>
            <span><strong>{titulo}</strong><small>{frase}</small></span>
            {n ? <b className="pui-contagem">{n}</b> : null}
          </div>
        ))}
      </div>
      <div className="pui-indicadores">
        <Indicador icone="ticket" rotulo="Chamados pendentes" valor="1" dica="aguardando sua resposta" />
        <Indicador icone="truck" rotulo="Pedidos da rede" valor="0" dica="de outras farmácias para você" />
        <Indicador icone="alert" rotulo="Itens com atenção" valor="1" dica="críticos, zerados ou vencidos" />
        <Indicador icone="pill" rotulo="Itens no estoque" valor="6" dica="remédios cadastrados na unidade" />
      </div>
      <div className="pui-painel">
        <div className="pui-painel-topo"><div><strong>Chamados que precisam de você</strong><small>Solicitações de reposição abertas pela sua equipe.</small></div><span className="pui-link">Ver todos →</span></div>
        <table className="pui-tabela">
          <thead><tr><th>Chamado</th><th>Solicitante</th><th>Prioridade</th><th>Status</th><th>Ação</th></tr></thead>
          <tbody>
            <tr className="is-destaque">
              <td><strong>Falta de paracetamol</strong><small>#1 · Paracetamol (50)</small></td>
              <td>Lucas Pereira<small>Atendente</small></td>
              <td><Selo tom="red">Alta</Selo></td>
              <td><Selo tom="yellow">Pendente</Selo></td>
              <td><span className="pui-link">Responder ↗</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Casca>
  );
}

export function LinhaDoTempo({ atual, feitas = [] }) {
  const passos = ["Aberto", atual > 1 ? "Aceito pelo gerente" : "Aguardando o gerente", "Pedido à rede", "Em trânsito", "Resolvido"];
  return (
    <ol className="pui-linha">
      {passos.map((p, i) => {
        const estado = i < atual || feitas.includes(i) ? "feito" : i === atual ? "atual" : "futuro";
        return (
          <li key={p} className={`is-${estado}`}>
            <i />
            <span>{p}</span>
            <small>{i === 0 ? "06:15" : estado === "futuro" ? "—" : ""}</small>
          </li>
        );
      })}
    </ol>
  );
}

export function TelaRelatorio() {
  return (
    <Casca papel="gerente" ativo="Chamados" migalha={["← Voltar", "CH-2026-000001"]}>
      <div className="pui-relatorio">
        <div className="pui-relatorio-topo">
          <span className="pui-i">i</span>
          <span><small>Rede Intermedi · Relatório de chamado</small><strong>Farmácia Pedro João Neto</strong></span>
          <span className="pui-protocolo"><small>Protocolo</small><strong>CH-2026-000001</strong><small>Aberto em 20/09/2026 06:15</small></span>
        </div>
        <div className="pui-relatorio-titulo">
          <div><h4>Falta de paracetamol</h4><p>Pedido de reposição de estoque <Selo tom="red">Alta</Selo></p></div>
          <span className="pui-status-caixa">Pendente</span>
        </div>
        <div className="pui-relatorio-grade">
          <div><small>Solicitante</small><strong className="pui-acento">Lucas Pereira</strong><span>Atendente · Manhã · Mat. 000001</span></div>
          <div><small>Unidade</small><strong className="pui-acento">Farmácia Pedro João Neto</strong><span>Guaianases · São Paulo/SP</span></div>
          <div><small>Responsável</small><strong className="pui-tom-yellow">Aguardando resposta</strong><span>Ana Souza, Fernanda Costa</span></div>
        </div>
        <LinhaDoTempo atual={1} />
        <div className="pui-relatorio-itens">
          <p><b>1</b> Solicitação</p>
          <blockquote>“Estoque baixo”<small>Lucas Pereira, ao abrir o chamado</small></blockquote>
          <p><b>2</b> Itens solicitados</p>
          <table className="pui-tabela">
            <thead><tr><th>Remédio</th><th>Qtd.</th><th>Estoque atual</th><th>Situação</th></tr></thead>
            <tbody><tr><td><strong>Paracetamol 750mg</strong></td><td>50</td><td>40 (mínimo 50)</td><td><Selo tom="yellow">Aguardando gerente</Selo></td></tr></tbody>
          </table>
        </div>
      </div>
    </Casca>
  );
}

export function FormSolicitar({ compacto = false }) {
  return (
    <div className={`pui-modal${compacto ? " is-compacto" : ""}`}>
      <div className="pui-modal-topo"><strong>Solicitar reposição</strong><span>×</span></div>
      <label>Funcionário solicitante<span className="pui-campo pui-campo-select">Lucas Pereira · Atendente</span></label>
      <div className="pui-grupo">
        <small>Remédios para repor</small>
        <div className="pui-linha-campos">
          <label>Remédio 1<span className="pui-campo pui-campo-select">Paracetamol 750mg</span></label>
          <label>Quantidade<span className="pui-campo">50</span></label>
        </div>
        <span className="pui-botao pui-botao-claro">+ Adicionar remédio</span>
      </div>
      <div className="pui-linha-campos">
        <label>Prioridade<span className="pui-campo pui-campo-select">Alta</span></label>
        <label>Descrição<span className="pui-campo">Estoque baixo</span></label>
      </div>
      <div className="pui-modal-acoes">
        <span className="pui-botao pui-botao-claro">Cancelar</span>
        <span className="pui-botao pui-botao-primario pui-enviar">Enviar solicitação</span>
      </div>
    </div>
  );
}

export function TelaSolicitar() {
  return (
    <Casca papel="funcionario" ativo="Solicitações" migalha={["Olá, Lucas", "Farmácia Pedro João Neto"]}>
      <Cabecalho titulo="Minhas solicitações" frase="Acompanhe os pedidos de reposição enviados ao gerente e veja a resposta." acao="Solicitar reposição" />
      <div className="pui-indicadores is-tres">
        <Indicador icone="ticket" rotulo="Solicitações" valor="1" />
        <Indicador icone="clock" rotulo="Pendentes" valor="1" />
        <Indicador icone="check" rotulo="Respondidas" valor="0" />
      </div>
      <div className="pui-veu" />
      <FormSolicitar />
    </Casca>
  );
}

export function TelaOperacao({ video, poster, tocar }) {
  // O vídeo só baixa e toca quando esta tela está na frente
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (tocar) v.play().catch(() => {});
    else v.pause();
  }, [tocar]);
  return (
    <Casca papel="gerente" ativo="Operação 3D" migalha={["Painel de gestão", "Minha unidade"]}>
      <Cabecalho titulo="Operação 3D" frase="Estoque, equipe, chamados e entregas da Farmácia Pedro João Neto em uma visão espacial." acao="Ver estoque ↗" />
      <div className="pui-operacao">
        <div className="pui-cena">
          <span className="pui-cena-abas"><b>Visão geral</b><span>Estoque</span><span>Atendimento</span><span>Doca</span><span>Gerência</span></span>
          <video ref={ref} src={video} poster={poster} muted loop playsInline preload="none" />
        </div>
        <div className="pui-painel pui-lista">
          <small>Navegue pela unidade</small>
          {[["clock", "Vitamina C 1g", "Vence em 30 dias", "red", "Alta"], ["ticket", "Chamado CH-2026-000001", "Falta de paracetamol · Lucas Pereira", "red", "Alta"], ["clock", "Omeprazol 20mg", "Vence em 61 dias", "yellow", "Média"], ["alert", "Paracetamol 750mg", "Abaixo do mínimo (40 de 50)", "yellow", "Média"]].map(([icone, titulo, frase, tom, rotulo]) => (
            <div key={titulo} className="pui-lista-item">
              <Icone nome={icone} tamanho={18} />
              <span><strong>{titulo}</strong><small>{frase}</small></span>
              <Selo tom={tom}>{rotulo}</Selo>
            </div>
          ))}
        </div>
      </div>
    </Casca>
  );
}

export function TelaDesempenho() {
  const pontos = [62, 22, 24, 26, 23, 21, 20, 24, 58];
  const linha = pontos.map((y, i) => `${i === 0 ? "M" : "L"}${i * 50} ${y}`).join(" ");
  return (
    <Casca papel="admin" ativo="Desempenho" migalha={["Painel de administração", "Desempenho"]}>
      <Cabecalho titulo="Desempenho" frase="Como o sistema está sendo usado e se tudo está funcionando." />
      <div className="pui-alerta">
        <Icone nome="alert" tamanho={18} />
        <span><strong>A rota /remedios/reconhecer-foto está falhando</strong><small>A busca de remédio por foto do app falhou em 45% das requisições dos últimos 5 minutos.</small></span>
        <span className="pui-botao pui-botao-perigo">Ver o que fazer</span>
      </div>
      <div className="pui-abas"><b>Visão geral</b><span>Mapa de calor</span><span>Rotas e telas</span><span>Saúde do sistema</span></div>
      <div className="pui-indicadores">
        <Indicador icone="people" rotulo="Usuários ativos" valor="222" dica="+18,7% vs. 7 dias anteriores" tom="green" />
        <Indicador icone="check" rotulo="Cliques" valor="11.056" dica="−0,7% vs. 7 dias anteriores" tom="red" />
        <Indicador icone="alert" rotulo="Taxa de erro" valor="0,9%" dica="+200% vs. 7 dias anteriores" tom="red" />
        <Indicador icone="clock" rotulo="Tempo de resposta" valor="67 ms" dica="+59,5% vs. 7 dias anteriores" tom="red" />
      </div>
      <div className="pui-graficos">
        <div className="pui-painel">
          <div className="pui-painel-topo"><div><strong>Requisições e erros</strong><small>11.155 requisições · 96 com erro</small></div></div>
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="pui-grafico-linha"><path d={linha} /></svg>
        </div>
        <div className="pui-painel">
          <div className="pui-painel-topo"><div><strong>Telas mais acessadas</strong><small>Visitas no período</small></div></div>
          {[["Início", 100], ["Funcionário · Visão geral", 64], ["Remédios", 42], ["Farmácias", 27]].map(([tela, v]) => (
            <div key={tela} className="pui-barra"><span>{tela}</span><i style={{ width: `${v}%` }} /></div>
          ))}
        </div>
      </div>
    </Casca>
  );
}

/* ---------------- Pedaços para "Como funciona" ---------------- */

export function FragResponder() {
  return (
    <div className="pui pui-gerente pui-cartao">
      <div className="pui-cartao-topo">
        <span><small>CH-2026-000001</small><strong>Falta de paracetamol</strong></span>
        <Selo tom="yellow">Pendente</Selo>
      </div>
      <p className="pui-cartao-meta">Lucas Pereira · Atendente · prioridade <Selo tom="red">Alta</Selo></p>
      <p className="pui-secao">Disponibilidade na rede</p>
      <div className="pui-rede">
        <div className="pui-rede-remedio"><strong>Paracetamol 750mg</strong><small>pede 50 · na unidade 40 (mínimo 50)</small></div>
        <div className="pui-rede-farmacia is-escolhida">
          <Icone nome="pharmacy" tamanho={18} />
          <span><strong>Farmácia Saúde Leste</strong><small>180 em estoque · 130 disponíveis</small></span>
          <em>Provável fornecedora</em>
        </div>
      </div>
      <div className="pui-cartao-acoes">
        <span className="pui-botao pui-botao-primario pui-pulsa">Aceitar e pedir à rede</span>
        <span className="pui-botao pui-botao-contorno">Recusar</span>
      </div>
    </div>
  );
}

export function FragPedido() {
  return (
    <div className="pui pui-gerente pui-cartao">
      <div className="pui-abas is-pequena"><b>Recebidos <i>1</i></b><span>Enviados</span></div>
      <div className="pui-pedido">
        <div className="pui-cartao-topo">
          <span><small>Farmácia Pedro João Neto pediu</small><strong>50× Paracetamol 750mg</strong></span>
          <Selo tom="yellow">Aguardando resposta</Selo>
        </div>
        <div className="pui-estoque">
          <span><small>Seu estoque</small><strong>180 un.</strong></span>
          <span className="pui-estoque-barra"><i style={{ width: "100%" }} /><b style={{ left: `${(50 / 180) * 100}%` }} /></span>
          <span><small>Depois do envio</small><strong>130 un.</strong></span>
        </div>
        <p className="pui-cartao-meta">Ao aceitar, sai do seu estoque agora e a sua equipe recebe o aviso para preparar o envio.</p>
        <div className="pui-cartao-acoes">
          <span className="pui-botao pui-botao-primario pui-pulsa">Aceitar pedido</span>
          <span className="pui-botao pui-botao-contorno">Recusar</span>
        </div>
      </div>
    </div>
  );
}

export function FragPreparo() {
  const passos = [["Pedido confirmado", "feito"], ["Em preparo · Larissa Mendes", "feito"], ["Saiu da Farmácia Saúde Leste", "feito"], ["Em trânsito · chega em 1:42", "atual"], ["Chegou", "futuro"], ["Entregue", "futuro"]];
  return (
    <div className="pui pui-funcionario pui-cartao">
      <div className="pui-aviso">
        <Icone nome="box" tamanho={18} />
        <span><strong>Prepare 50× Paracetamol 750mg</strong><small>para a Farmácia Pedro João Neto · 1 caixa de 50 un.</small></span>
        <span className="pui-botao pui-botao-primario">Começar</span>
      </div>
      <p className="pui-secao">Rastreio do pedido</p>
      <ol className="pui-rastreio">
        {passos.map(([p, estado]) => <li key={p} className={`is-${estado}`}><i />{p}</li>)}
      </ol>
      <div className="pui-caminho"><Icone nome="truck" tamanho={20} /><span className="pui-caminho-trilho"><i /></span><Icone nome="pharmacy" tamanho={18} /></div>
    </div>
  );
}

export function FragResolvido() {
  return (
    <div className="pui pui-gerente pui-cartao">
      <div className="pui-cartao-topo">
        <span><small>CH-2026-000001</small><strong>Falta de paracetamol</strong></span>
        <Selo tom="green">Resolvido</Selo>
      </div>
      <LinhaDoTempo atual={5} />
      <table className="pui-tabela">
        <thead><tr><th>Remédio</th><th>Qtd.</th><th>Fornecedora</th><th>Situação</th></tr></thead>
        <tbody><tr><td><strong>Paracetamol 750mg</strong></td><td>50</td><td>Farmácia Saúde Leste</td><td><Selo tom="green">Recebido</Selo></td></tr></tbody>
      </table>
      <p className="pui-registro"><Icone nome="lock" tamanho={16} />Registro somente leitura: cada ação fica gravada com data, hora e responsável.</p>
    </div>
  );
}
