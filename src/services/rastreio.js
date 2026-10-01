// Rastreamento das entregas entre farmácias (pedidos de redistribuição).
//
// O back-end só guarda quando o remédio saiu (dataEnvio) e quando chega
// (dataPrevistaChegada). Os marcos da viagem são calculados aqui, como frações
// desse intervalo, e descritos com o bairro/cidade das duas farmácias. Como
// dependem só do relógio, todos (funcionário e os dois gerentes) veem o mesmo
// marco no mesmo instante, sem consultar a API a cada segundo.
import { dataDoChamado } from "./chamados";

// Fração do tempo de viagem em que cada marco acontece
export const MARCOS = [
  { id: "aceito", fracao: 0 },
  { id: "saiu", fracao: 0.12 },
  { id: "transito", fracao: 0.45 },
  { id: "chegando", fracao: 0.8 },
  { id: "entregue", fracao: 1 },
];

// Marcos que viram notificação. O fornecedor não é avisado do próprio aceite;
// o resto da unidade (quem não pediu) só fica sabendo quando chega.
const NOTIFICAVEIS = {
  solicitante: ["aceito", "saiu", "transito", "chegando", "entregue"],
  fornecedor: ["saiu", "transito", "chegando", "entregue"],
  unidade: ["entregue"],
};

const JANELA_NOTIFICACOES_MS = 24 * 60 * 60 * 1000;

const emMs = (valor) => dataDoChamado(valor)?.getTime() ?? null;

export const itemDoPedido = (p) =>
  `${p.quantidade}× ${[p.nomeRemedio, p.dosagemRemedio].filter(Boolean).join(" ")}`;

// { nome, bairro, cidade, uf } das duas pontas; enderecos = { [idFarmacia]: { bairro, cidade, uf } }
function pontas(p, enderecos = {}) {
  const ponta = (id, nome) => ({ id, nome: nome || "farmácia", ...(enderecos[String(id)] ?? {}) });
  return {
    origem: ponta(p.idFarmaciaOrigem, p.nomeFarmaciaOrigem),
    destino: ponta(p.idFarmaciaDestino, p.nomeFarmaciaDestino),
  };
}

// "Guaianases · São Paulo/SP" (o que houver)
export function localDaPonta(ponta) {
  const cidade = [ponta.cidade, ponta.uf].filter(Boolean).join("/");
  return [ponta.bairro, cidade].filter(Boolean).join(" · ");
}

function textoMarco(id, { origem, destino }, p) {
  const outraCidade = origem.cidade && destino.cidade && origem.cidade !== destino.cidade;
  const outroBairro = destino.bairro && origem.bairro !== destino.bairro;
  switch (id) {
    case "aceito":
      return {
        titulo: "Pedido confirmado",
        descricao: `A ${origem.nome} aceitou o pedido${p.nomeGerenteResposta ? ` (${p.nomeGerenteResposta})` : ""} e está separando os remédios.`,
      };
    case "saiu":
      return {
        titulo: "Saiu para entrega",
        descricao: `Os remédios saíram da ${origem.nome}${origem.bairro ? `, em ${origem.bairro}` : ""}.`,
      };
    case "transito":
      return {
        titulo: "Em trânsito",
        descricao: outraCidade
          ? `Os remédios estão na estrada, a caminho de ${destino.cidade}.`
          : outroBairro
            ? `Os remédios estão a caminho de ${destino.bairro}.`
            : `Os remédios estão a caminho da ${destino.nome}.`,
      };
    case "chegando":
      return {
        titulo: destino.bairro ? `Chegou em ${destino.bairro}` : "Chegando",
        descricao: destino.bairro
          ? `Os remédios estão em ${destino.bairro}, quase na ${destino.nome}.`
          : `Os remédios estão quase na ${destino.nome}.`,
      };
    case "entregue":
      return {
        titulo: "Entregue",
        descricao: `Os remédios chegaram à ${destino.nome} e já entraram no estoque.`,
      };
    default:
      return { titulo: id, descricao: "" };
  }
}

// Situação da entrega em `agora` (ms):
// { estado, progresso 0..1, inicio, fim, origem, destino, item, etapas, atual }
// estado: "aguardando" | "a_caminho" | "entregue" | "recusado" | "cancelado"
// etapas: [{ id, titulo, descricao, quando (ms|null), fracao?, situacao: feito|atual|futuro|erro }]
export function montarRastreio(p, enderecos, agora) {
  const { origem, destino } = pontas(p, enderecos);
  const item = itemDoPedido(p);
  const solicitado = emMs(p.dataSolicitacao);
  const inicio = emMs(p.dataEnvio) ?? emMs(p.dataAprovacao);
  const fim = emMs(p.dataRecebimento) ?? emMs(p.dataPrevistaChegada);
  const base = { origem, destino, item, inicio, fim };

  const pedidoFeito = {
    id: "solicitado",
    titulo: "Pedido enviado",
    descricao: `${item} pedido à ${origem.nome}.`,
    quando: solicitado,
    situacao: "feito",
  };

  if (p.status === "recusada" || p.status === "cancelada") {
    const recusado = p.status === "recusada";
    const etapa = {
      id: recusado ? "recusado" : "cancelado",
      titulo: recusado ? "Pedido recusado" : "Pedido cancelado",
      descricao: recusado
        ? `A ${origem.nome} recusou o pedido${p.motivoRecusa ? `: “${p.motivoRecusa}”` : "."}`
        : "O pedido foi cancelado.",
      quando: emMs(p.dataRecusa),
      situacao: "erro",
    };
    return { ...base, estado: recusado ? "recusado" : "cancelado", progresso: 0, etapas: [pedidoFeito, etapa], atual: etapa };
  }

  if (inicio === null || fim === null) {
    // ainda não aceito: os marcos aparecem como próximos passos
    const etapas = [
      { ...pedidoFeito, situacao: "feito" },
      {
        id: "aceito",
        titulo: "Aguardando confirmação",
        descricao: `A ${origem.nome} precisa aceitar o pedido para os remédios saírem.`,
        quando: null,
        situacao: "atual",
      },
      ...MARCOS.slice(1).map((m) => ({ id: m.id, ...textoMarco(m.id, { origem, destino }, p), quando: null, fracao: m.fracao, situacao: "futuro" })),
    ];
    return { ...base, estado: "aguardando", progresso: 0, etapas, atual: etapas[1] };
  }

  const duracao = Math.max(1, fim - inicio);
  const entregue = p.status === "recebida" || agora >= fim;
  const progresso = entregue ? 1 : Math.min(1, Math.max(0, (agora - inicio) / duracao));
  const marcos = MARCOS.map((m) => {
    const quando = m.id === "aceito" ? emMs(p.dataAprovacao) ?? inicio : m.id === "entregue" ? fim : inicio + m.fracao * duracao;
    return { id: m.id, ...textoMarco(m.id, { origem, destino }, p), quando, fracao: m.fracao, feito: entregue || quando <= agora };
  });
  const indiceAtual = marcos.findLastIndex((m) => m.feito);
  const etapas = [
    pedidoFeito,
    ...marcos.map(({ feito, ...m }, i) => ({
      ...m,
      situacao: i === indiceAtual ? "atual" : feito ? "feito" : "futuro",
    })),
  ];
  return {
    ...base,
    estado: entregue ? "entregue" : "a_caminho",
    progresso,
    etapas,
    atual: etapas.find((e) => e.situacao === "atual") ?? etapas[0],
  };
}

// Instantes (ms) dos próximos marcos ainda não alcançados, para acordar a tela na hora certa
export function proximosMarcos(pedidos, agora) {
  return pedidos.flatMap((p) => {
    const inicio = emMs(p.dataEnvio) ?? emMs(p.dataAprovacao);
    const fim = emMs(p.dataRecebimento) ?? emMs(p.dataPrevistaChegada);
    if (!["enviada", "recebida"].includes(p.status) || inicio === null || fim === null) return [];
    return MARCOS.map((m) => inicio + m.fracao * (fim - inicio)).filter((t) => t > agora);
  });
}

// Notificações já alcançadas (mais novas primeiro), nas últimas 24 h.
// Cada pedido traz `perspectiva`: solicitante | fornecedor | unidade.
export function eventosRastreio(pedidos, enderecos, agora) {
  return pedidos
    .flatMap((p) => {
      if (!["enviada", "recebida"].includes(p.status)) return [];
      const rastreio = montarRastreio(p, enderecos, agora);
      const permitidos = NOTIFICAVEIS[p.perspectiva] ?? NOTIFICAVEIS.solicitante;
      return rastreio.etapas
        .filter((e) => permitidos.includes(e.id) && e.situacao !== "futuro" && e.quando !== null)
        .filter((e) => e.quando <= agora && agora - e.quando < JANELA_NOTIFICACOES_MS)
        .map((e) => ({
          chave: `${p.idRedistribuicao}:${e.id}`,
          marco: e.id,
          titulo: e.titulo,
          descricao: e.descricao,
          quando: e.quando,
          item: rastreio.item,
          perspectiva: p.perspectiva,
          pedido: p,
        }));
    })
    .sort((a, b) => b.quando - a.quando);
}

// Texto do aviso (toast) para um ou mais eventos novos
export function textoEventos(eventos) {
  if (!eventos.length) return "";
  const [primeiro] = eventos;
  const frase = `${primeiro.titulo} · ${primeiro.item}. ${primeiro.descricao}`;
  return eventos.length === 1 ? frase : `${frase} (+${eventos.length - 1} ${eventos.length === 2 ? "atualização" : "atualizações"} de entrega)`;
}

// Pedido em andamento (aparece na faixa da tela principal)
export const emAndamento = (p) =>
  p.status === "solicitada" || p.status === "aprovada" || p.status === "enviada";

// Último pedido de cada remédio do chamado que ainda conta (sem os recusados/repassados)
export function pedidosDoChamadoParaRastrear(chamado) {
  const porId = new Map((chamado.pedidos ?? []).map((p) => [p.idRedistribuicao, p]));
  return (chamado.remedios ?? [])
    .map((r) => porId.get(r.pedidoAtual?.idRedistribuicao))
    .filter((p) => p && !["recusada", "cancelada"].includes(p.status));
}

// "1:42" (menos de 1 h), "hoje às 22:55", "amanhã às 10:00" ou "05/10 às 10:00"
export function textoChegada(alvoMs, agora) {
  const segundos = Math.max(0, Math.ceil((alvoMs - agora) / 1000));
  if (segundos < 3600) return { curto: true, texto: `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`, segundos };
  return { curto: false, texto: diaEHora(alvoMs, agora), segundos };
}

// "hoje às 22:55", "amanhã às 10:00", "ontem às 08:10" ou "05/10 às 10:00"
export function diaEHora(ms, agora) {
  const data = new Date(ms);
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dia = (d) => new Date(d).toDateString();
  if (dia(ms) === dia(agora)) return `hoje às ${hora}`;
  if (dia(ms) === dia(agora + 86400000)) return `amanhã às ${hora}`;
  if (dia(ms) === dia(agora - 86400000)) return `ontem às ${hora}`;
  return `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${hora}`;
}

// Horário de uma etapa: com segundos quando a viagem inteira dura menos de 1 h
// (no ambiente de demonstração a entrega leva ~2 min)
export function horarioEtapa(ms, agora, { segundos = false } = {}) {
  if (ms === null || ms === undefined) return "";
  const data = new Date(ms);
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", ...(segundos && { second: "2-digit" }) });
  const dia = new Date(ms).toDateString() === new Date(agora).toDateString()
    ? "hoje"
    : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  return `${dia}, ${hora}`;
}

// "agora", "há 5 min", "há 3 h" a partir de milissegundos
export function haQuanto(ms, agora) {
  const minutos = Math.max(0, Math.floor((agora - ms) / 60000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return horas < 24 ? `há ${horas} h` : `há ${Math.floor(horas / 24)} d`;
}
