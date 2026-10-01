// Relatório do chamado: protocolo, etapas do processo e formatações de data,
// usados no relatório e na lista de chamados.
import { dataDoChamado, formatarDataChamado } from "./chamados";

// "CH-2026-000008": número do chamado com o ano de abertura (só exibição)
export const protocoloDoChamado = (c) =>
  `CH-${dataDoChamado(c.dataAbertura)?.getFullYear() ?? "0000"}-${String(c.idChamado).padStart(6, "0")}`;

export const ms = (valor) => dataDoChamado(valor)?.getTime() ?? null;
export const hora = (valor) => (valor ? formatarDataChamado(valor).slice(11) : "");
export const comSegundos = (valor) => {
  const data = dataDoChamado(valor);
  if (!data) return "—";
  return `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${data.toLocaleTimeString("pt-BR")}`;
};
export const item = (p) => `${[p.nomeRemedio, p.dosagemRemedio].filter(Boolean).join(" ")} · ${p.quantidade} un.`;
export const encerrado = (status) => ["recusado", "cancelado"].includes(status);

// Duração legível entre duas datas ("1 min", "2 h 5 min", "3 dias")
export function duracao(de, ate) {
  const minutos = Math.max(0, Math.round((ms(ate) - ms(de)) / 60000));
  if (minutos < 1) return "menos de 1 min";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h${minutos % 60 ? ` ${minutos % 60} min` : ""}`;
  const dias = Math.floor(horas / 24);
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// Etapas do processo: aberto → resposta → pedido à rede → trânsito → resolvido
export function etapasDoProcesso(c) {
  const pedidos = c.pedidos ?? [];
  const remedios = c.remedios ?? [];
  const primeiroPedido = pedidos.map((p) => p.dataSolicitacao).filter(Boolean).sort()[0];
  const ultimaChegada = pedidos.map((p) => p.dataRecebimento).filter(Boolean).sort().at(-1);
  const previsao = pedidos.filter((p) => p.status === "enviada").map((p) => p.dataPrevistaChegada).sort().at(-1);
  const etapas = [{ id: "aberto", titulo: "Aberto", quando: hora(c.dataAbertura), situacao: "feito" }];
  if (encerrado(c.status)) {
    etapas.push({
      id: "recusado",
      titulo: c.status === "recusado" ? "Recusado pelo gerente" : "Cancelado",
      quando: hora(c.resposta?.dataResposta),
      situacao: "erro",
    });
    return etapas;
  }
  const respondido = Boolean(c.resposta);
  const todosChegaram = remedios.length > 0 && remedios.every((r) => r.situacao === "recebido");
  const algoAndando = remedios.some((r) => ["a_caminho", "aguardando_fornecedor"].includes(r.situacao));
  const algumChegou = remedios.some((r) => r.situacao === "recebido");
  // parte chegou e o resto ficou sem farmácia: o chamado espera uma nova tentativa
  const travado = !algoAndando && remedios.some((r) => r.situacao === "sem_fornecedor") && c.status !== "resolvido";
  etapas.push(
    { id: "aceito", titulo: respondido ? "Aceito pelo gerente" : "Aguardando o gerente", quando: respondido ? hora(c.resposta.dataResposta) : "", situacao: respondido ? "feito" : "atual" },
    { id: "rede", titulo: "Pedido à rede", quando: hora(primeiroPedido), situacao: primeiroPedido ? "feito" : "futuro" },
    {
      id: "transito",
      titulo: algumChegou && !todosChegaram && !algoAndando ? "Entregas parciais" : "Em trânsito",
      quando: algumChegou && !algoAndando ? hora(ultimaChegada) : previsao ? `previsto ${hora(previsao)}` : "",
      situacao: todosChegaram || (algumChegou && !algoAndando) ? "feito" : algoAndando && primeiroPedido ? "atual" : "futuro",
    },
    travado
      ? { id: "resolvido", titulo: "Sem fornecedor para um item", quando: "pedir de novo à rede", situacao: "erro" }
      : { id: "resolvido", titulo: "Resolvido", quando: c.status === "resolvido" ? hora(ultimaChegada) : "", situacao: c.status === "resolvido" ? "feito" : "futuro" },
  );
  return etapas;
}


// "SRV-2026-000001": número do serviço com o ano do atendimento (só exibição)
export const numeroDoServico = (s) =>
  `SRV-${dataDoChamado(s.dataServico)?.getFullYear() ?? "0000"}-${String(s.idServico).padStart(6, "0")}`;
