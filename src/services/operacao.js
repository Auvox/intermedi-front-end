// Operação 3D: transforma os dados que a API já entrega (estoque, equipe,
// chamados e pedidos da rede) no "retrato" da unidade usado pela cena 3D e pela
// versão 2D. Só funções puras: nada aqui busca dados nem desenha.
//
// O que é DERIVADO no front (não existe no banco):
//   - corredor/posição de cada remédio (corredor = categoria principal);
//   - "no turno agora" (faixa de horário de cada turno, abaixo);
//   - alerta de validade (até VALIDADE_ALERTA_DIAS dias);
//   - indicador geral da operação (fórmula em indicadorOperacao).
// O que é MOCK (dado ilustrativo, marcado na tela):
//   - status ao vivo do funcionário (em atendimento, disponível, em pausa).
//     Integração real: um endpoint de presença/ponto, que ainda não existe.
import { protocoloDoChamado } from "./relatorio";
import { dataDoChamado } from "./chamados";
import { nomeComDosagem } from "./remedios";
import { turno as rotuloTurno } from "./perfil";

export const VALIDADE_ALERTA_DIAS = 90;
const DIA_MS = 86400000;

// Situação mostrada na cena, da mais grave para a mais leve
export const SITUACAO_VISUAL = {
  vencido: { label: "Lote vencido", tone: "red", ordem: 0 },
  zerado: { label: "Zerado", tone: "red", ordem: 1 },
  critico: { label: "Crítico", tone: "orange", ordem: 2 },
  vencendo: { label: `Vence em até ${VALIDADE_ALERTA_DIAS} dias`, tone: "yellow", ordem: 3 },
  ok: { label: "Em estoque", tone: "green", ordem: 4 },
};

export const STATUS_FUNCIONARIO = {
  atendimento: { label: "Em atendimento", tone: "blue" },
  reposicao: { label: "Repondo estoque", tone: "blue" },
  disponivel: { label: "Disponível", tone: "green" },
  pausa: { label: "Em pausa", tone: "yellow" },
  fora: { label: "Fora do turno", tone: "neutral" },
  // real (vem do pedido): assumiu o preparo de um envio para outra farmácia
  carregando: { label: "Carregando o caminhão", tone: "blue" },
};

// Balcões de atendimento desenhados na unidade (layout fixo da cena)
export const TOTAL_BALCOES = 3;

// "2026-12-31" → dias até o fim desse dia (negativo = já venceu). null sem validade.
export function diasAteVencer(validade, agora) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(validade || "");
  if (!m) return null;
  const fim = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59).getTime();
  return Math.floor((fim - agora) / DIA_MS);
}

// Texto curto do alerta de cada situação (vazio quando está tudo certo)
export function textoAlerta(situacao, item) {
  if (situacao === "vencido") return "Lote vencido: não pode ser entregue";
  if (situacao === "zerado") return "Sem unidades no estoque";
  if (situacao === "critico") return `Abaixo do mínimo (${item.quantidade} de ${item.minimo})`;
  if (situacao === "vencendo") return `Vence em ${item.diasParaVencer} ${item.diasParaVencer === 1 ? "dia" : "dias"}`;
  return "";
}

export function situacaoVisual(item, dias) {
  if (item.vencido) return "vencido";
  if (Number(item.quantidade) === 0) return "zerado";
  if (item.situacao === "critico" || Number(item.quantidade) <= Number(item.estoqueMinimo)) return "critico";
  if (dias !== null && dias <= VALIDADE_ALERTA_DIAS) return "vencendo";
  return "ok";
}

// "Febre, Dor de cabeça" → ["Dor de cabeça", "Febre"]; a primeira é a principal
export function listaCategorias(texto) {
  return String(texto || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}
export const SEM_CATEGORIA = "Sem categoria";

// Caixas desenhadas no vão: cheio (8) com o dobro do mínimo ou mais
export const CAPACIDADE_VAO = 8;
export function caixasNoVao(quantidade, minimo) {
  const qtd = Number(quantidade) || 0;
  const min = Number(minimo) || 0;
  if (qtd <= 0) return 0;
  if (min <= 0) return CAPACIDADE_VAO;
  return Math.max(1, Math.min(CAPACIDADE_VAO, Math.round((qtd / (min * 2)) * CAPACIDADE_VAO)));
}

// Faixa de horário de cada turno, só para a visualização (o cadastro guarda
// apenas o nome do turno). [início, fim) em horas; noite atravessa a meia-noite.
const HORARIO_TURNO = { manha: [7, 13], tarde: [13, 19], noite: [19, 7], integral: [8, 18] };
export function estaNoTurno(turno, agora) {
  const faixa = HORARIO_TURNO[turno];
  if (!faixa) return true; // turno não informado: mostra como presente
  const hora = new Date(agora).getHours() + new Date(agora).getMinutes() / 60;
  const [ini, fim] = faixa;
  return ini < fim ? hora >= ini && hora < fim : hora >= ini || hora < fim;
}

// Função do cargo na unidade: define onde a pessoa aparece na cena
export function funcaoDoCargo(cargo) {
  const c = String(cargo || "").toLowerCase();
  if (c.includes("farmac")) return "farmaceutico";
  if (c.includes("estoq") || c.includes("almox") || c.includes("repos")) return "estoque";
  return "balcao"; // atendente, caixa, balconista e demais
}

// MOCK: status ao vivo. Determinístico por pessoa e janela de 20 min, para não
// "piscar" a cada atualização. Substituir por dado real quando houver presença.
function sorteio(semente) {
  let h = 2166136261;
  for (const ch of String(semente)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
export function statusFuncionario(funcionario, funcao, agora) {
  if (!estaNoTurno(funcionario.turnoFuncionario, agora)) return { id: "fora", ilustrativo: false };
  const r = sorteio(`${funcionario.idFuncionario}:${Math.floor(agora / (20 * 60000))}`);
  const ocupado = funcao === "estoque" ? "reposicao" : "atendimento";
  return { id: r < 0.55 ? ocupado : r < 0.9 ? "disponivel" : "pausa", ilustrativo: true };
}

// Pedido da rede ainda em curso (ida ou volta). Os demais ficam só no histórico.
const STATUS_EM_CURSO = ["solicitada", "aprovada", "preparando", "enviada"];

// Fração da viagem (0–1) ou null se o caminhão ainda não saiu. "enviada" já
// está na estrada (mesmo que o relógio da tela esteja alguns segundos atrás).
// Em "preparando" a saída tem hora marcada (fim do preparo): passou dela, está
// na estrada, mesmo antes de o back-end trocar o status para "enviada".
export function progressoEntrega(p, agora) {
  const ini = dataDoChamado(p.dataEnvio)?.getTime();
  const fim = dataDoChamado(p.dataPrevistaChegada)?.getTime();
  if (!["preparando", "enviada"].includes(p.status) || !ini || !fim || fim <= ini) return null;
  if (p.status === "preparando" && agora < ini) return null;
  return Math.min(1, Math.max(0, (agora - ini) / (fim - ini)));
}

// Indicador geral (0–100), calculado no painel e explicado na tela:
//   40% estoque saudável  · itens sem falta, sem nível crítico e sem lote vencido
//   20% validade          · 1 − (vencidos + metade dos que vencem em até 90 dias) / total
//   25% chamados          · 1 − pendentes ponderados / 5 (alta e urgente valem 2)
//   15% equipe            · alguém no turno agora = 100%, ninguém = 40%
export function indicadorOperacao({ itens, chamadosPendentes, noTurno }) {
  const total = itens.length;
  const ok = itens.filter((i) => i.situacao === "ok" || i.situacao === "vencendo").length;
  const vencidos = itens.filter((i) => i.vencido).length;
  const vencendo = itens.filter((i) => i.situacao === "vencendo").length;
  const pesoChamados = chamadosPendentes.reduce(
    (soma, c) => soma + (c.prioridade === "alta" || c.prioridade === "urgente" ? 2 : 1), 0);
  const partes = [
    { id: "estoque", label: "Estoque saudável", peso: 40, valor: total ? ok / total : 1 },
    { id: "validade", label: "Validade", peso: 20, valor: total ? Math.max(0, 1 - (vencidos + vencendo / 2) / total) : 1 },
    { id: "chamados", label: "Chamados em dia", peso: 25, valor: Math.max(0, 1 - pesoChamados / 5) },
    { id: "equipe", label: "Equipe no turno", peso: 15, valor: noTurno > 0 ? 1 : 0.4 },
  ];
  const valor = Math.round(partes.reduce((soma, p) => soma + p.valor * p.peso, 0));
  const faixa = valor >= 85
    ? { label: "Estável", tone: "green" }
    : valor >= 65 ? { label: "Atenção", tone: "yellow" } : { label: "Crítica", tone: "red" };
  return { valor, ...faixa, partes };
}

// ---------------------------------------------------------------------
//  Retrato da unidade
// ---------------------------------------------------------------------
// estoque: itens de GET /gerente/:id/estoque · catalogo: remédios de GET /remedios
// resumo: GET /gerente/:id/resumo · chamados: GET /gerente/:id/chamados
// pendentes: { totalPendentes, pendentes } · pedidos: pedidos da rede com `perspectiva`
export function montarOperacao({ estoque = [], catalogo = [], resumo = null, chamados = [], pendentes, pedidos = [], gerente, agora }) {
  const categoriasPorRemedio = new Map(
    catalogo.map((r) => [String(r.idRemedio), listaCategorias(r.categorias)]),
  );

  // Remédios
  const itens = estoque.map((e) => {
    const dias = diasAteVencer(e.validade, agora);
    const categorias = categoriasPorRemedio.get(String(e.idRemedio)) ?? [];
    const item = {
      key: `remedio:${e.idRemedio}`,
      idRemedio: String(e.idRemedio),
      nome: e.nomeRemedio,
      nomeCompleto: nomeComDosagem(e),
      dosagem: e.dosagemRemedio,
      apresentacao: e.apresentacaoRemedio,
      fabricante: e.fabricanteRemedio,
      tarja: e.tarjaRemedio,
      foto: e.fotoRemedio,
      quantidade: Number(e.quantidade) || 0,
      minimo: Number(e.estoqueMinimo) || 0,
      lote: e.lote || null,
      validade: e.validade || null,
      vencido: Boolean(e.vencido),
      diasParaVencer: dias,
      situacao: situacaoVisual(e, dias),
      categorias,
      categoria: categorias[0] ?? SEM_CATEGORIA,
      caixas: caixasNoVao(e.quantidade, e.estoqueMinimo),
    };
    item.alertaTexto = textoAlerta(item.situacao, item);
    return item;
  });

  // Corredores: um por categoria principal, numerados em ordem alfabética
  const porCategoria = new Map();
  itens.forEach((item) => {
    if (!porCategoria.has(item.categoria)) porCategoria.set(item.categoria, []);
    porCategoria.get(item.categoria).push(item);
  });
  const corredores = [...porCategoria.keys()]
    .sort((a, b) => (a === SEM_CATEGORIA) - (b === SEM_CATEGORIA) || a.localeCompare(b, "pt-BR"))
    .map((categoria, i) => {
      const numero = i + 1;
      const doCorredor = porCategoria.get(categoria).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      doCorredor.forEach((item, j) => {
        item.corredor = numero;
        item.vao = j + 1;
        item.localizacao = `Corredor ${String(numero).padStart(2, "0")} · ${categoria} · vão ${j + 1}`;
      });
      return { key: `corredor:${numero}`, numero, categoria, itens: doCorredor };
    });

  // Chamados pendentes (os mesmos do sino e do menu)
  const listaPendentes = (pendentes?.pendentes ?? []).map((c) => ({
    key: `chamado:${c.idChamado}`,
    idChamado: String(c.idChamado),
    protocolo: protocoloDoChamado(c),
    titulo: c.titulo,
    descricao: c.descricao,
    prioridade: c.prioridade,
    status: c.status,
    dataAbertura: c.dataAbertura,
    idFuncionario: c.funcionario?.idFuncionario != null ? String(c.funcionario.idFuncionario) : null,
    nomeFuncionario: c.funcionario?.nomeFuncionario ?? "Funcionário",
    remedios: (c.remedios ?? []).map((r) => ({
      idRemedio: String(r.idRemedio),
      nome: r.nomeRemedio,
      quantidade: r.quantidadeSolicitada ?? r.quantidade,
    })),
  }));

  // Equipe: dados reais do resumo; posto e status derivados/ilustrativos.
  // Quem assumiu o preparo de um envio está na doca carregando (status real).
  const preparadores = new Set(pedidos
    .filter((p) => p.perspectiva === "fornecedor" && p.status === "preparando" && p.idFuncionarioPreparo != null &&
      progressoEntrega(p, agora) === null)
    .map((p) => String(p.idFuncionarioPreparo)));
  let proximoBalcao = 1;
  const funcionarios = (resumo?.equipe?.lista ?? []).map((f) => {
    const funcao = funcaoDoCargo(f.cargoFuncionario);
    const status = preparadores.has(String(f.idFuncionario))
      ? { id: "carregando", ilustrativo: false }
      : statusFuncionario(f, funcao, agora);
    let posto;
    if (status.id === "carregando") posto = { tipo: "doca" };
    else if (status.id === "fora") posto = { tipo: "equipe" };
    else if (funcao === "farmaceutico") posto = { tipo: "orientacao" };
    else if (funcao === "estoque") posto = { tipo: "estoque" };
    else if (proximoBalcao <= TOTAL_BALCOES) posto = { tipo: "balcao", numero: proximoBalcao++ };
    else posto = { tipo: "apoio" };
    const id = String(f.idFuncionario);
    return {
      key: `funcionario:${id}`,
      idFuncionario: id,
      nome: f.nomeFuncionario,
      primeiroNome: String(f.nomeFuncionario || "").split(" ")[0],
      cargo: f.cargoFuncionario || "Funcionário",
      turno: f.turnoFuncionario,
      turnoLabel: rotuloTurno(f.turnoFuncionario),
      foto: f.fotoFuncionario,
      matricula: f.matriculaFuncionario,
      servicos: f.servicos ?? 0,
      chamados: f.chamados ?? 0,
      funcao,
      posto,
      noTurno: status.id !== "fora",
      status: { ...STATUS_FUNCIONARIO[status.id], id: status.id, ilustrativo: status.ilustrativo },
      chamadosPendentes: listaPendentes.filter((c) => c.idFuncionario === id).map((c) => c.key),
    };
  });

  const balcoes = Array.from({ length: TOTAL_BALCOES }, (_, i) => ({
    key: `balcao:${i + 1}`,
    numero: i + 1,
    nome: `Balcão ${i + 1}`,
    funcionario: funcionarios.find((f) => f.posto.tipo === "balcao" && f.posto.numero === i + 1)?.key ?? null,
  }));
  balcoes.push({
    key: "balcao:orientacao",
    numero: null,
    nome: "Orientação farmacêutica",
    funcionario: funcionarios.find((f) => f.posto.tipo === "orientacao")?.key ?? null,
  });

  // Entregas entre farmácias ainda em curso
  const entregas = pedidos
    .filter((p) => STATUS_EM_CURSO.includes(p.status))
    .map((p) => ({
      key: `entrega:${p.idRedistribuicao}`,
      idRedistribuicao: String(p.idRedistribuicao),
      sentido: p.perspectiva === "fornecedor" ? "saida" : "entrada",
      status: p.status,
      idChamado: p.idChamado,
      nomeRemedio: [p.nomeRemedio, p.dosagemRemedio].filter(Boolean).join(" "),
      quantidade: p.quantidade,
      outraFarmacia: p.perspectiva === "fornecedor" ? p.nomeFarmaciaDestino : p.nomeFarmaciaOrigem,
      idRemedio: String(p.idRemedio),
      dataAprovacao: p.dataAprovacao,
      dataEnvio: p.dataEnvio,
      dataPrevistaChegada: p.dataPrevistaChegada,
      progresso: progressoEntrega(p, agora),
      // preparo na farmácia fornecedora (caixas levadas até o caminhão)
      dataInicioPreparo: p.dataInicioPreparo ?? null,
      idFuncionarioPreparo: p.idFuncionarioPreparo != null ? String(p.idFuncionarioPreparo) : null,
      nomeFuncionarioPreparo: p.nomeFuncionarioPreparo ?? null,
      caixas: p.caixas ?? null,
      unidadesPorCaixa: p.unidadesPorCaixa ?? null,
      segundosPorViagem: p.segundosPorViagem ?? null,
      // a farmácia do gerente precisa responder (é a fornecedora)
      aguardandoVoce: p.perspectiva === "fornecedor" && p.status === "solicitada",
      // aceito pela farmácia do gerente: aguardando alguém da equipe começar
      aguardandoEquipe: p.perspectiva === "fornecedor" && p.status === "aprovada",
    }));

  // Alertas, do mais grave para o mais leve
  const alertas = [];
  itens.forEach((item) => {
    if (item.situacao === "ok") return;
    alertas.push({
      key: `alerta:${item.key}`,
      alvo: item.key,
      tipo: item.situacao === "vencendo" || item.situacao === "vencido" ? "validade" : "estoque",
      nivel: ["vencido", "zerado"].includes(item.situacao) || (item.situacao === "vencendo" && item.diasParaVencer <= 30) ? "alto" : "medio",
      titulo: item.nomeCompleto,
      detalhe: item.alertaTexto,
      situacao: item.situacao,
    });
  });
  listaPendentes.forEach((c) => alertas.push({
    key: `alerta:${c.key}`,
    alvo: c.key,
    tipo: "chamado",
    nivel: c.prioridade === "alta" || c.prioridade === "urgente" ? "alto" : "medio",
    titulo: `Chamado ${c.protocolo}`,
    detalhe: `${c.titulo} · ${c.nomeFuncionario}`,
  }));
  entregas.filter((e) => e.aguardandoEquipe).forEach((e) => alertas.push({
    key: `alerta:${e.key}`,
    alvo: e.key,
    tipo: "pedido",
    nivel: "medio",
    titulo: "Pedido aceito aguardando o preparo",
    detalhe: `${e.quantidade}× ${e.nomeRemedio} para ${e.outraFarmacia} · a equipe recebeu o aviso`,
  }));
  entregas.filter((e) => e.aguardandoVoce).forEach((e) => alertas.push({
    key: `alerta:${e.key}`,
    alvo: e.key,
    tipo: "pedido",
    nivel: "medio",
    titulo: "Pedido da rede aguardando você",
    detalhe: `${e.quantidade}× ${e.nomeRemedio} para ${e.outraFarmacia}`,
  }));
  alertas.sort((a, b) => (a.nivel === "alto" ? 0 : 1) - (b.nivel === "alto" ? 0 : 1));

  // Indicadores
  const noTurno = funcionarios.filter((f) => f.noTurno).length;
  const conta = (s) => itens.filter((i) => i.situacao === s).length;
  const chamadosAndamento = chamados.filter((c) => ["aceito", "em_andamento"].includes(c.status)).length;
  const desde30 = agora - 30 * DIA_MS;
  const recebidos30 = pedidos.filter((p) =>
    p.perspectiva === "solicitante" && p.status === "recebida" &&
    (dataDoChamado(p.dataRecebimento)?.getTime() ?? 0) >= desde30).length;

  return {
    farmacia: {
      id: resumo?.farmacia?.idFarmacia ?? gerente?.idFarmacia ?? null,
      nome: resumo?.farmacia?.nomeFarmacia ?? null,
    },
    gerente: gerente?.idGerente
      ? { key: `gerente:${gerente.idGerente}`, idGerente: String(gerente.idGerente), nome: gerente.nome || "Gerente" }
      : null,
    itens,
    corredores,
    funcionarios,
    balcoes,
    chamadosPendentes: listaPendentes,
    entregas,
    alertas,
    servicos: resumo?.servicosDaFarmacia ?? null,
    kpis: {
      estoque: {
        itens: itens.length,
        unidades: itens.reduce((soma, i) => soma + i.quantidade, 0),
        criticos: conta("critico"),
        zerados: conta("zerado"),
      },
      equipe: { total: funcionarios.length, noTurno },
      chamados: {
        pendentes: pendentes?.totalPendentes ?? listaPendentes.length,
        prioritarios: listaPendentes.filter((c) => c.prioridade === "alta" || c.prioridade === "urgente").length,
        emAndamento: chamadosAndamento,
      },
      validade: {
        vencidos: itens.filter((i) => i.vencido).length,
        vencendo: conta("vencendo"),
      },
    },
    indicador: indicadorOperacao({ itens, chamadosPendentes: listaPendentes, noTurno }),
    fluxo: {
      pendentes: pendentes?.totalPendentes ?? listaPendentes.length,
      emAndamento: chamadosAndamento,
      aCaminho: entregas.filter((e) => e.sentido === "entrada" && e.progresso !== null).length,
      aguardandoFornecedor: entregas.filter((e) => e.sentido === "entrada" && e.progresso === null).length,
      recebidos30,
    },
  };
}

// Procura o objeto selecionado ({ tipo, id } → item da operação)
export function objetoSelecionado(operacao, chave) {
  if (!operacao || !chave) return null;
  const [tipo] = chave.split(":");
  const listas = {
    remedio: operacao.itens,
    corredor: operacao.corredores,
    funcionario: operacao.funcionarios,
    chamado: operacao.chamadosPendentes,
    entrega: operacao.entregas,
    balcao: operacao.balcoes,
  };
  if (tipo === "gerente") return operacao.gerente?.key === chave ? operacao.gerente : null;
  if (["operacao", "chamados", "alertas"].includes(tipo)) return { key: chave };
  return listas[tipo]?.find((o) => o.key === chave) ?? null;
}
