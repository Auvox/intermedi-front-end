// Rótulos, cores e datas dos chamados, compartilhados por funcionário e gerente.

// Ao aceitar, o chamado vai para "em_andamento" (pedido à rede). "aceito" fica
// só para exibir dados antigos.
export const STATUS_CHAMADO = {
  pendente: { label: "Pendente", tone: "yellow" },
  em_andamento: { label: "Em andamento", tone: "purple" },
  aceito: { label: "Aceito", tone: "blue" },
  resolvido: { label: "Resolvido", tone: "green" },
  recusado: { label: "Recusado", tone: "red" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};

export const PRIORIDADE_CHAMADO = {
  baixa: { label: "Baixa", tone: "neutral" },
  media: { label: "Média", tone: "yellow" },
  alta: { label: "Alta", tone: "red" },
  urgente: { label: "Urgente", tone: "urgent" },
};

export const TURNO_FUNCIONARIO = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  integral: "Integral",
};

// Situação de cada remédio do chamado (null = chamado recusado/cancelado)
export const SITUACAO_ITEM = {
  aguardando_gerente: { label: "Aguardando gerente", tone: "yellow", icone: "clock" },
  aguardando_fornecedor: { label: "Aguardando farmácia fornecedora", tone: "blue", icone: "pharmacy" },
  a_caminho: { label: "A caminho", tone: "purple", icone: "truck" },
  recebido: { label: "Recebido", tone: "green", icone: "check" },
  sem_fornecedor: { label: "Sem fornecedor", tone: "red", icone: "alert" },
};

// Status de um pedido entre farmácias (redistribuição)
export const STATUS_PEDIDO = {
  solicitada: { label: "Aguardando resposta", tone: "yellow" },
  aprovada: { label: "Aprovado", tone: "blue" },
  enviada: { label: "A caminho", tone: "purple" },
  recebida: { label: "Entregue", tone: "green" },
  recusada: { label: "Recusado", tone: "red" },
  cancelada: { label: "Cancelado", tone: "neutral" },
};

export const statusChamado = (status) =>
  STATUS_CHAMADO[status] ?? { label: status || "—", tone: "neutral" };
export const situacaoItem = (situacao) =>
  SITUACAO_ITEM[situacao] ?? { label: "—", tone: "neutral", icone: null };
export const statusPedido = (status) =>
  STATUS_PEDIDO[status] ?? { label: status || "—", tone: "neutral" };

// Enquanto houver remédio a caminho a tela consulta a API a cada 5 s (para
// trocar para "Recebido" sozinha); fora isso, a cada 30 s.
export const INTERVALO_A_CAMINHO = 5000;
export const temACaminho = (chamados = []) =>
  chamados.some((c) => (c.remedios ?? []).some((r) => r.situacao === "a_caminho"));

// Remédios recebidos / total, para a barra de progresso
export function progressoChamado(chamado) {
  const total = chamado.remedios?.length ?? 0;
  const recebidos = (chamado.remedios ?? []).filter((r) => r.situacao === "recebido").length;
  return { recebidos, total };
}

// Entregas entre farmácias: pedido que chegou (status "recebida") nas últimas 24 h
const JANELA_ENTREGAS_MS = 24 * 60 * 60 * 1000;
export function entregaRecente(pedido) {
  const chegada = dataDoChamado(pedido.dataRecebimento);
  return pedido.status === "recebida" && Boolean(chegada) && Date.now() - chegada.getTime() < JANELA_ENTREGAS_MS;
}
export const chaveEntrega = (p) => `${p.tipo}:${p.idRedistribuicao}`;
export const itemEntregue = (p) =>
  `${p.quantidade}× ${[p.nomeRemedio, p.dosagemRemedio].filter(Boolean).join(" ")}`;

// Texto da notificação. tipo "enviados": chegou na minha farmácia;
// "recebidos": eu forneci e o remédio chegou na outra farmácia.
export function textoEntregas(entregas) {
  const chegaram = entregas.filter((p) => p.tipo !== "recebidos");
  const forneci = entregas.filter((p) => p.tipo === "recebidos");
  const partes = [];
  if (chegaram.length) {
    partes.push(`Remédios entregues na sua farmácia: ${chegaram
      .map((p) => `${itemEntregue(p)} (de ${p.nomeFarmaciaOrigem})`).join(", ")}.`);
  }
  if (forneci.length) {
    partes.push(`Entrega concluída: ${forneci
      .map((p) => `${itemEntregue(p)} chegou à ${p.nomeFarmaciaDestino}`).join(", ")}.`);
  }
  return partes.join(" ");
}

// "1:42" a partir de segundos
export function formatarContagem(segundos) {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export const prioridadeChamado = (prioridade) =>
  PRIORIDADE_CHAMADO[prioridade] ?? { label: prioridade || "—", tone: "neutral" };

// O back envia "AAAA-MM-DD HH:MM:SS" em UTC.
export function dataDoChamado(valor) {
  if (!valor) return null;
  const data = new Date(`${String(valor).replace(" ", "T")}Z`);
  return Number.isNaN(data.getTime()) ? null : data;
}

// "28/09/2026 22:10" no horário local (ano: false → "28/09 22:10")
export function formatarDataChamado(valor, { ano = true } = {}) {
  const data = dataDoChamado(valor);
  if (!data) return "—";
  const dia = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", ...(ano && { year: "numeric" }) });
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} ${hora}`;
}

// "agora", "há 5 min", "há 3 h", "há 2 dias"
export function tempoDesde(valor, agora = Date.now()) {
  const data = dataDoChamado(valor);
  if (!data) return "";
  const minutos = Math.max(0, Math.floor((agora - data.getTime()) / 60000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// "Amoxicilina (100), Azitromicina (40)"
export const resumoRemedios = (remedios = []) =>
  remedios.map((r) => `${r.nomeRemedio} (${r.quantidadeSolicitada})`).join(", ");

// "Aceito por Beatriz Rocha em 28/09 22:10" / "Recusado por ... — Motivo: ..."
export function textoResposta(chamado) {
  const { resposta, status } = chamado;
  if (!resposta) return "";
  const acao = status === "recusado" ? "Recusado" : "Aceito";
  const base = `${acao} por ${resposta.nomeGerente || "gerente"} em ${formatarDataChamado(resposta.dataResposta, { ano: false })}`;
  if (!resposta.respostaGerente) return base;
  return status === "recusado"
    ? `${base} — Motivo: ${resposta.respostaGerente}`
    : `${base} — ${resposta.respostaGerente}`;
}
