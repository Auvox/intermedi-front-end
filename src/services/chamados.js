// Rótulos, cores e datas dos chamados, compartilhados por funcionário e gerente.

export const STATUS_CHAMADO = {
  pendente: { label: "Pendente", tone: "yellow" },
  aceito: { label: "Aceito", tone: "blue" },
  em_andamento: { label: "Em andamento", tone: "purple" },
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

export const statusChamado = (status) =>
  STATUS_CHAMADO[status] ?? { label: status || "—", tone: "neutral" };
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
