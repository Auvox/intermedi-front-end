// Dados da narrativa de remanejamento. Tudo é calculado a partir de um caso
// de content.js (faltas reais do estoque de demonstração), então trocar o
// remédio recalcula nomes, quantidades e textos sem números contraditórios.
// O fluxo segue a plataforma: o funcionário abre o chamado, o gerente da
// unidade aceita e pede à rede, o gerente da fornecedora aceita (a
// quantidade sai do estoque dela), a equipe prepara e envia, e quem pediu recebe.
import { farmacias } from "../content";

export const NOMES_ETAPAS = ["Introdução", "Necessidade", "Conexão", "Chamado", "Aprovação", "Preparação", "Entrega", "Conclusão"];

// Status de cada cartão por etapa (null = cartão ainda não apareceu)
const STATUS = {
  solicitante: [null, ["critico", "Abaixo do mínimo"], ["critico", "Abaixo do mínimo"], ["info", "Chamado pendente"], ["info", "Chamado em andamento"], ["info", "Chamado em andamento"], ["info", "Pedido a caminho"], ["ok", "Chamado resolvido"]],
  fornecedora: [null, null, ["ok", "Pode atender"], ["ok", "Pode atender"], ["info", "Aguardando resposta"], ["info", "Em preparo"], ["info", "A caminho"], ["ok", "Entregue"]],
};

export function montarHistoria(caso) {
  const solicitante = {
    ...farmacias[caso.falta.id],
    inicial: caso.falta.tem,
    minimo: caso.falta.minimo,
    final: caso.falta.tem + caso.pede,
  };
  const fornecedora = {
    ...farmacias[caso.envia.id],
    inicial: caso.envia.tem,
    minimo: caso.envia.minimo,
    final: caso.envia.tem - caso.pede,
  };
  const remedio = caso.remedio;
  const quantidade = caso.pede;
  const sobra = fornecedora.inicial - fornecedora.minimo;
  // a mesma escala nas duas barras, para comparar os estoques
  const escala = Math.max(fornecedora.inicial, solicitante.final) * 1.1;

  const textos = [
    {
      micro: "Quando falta um remédio, outra farmácia da rede pode enviar.",
      detalhe: "Role para acompanhar um caso real da base de demonstração, do chamado à entrega.",
    },
    {
      micro: "Uma farmácia precisa repor seu estoque.",
      detalhe: `A ${solicitante.nome} tem ${solicitante.inicial} un. de ${remedio}, abaixo do mínimo de ${solicitante.minimo}.`,
    },
    {
      micro: "Outra unidade da rede possui estoque disponível.",
      detalhe: `A ${fornecedora.nome} tem ${fornecedora.inicial} un., ${sobra} acima do mínimo de ${fornecedora.minimo}.`,
    },
    {
      micro: "Um chamado conecta a necessidade à disponibilidade.",
      detalhe: `Um funcionário da ${solicitante.nome} abre um chamado de reposição de ${quantidade} un. Ele vai primeiro ao gerente da unidade.`,
    },
    {
      micro: "O gerente analisa e autoriza a solicitação.",
      detalhe: `O gerente vê quem tem ${remedio} na rede, aceita e pede à rede: o pedido segue para a ${fornecedora.nome}.`,
    },
    {
      micro: "A farmácia fornecedora prepara o pedido.",
      detalhe: `O gerente da ${fornecedora.nome} aceita e as ${quantidade} un. saem do estoque dela. Na equipe, quem aperta Começar assume o preparo.`,
    },
    {
      micro: "Os medicamentos chegam à farmácia solicitante.",
      detalhe: `As ${quantidade} un. seguem da ${fornecedora.nome} para a ${solicitante.nome}, com horário previsto de chegada.`,
    },
    {
      micro: "Uma rede conectada. Estoques mais equilibrados.",
      detalhe: `${solicitante.nome}: ${solicitante.inicial} → ${solicitante.final} un. ${fornecedora.nome}: ${fornecedora.inicial} → ${fornecedora.final} un. Chamado resolvido.`,
    },
  ];

  const etapas = NOMES_ETAPAS.map((nome, i) => ({
    nome,
    ...textos[i],
    statusSolicitante: STATUS.solicitante[i],
    statusFornecedora: STATUS.fornecedora[i],
  }));

  return { id: caso.id, remedio, quantidade, solicitante, fornecedora, escala, etapas };
}
