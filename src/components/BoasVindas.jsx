import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logoIntermedi from "../assets/logoIntermedi.png";
import ManagerIcon from "./ManagerIcon";
import NumeroAnimado from "./NumeroAnimado";
import PersonaAvatar from "./PersonaAvatar";
import { fotoPessoa, listarFuncionarios, listarGerentes } from "../services/api";
import { primeiroNome } from "../services/nomes";
import "../styles/boasVindas.css";

// Guia de boas-vindas no primeiro acesso do gerente ou do funcionário (um por
// pessoa, guardado no navegador). Duas fases:
//   1. painel grande: boas-vindas, a Intermedi, a farmácia e as tarefas;
//   2. passeio pela tela de verdade: a parte explicada fica nítida e o resto
//      desfocado, com um balão contando o que fazer ali.
// Para rever numa apresentação, abra a página com ?boas-vindas na URL.

const chaveVisto = (papel, id) => `intermedi.boasVindas.v1:${papel}:${id}`;

function jaViu(papel, id) {
  try {
    return localStorage.getItem(chaveVisto(papel, id)) === "1";
  } catch {
    return false;
  }
}

function marcarVisto(papel, id) {
  try {
    localStorage.setItem(chaveVisto(papel, id), "1");
  } catch {
    // sem storage (modo privado): o guia volta no próximo acesso
  }
}

// ["Ana", "Bia", "Caio"] -> "Ana, Bia e Caio"
const juntarNomes = (nomes) =>
  nomes.length < 2 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;

const forcado = () => new URLSearchParams(window.location.search).has("boas-vindas");

const movimentoReduzido = (el) =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || Boolean(el?.closest(".a11y-motion"));

const TAREFAS = {
  funcionario: [
    ["clipboard", "Atender pacientes", "Registre cada remédio entregue."],
    ["ticket", "Pedir reposição", "Avise o gerente do que está acabando."],
    ["pill", "Consultar o estoque", "Veja o que tem na unidade."],
  ],
  gerente: [
    ["ticket", "Responder a equipe", "Aceite ou recuse os pedidos de reposição."],
    ["box", "Cuidar do estoque", "Fique de olho em itens críticos e vencidos."],
    ["truck", "Falar com a rede", "Peça e envie remédios a outras farmácias."],
    ["userPlus", "Montar a equipe", "Cadastre os funcionários da unidade."],
  ],
};

// Passeio: cada etapa destaca uma parte da tela (seletor CSS da página real).
// Etapas cujo alvo não aparece (ex.: menu escondido no celular) são puladas.
const MENU = { alvo: ".manager-sidebar nav", icone: "info", titulo: "Seu menu", texto: "Todas as áreas da unidade ficam aqui do lado.", bloco: "nearest" };
const SINO = { alvo: ".mgr-topbar .mgr-notifications", icone: "bell", lados: ["baixo", "esquerda"], bloco: "nearest", toque: "centro" };
const CONTA = { alvo: ".mgr-topbar .mgr-account", icone: "user", titulo: "Seu perfil", texto: "Toque aqui para ver seus dados e colocar sua foto.", lados: ["baixo", "esquerda"], bloco: "nearest" };

const PASSEIO = {
  funcionario: [
    MENU,
    { alvo: '[data-track="atalho:novo-servico"]', icone: "clipboard", titulo: "Entregar um remédio", toque: "icone",
      passos: ["Toque em Novo serviço.", "Escolha o paciente e o remédio.", "Confirme a entrega."] },
    { alvo: '[data-track="atalho:pedir-reposicao"]', icone: "ticket", titulo: "Pedir reposição", toque: "icone",
      passos: ["Toque em Pedir reposição.", "Escolha os remédios e as quantidades.", "Envie. O gerente recebe na hora."] },
    { alvo: '[data-track="atalho:consultar-estoque"]', icone: "pill", titulo: "Consultar o estoque", toque: "icone",
      texto: "Veja o que tem na unidade e o que está acabando." },
    { alvo: '[data-track="card:minhas-solicitacoes"]', icone: "check", titulo: "Acompanhe seus pedidos",
      texto: "Aqui você vê quantos pedidos abriu e quais ainda esperam o gerente." },
    { ...SINO, titulo: "Notificações", texto: "O sino avisa cada etapa da entrega dos remédios." },
    CONTA,
  ],
  gerente: [
    MENU,
    { alvo: '[data-track="atalho:responder-chamados"]', icone: "ticket", titulo: "Responder um chamado", toque: "icone",
      passos: ["Abra Responder chamados.", "Veja o que a equipe pediu.", "Aceite para pedir à rede, ou recuse."] },
    { alvo: '[data-track="atalho:pedidos-da-rede"]', icone: "truck", titulo: "Ajudar outra farmácia", toque: "icone",
      passos: ["Abra Pedidos da rede.", "Veja o que outra farmácia precisa.", "Aceite para enviar do seu estoque."] },
    { alvo: '[data-track="atalho:adicionar-ao-estoque"]', icone: "pill", titulo: "Adicionar ao estoque", toque: "icone",
      texto: "Escolha um remédio do catálogo e a quantidade que chegou." },
    { alvo: '[data-track="atalho:novo-funcionario"]', icone: "userPlus", titulo: "Cadastrar um funcionário", toque: "icone",
      passos: ["Toque em Novo funcionário.", "Preencha os dados da pessoa.", "A matrícula e a senha vão por e-mail."] },
    { alvo: '[data-track="card:itens-com-atencao"]', icone: "alert", titulo: "Itens com atenção",
      texto: "Remédios críticos, zerados ou vencidos aparecem aqui primeiro." },
    { alvo: '[data-track="atalho:operacao-3d"]', icone: "cube", titulo: "Operação 3D", toque: "icone",
      texto: "Veja a unidade funcionando em tempo real." },
    { ...SINO, titulo: "Notificações", texto: "Chamados novos e pedidos da rede chegam aqui." },
    CONTA,
  ],
};

const FOLGA = 8; // espaço entre o alvo e a borda do destaque
const RAIO = 18;
const MARGEM = 16;
const LARGURA_BALAO = 340;

// contorno da tela com um furo arredondado no alvo (regra evenodd)
function caminhoDoVeu({ x, y, w, h }, vw, vh) {
  const r = Math.min(RAIO, w / 2, h / 2);
  return `path(evenodd, "M0 0H${vw}V${vh}H0Z M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z")`;
}

// onde o balão cabe ao lado do alvo, na ordem de preferência da etapa
function posicaoDoBalao(furo, vw, vh, altura, lados = ["direita", "esquerda", "baixo", "cima"]) {
  const largura = Math.min(LARGURA_BALAO, vw - MARGEM * 2);
  const limitar = (valor, min, max) => Math.max(min, Math.min(valor, max));
  if (vw < 640) return { left: MARGEM, top: vh - altura - MARGEM, largura };
  const yLado = limitar(furo.y, MARGEM, vh - altura - MARGEM);
  const xCentro = limitar(furo.x + furo.w / 2 - largura / 2, MARGEM, vw - largura - MARGEM);
  const opcoes = {
    direita: furo.x + furo.w + MARGEM + largura <= vw - MARGEM && { left: furo.x + furo.w + MARGEM, top: yLado },
    esquerda: furo.x - MARGEM - largura >= MARGEM && { left: furo.x - MARGEM - largura, top: yLado },
    baixo: furo.y + furo.h + MARGEM + altura <= vh - MARGEM && { left: xCentro, top: furo.y + furo.h + MARGEM },
    cima: furo.y - MARGEM - altura >= MARGEM && { left: xCentro, top: furo.y - MARGEM - altura },
  };
  const escolhida = [...lados, "direita", "esquerda", "baixo", "cima"].map((lado) => opcoes[lado]).find(Boolean);
  return { ...(escolhida || { left: (vw - largura) / 2, top: vh - altura - MARGEM }), largura };
}

// o "i" da Intermedi, para usar dentro de outros SVGs
function MarcaIntermedi(props) {
  return (
    <g {...props}>
      <circle cx="20" cy="11" r="10" />
      <path fillRule="evenodd" d="M20 24A12 12 0 0 1 32 36v23a12 12 0 0 1-24 0V36a12 12 0 0 1 12-12Zm0 3a9 9 0 0 0-9 9v12h18V36a9 9 0 0 0-9-9Z" />
    </g>
  );
}

// farmácias ligadas à Intermedi, com pedidos indo e vindo
function RedeAnimada({ animar }) {
  const nos = [[44, 34], [44, 126], [316, 34], [316, 126]];
  const caminhos = nos.map(([x, y]) => `M${x} ${y} C ${x < 180 ? 120 : 240} ${y}, ${x < 180 ? 130 : 230} 80, 180 80`);
  return (
    <svg className="bv-rede" viewBox="0 0 360 160" aria-hidden="true" focusable="false">
      {caminhos.map((d, i) => (
        <path key={d} d={d} className="bv-rede-linha" style={{ "--i": i }} pathLength="1" />
      ))}
      {animar && caminhos.map((d, i) => (
        <circle key={`ponto-${d}`} r="3.2" className="bv-rede-ponto">
          <animateMotion dur="2.6s" begin={`${0.9 + i * 0.45}s`} repeatCount="indefinite" path={d} />
        </circle>
      ))}
      {nos.map(([x, y], i) => (
        <g key={`${x}-${y}`} className="bv-rede-no" style={{ "--i": i }}>
          <circle cx={x} cy={y} r="22" />
          <g transform={`translate(${x - 9} ${y - 9}) scale(0.75)`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="3" />
            <path d="M10 21v-5h4v5M12 6v6m-3-3h6" />
          </g>
        </g>
      ))}
      <g className="bv-rede-centro">
        <circle cx="180" cy="80" r="34" />
        <MarcaIntermedi transform="translate(169 61) scale(0.55)" />
      </g>
    </svg>
  );
}

// miniatura da tela com uma parte em foco por vez: o que o passeio vai fazer
function TelaMiniatura() {
  return (
    <div className="bv-mini" aria-hidden="true">
      <div className="bv-mini-lateral">
        <i /><i /><i /><i /><i />
      </div>
      <div className="bv-mini-corpo">
        <div className="bv-mini-titulo"><i /><i /></div>
        <div className="bv-mini-grade">
          {[0, 1, 2, 3].map((i) => <div key={i} className="bv-mini-cartao" style={{ "--i": i }}><i /><b /></div>)}
        </div>
        <div className="bv-mini-linhas"><i /><i /><i /></div>
      </div>
    </div>
  );
}

function Confete() {
  return (
    <span className="bv-confete" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} style={{ "--a": `${(360 / 14) * i}deg`, "--d": `${70 + (i % 3) * 22}px` }} />
      ))}
    </span>
  );
}

export default function BoasVindas({ papel, pessoa, farmacia }) {
  const id = pessoa?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const [aberto, setAberto] = useState(() => Boolean(id) && (forcado() || !jaViu(papel, id)));
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState(1);
  const [gerentes, setGerentes] = useState(null); // gerentes da farmácia, sem a própria pessoa
  const [equipe, setEquipe] = useState(null);
  const [minhaFoto, setMinhaFoto] = useState(null);
  const [medida, setMedida] = useState(null); // { etapa, x, y, w, h, vw, vh }
  const [alturaBalao, setAlturaBalao] = useState(220);
  // os pontos da rede andam por SMIL, que o CSS não pausa: decide aqui
  const [animar] = useState(() => !movimentoReduzido(document.querySelector(".a11y-motion")));
  const dialogo = useRef(null);
  const titulo = useRef(null);
  const balao = useRef(null);

  const base = papel === "gerente" ? "/gerente" : "/funcionario";
  const nome = primeiroNome(pessoa?.nome, papel === "gerente" ? "Gerente" : "Funcionário");
  const nomeFarmacia = farmacia?.nome || "Sua farmácia";
  const passeio = PASSEIO[papel];

  // ordem: 5 telas do painel, o passeio pela tela real e a tela final
  const etapas = [
    { tipo: "painel", chave: "inicio" },
    { tipo: "painel", chave: "intermedi" },
    { tipo: "painel", chave: "farmacia" },
    { tipo: "painel", chave: "tarefas" },
    { tipo: "painel", chave: "passeio" },
    ...passeio.map((item, indice) => ({ ...item, tipo: "passeio", chave: `passeio-${indice}`, numero: indice + 1 })),
    { tipo: "painel", chave: "pronto" },
  ];
  const atual = etapas[etapa];
  const emPasseio = atual.tipo === "passeio";
  const ultima = etapa === etapas.length - 1;

  useEffect(() => {
    const el = dialogo.current;
    if (aberto && el && !el.open) el.showModal();
  }, [aberto]);

  // gerentes e equipe da farmácia, com as fotos (sem foto fica o ícone)
  useEffect(() => {
    if (!aberto) return undefined;
    const controller = new AbortController();
    const daFarmacia = (item) => String(item.fkIdFarmacia ?? item.idFarmacia ?? "") === String(farmacia?.id ?? "");
    listarGerentes({ signal: controller.signal })
      .then((lista) => {
        const daUnidade = lista.filter(daFarmacia);
        if (papel === "gerente") {
          // quem divide a gestão: os outros gerentes da mesma farmácia
          const ehEu = (g) => String(g.emailGerente ?? "").toLowerCase() === String(pessoa.email ?? "").toLowerCase();
          setMinhaFoto(fotoPessoa(daUnidade.find(ehEu)?.fotoGerente));
          setGerentes(daUnidade.filter((g) => !ehEu(g)));
        } else {
          setGerentes(daUnidade);
        }
      })
      .catch(() => {});
    listarFuncionarios({ signal: controller.signal })
      .then((lista) => {
        if (papel === "gerente") setEquipe(lista.filter(daFarmacia));
        else setMinhaFoto(fotoPessoa(lista.find((f) => String(f.idFuncionario) === String(id))?.fotoFuncionario));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [aberto, papel, id, pessoa?.email, farmacia?.id]);

  // passeio: leva para a visão geral, acha o alvo, rola até ele e acompanha a posição
  useEffect(() => {
    if (!aberto || !emPasseio) return undefined;
    if (location.pathname.replace(/\/$/, "") !== base) navigate(base);
    let el = null;
    let tentativas = 0;
    let espera;
    let quadro;
    const medir = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // o destaque não passa da borda da tela (ex.: itens do topo)
      const x = Math.max(4, r.left - FOLGA);
      const y = Math.max(4, r.top - FOLGA);
      const w = Math.min(vw - 4, r.right + FOLGA) - x;
      const h = Math.min(vh - 4, r.bottom + FOLGA) - y;
      setMedida({ etapa, x, y, w, h, vw, vh });
    };
    const aoMudar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(medir);
    };
    const procurar = () => {
      const achado = document.querySelector(atual.alvo);
      if (!achado || !achado.getClientRects().length || achado.getBoundingClientRect().width === 0) {
        // a página ainda está montando; depois de ~2,5 s a etapa é pulada
        if (++tentativas > 25) setEtapa((agora) => Math.min(etapas.length - 1, Math.max(0, agora + direcao)));
        else espera = setTimeout(procurar, 100);
        return;
      }
      el = achado;
      el.scrollIntoView({ block: atual.bloco ?? "center", inline: "nearest", behavior: movimentoReduzido(dialogo.current) ? "auto" : "smooth" });
      medir();
    };
    espera = setTimeout(procurar, 0);
    window.addEventListener("resize", aoMudar);
    window.addEventListener("scroll", aoMudar, true);
    return () => {
      clearTimeout(espera);
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", aoMudar);
      window.removeEventListener("scroll", aoMudar, true);
    };
    // etapas/atual mudam junto com `etapa`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, emPasseio, etapa]);

  // altura do balão, para escolher o lado em que ele cabe
  useEffect(() => {
    const el = balao.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observador = new ResizeObserver(([entrada]) => setAlturaBalao(entrada.target.offsetHeight));
    observador.observe(el);
    return () => observador.disconnect();
  }, [emPasseio, aberto]);

  useEffect(() => {
    if (aberto) titulo.current?.focus({ preventScroll: true });
  }, [aberto, etapa]);

  if (!aberto) return null;

  function fechar() {
    marcarVisto(papel, id);
    dialogo.current?.close();
    setAberto(false);
  }

  function irPara(proxima) {
    setDirecao(proxima > etapa ? 1 : -1);
    setEtapa(Math.max(0, Math.min(etapas.length - 1, proxima)));
  }

  const avancar = () => (ultima ? fechar() : irPara(etapa + 1));
  const voltar = () => irPara(etapa - 1);

  function teclar(event) {
    if (event.key === "ArrowRight") avancar();
    else if (event.key === "ArrowLeft" && etapa > 0) voltar();
  }

  const furo = emPasseio && medida?.etapa === etapa ? medida : null;
  const posicao = furo ? posicaoDoBalao(furo, furo.vw, furo.vh, alturaBalao, atual.lados) : null;
  const toque = furo && atual.toque
    ? { left: atual.toque === "icone" ? furo.x + FOLGA + 34 : furo.x + furo.w / 2, top: furo.y + furo.h / 2 }
    : null;
  const rotuloAvancar = etapa === 0 ? "Começar" : atual.chave === "passeio" ? "Começar o passeio" : ultima ? "Ir para a plataforma" : "Continuar";

  function conteudoDoPainel() {
    switch (atual.chave) {
      case "inicio":
        return (
          <>
            <img className="bv-logo" src={logoIntermedi} alt="Intermedi" width="1920" height="1080" />
            <h1 ref={titulo} tabIndex={-1}>Boas-vindas, {nome}.</h1>
            <p>Este é o seu espaço na Intermedi.</p>
          </>
        );
      case "intermedi":
        return (
          <>
            <RedeAnimada animar={animar} />
            <h1 ref={titulo} tabIndex={-1}>Farmácias conectadas.<br />Cuidado mais perto.</h1>
            <p>A Intermedi liga as farmácias da rede para que nenhum paciente fique sem o seu remédio.</p>
            <p className="bv-assinatura">Um produto <strong>Auvox</strong></p>
          </>
        );
      case "farmacia": {
        const outros = gerentes ?? [];
        const nomes = juntarNomes(outros.map((g) => g.nomeGerente));
        const frase = papel === "gerente"
          ? outros.length ? `Você divide a gestão com ${nomes}.` : "Você é quem cuida desta unidade."
          : outros.length ? `Você trabalha com ${nomes}, que ${outros.length > 1 ? "gerenciam" : "gerencia"} a unidade.`
            : "A unidade ainda está sem gerente.";
        // o grupo: você e quem trabalha com você, se aproximando até se encostar
        const grupo = [
          { chave: "voce", role: papel, foto: minhaFoto },
          ...outros.map((g) => ({ chave: `g${g.idGerente}`, role: "gerente", foto: fotoPessoa(g.fotoGerente) })),
          ...(papel === "gerente" ? (equipe ?? []).map((f) => ({ chave: `f${f.idFuncionario}`, role: "funcionario", foto: fotoPessoa(f.fotoFuncionario) })) : []),
        ];
        return (
          <>
            <div className="bv-grupo" aria-hidden="true">
              {grupo.slice(0, 5).map((membro, indice) => (
                <span key={membro.chave} className={indice === 0 ? "is-voce" : undefined}
                  style={{ "--k": indice, "--de": indice === 0 ? "-64px" : `${48 + indice * 14}px` }}>
                  <PersonaAvatar role={membro.role} photo={membro.foto} className="bv-avatar bv-avatar-grupo" />
                </span>
              ))}
              {grupo.length > 5 && <span className="bv-grupo-mais" style={{ "--k": 5, "--de": "120px" }}>+{grupo.length - 5}</span>}
            </div>
            <p className="bv-sobretitulo">{papel === "gerente" ? "Você gerencia a" : "Você faz parte da"}</p>
            <h1 ref={titulo} tabIndex={-1}>{nomeFarmacia}</h1>
            {gerentes && <p>{frase}</p>}
            <ul className="bv-pessoas">
              <li className="is-voce" style={{ "--i": 0 }}>
                <PersonaAvatar role={papel} photo={minhaFoto} className="bv-avatar" />
                <span>
                  <strong>{pessoa.nome}</strong>
                  <small>{papel === "gerente" ? "Gerente" : "Funcionário"}</small>
                </span>
                <span className="bv-selo is-voce">Você</span>
              </li>
              {outros.map((g, indice) => (
                <li key={g.idGerente} style={{ "--i": indice + 1 }}>
                  <PersonaAvatar role="gerente" photo={fotoPessoa(g.fotoGerente)} className="bv-avatar" />
                  <span>
                    <strong>{g.nomeGerente}</strong>
                    <small>{papel === "gerente" ? "Gerente com você" : "Gerente da unidade"}</small>
                  </span>
                  <span className="bv-selo is-gerente">Gerente</span>
                </li>
              ))}
              {papel === "gerente" && equipe && (
                <li style={{ "--i": outros.length + 1 }}>
                  <span className="bv-pilha">
                    {equipe.slice(0, 3).map((f, indice) => (
                      <span key={f.idFuncionario} style={{ "--j": indice }}>
                        <PersonaAvatar role="funcionario" photo={fotoPessoa(f.fotoFuncionario)} className="bv-avatar bv-avatar-pilha" />
                      </span>
                    ))}
                    {!equipe.length && <PersonaAvatar role="funcionario" className="bv-avatar" />}
                  </span>
                  <span>
                    <strong>
                      {equipe.length ? <><NumeroAnimado valor={equipe.length} /> {equipe.length === 1 ? "funcionário" : "funcionários"}</> : "Nenhum funcionário ainda"}
                    </strong>
                    <small>Sua equipe</small>
                  </span>
                  <span className="bv-selo is-equipe">Equipe</span>
                </li>
              )}
            </ul>
          </>
        );
      }
      case "tarefas":
        return (
          <>
            <p className="bv-sobretitulo">Suas principais tarefas</p>
            <h1 ref={titulo} tabIndex={-1}>O que você faz aqui</h1>
            <ul className="bv-lista">
              {TAREFAS[papel].map(([icone, nomeTarefa, descricao], indice) => (
                <li key={nomeTarefa} style={{ "--i": indice }}>
                  <span className="bv-lista-icone"><ManagerIcon name={icone} size={22} /></span>
                  <span>
                    <strong>{nomeTarefa}</strong>
                    <small>{descricao}</small>
                  </span>
                </li>
              ))}
            </ul>
          </>
        );
      case "passeio":
        return (
          <>
            <TelaMiniatura />
            <h1 ref={titulo} tabIndex={-1}>Agora, um passeio pela plataforma.</h1>
            <p>Vamos destacar cada parte da tela e mostrar como usar.</p>
          </>
        );
      default:
        return (
          <>
            <span className="bv-pronto">
              <Confete />
              <svg viewBox="0 0 52 52" aria-hidden="true" focusable="false">
                <circle cx="26" cy="26" r="24" pathLength="1" />
                <path d="m15 27 7 7 15-16" pathLength="1" />
              </svg>
            </span>
            <h1 ref={titulo} tabIndex={-1}>Tudo pronto, {nome}.</h1>
            <p>Bom trabalho na {nomeFarmacia}.</p>
          </>
        );
    }
  }

  return (
    <dialog
      ref={dialogo}
      className={`bv-dialogo${emPasseio ? " is-passeio" : ""}`}
      aria-label="Boas-vindas à Intermedi"
      onCancel={(event) => {
        event.preventDefault();
        fechar();
      }}
      onKeyDown={teclar}
    >
      <span className="sr-only" aria-live="polite">Etapa {etapa + 1} de {etapas.length}</span>

      {emPasseio ? (
        <>
          <div className="bv-veu" style={furo ? { clipPath: caminhoDoVeu(furo, furo.vw, furo.vh) } : undefined} />
          {furo && (
            <div className="bv-anel" style={{ left: furo.x, top: furo.y, width: furo.w, height: furo.h }} />
          )}
          {toque && <span key={etapa} className="bv-toque" style={toque} aria-hidden="true"><i /><i /></span>}
          <button type="button" className="bv-pular bv-pular-passeio" onClick={fechar}>Pular</button>
          <div
            ref={balao}
            className={`bv-balao${posicao ? " is-posicionado" : ""}`}
            style={posicao ? { left: posicao.left, top: posicao.top, width: posicao.largura } : undefined}
          >
            <div key={etapa} className="bv-balao-conteudo">
              <div className="bv-balao-topo">
                <span className="bv-balao-icone"><ManagerIcon name={atual.icone} size={20} /></span>
                <span className="bv-balao-etapa">{atual.numero} de {passeio.length}</span>
              </div>
              <h2 ref={titulo} tabIndex={-1}>{atual.titulo}</h2>
              {atual.texto && <p>{atual.texto}</p>}
              {atual.passos && (
                <ol className="bv-passos">
                  {atual.passos.map((passo, indice) => <li key={passo} style={{ "--i": indice }}>{passo}</li>)}
                </ol>
              )}
            </div>
            <div className="bv-balao-progresso" aria-hidden="true">
              <i style={{ width: `${(atual.numero / passeio.length) * 100}%` }} />
            </div>
            <div className="bv-balao-acoes">
              <button type="button" className="bv-botao bv-botao-secundario" onClick={voltar}>Voltar</button>
              <button type="button" className="bv-botao" onClick={avancar}>Continuar</button>
            </div>
          </div>
        </>
      ) : (
        <div className="bv-painel">
          <div className="bv-fundo" aria-hidden="true"><i /><i /><i /></div>
          <header className="bv-topo">
            <span className="bv-progresso" aria-hidden="true">
              <i style={{ width: `${((etapa + 1) / etapas.length) * 100}%` }} />
            </span>
            {!ultima && <button type="button" className="bv-pular" onClick={fechar}>Pular</button>}
          </header>

          <section key={atual.chave} className={`bv-conteudo ${direcao > 0 ? "is-avanca" : "is-volta"}`}>
            {conteudoDoPainel()}
          </section>

          <footer className={`bv-rodape${etapa === 0 ? " is-centro" : ""}`}>
            {etapa > 0 && (
              <button type="button" className="bv-botao bv-botao-secundario" onClick={voltar}>Voltar</button>
            )}
            <button type="button" className="bv-botao" onClick={avancar}>{rotuloAvancar}</button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
