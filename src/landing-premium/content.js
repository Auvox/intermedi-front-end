// Textos e dados da landing premium. Tudo vem do próprio Intermedi:
// etapas de services/relatorio.js (etapasDoProcesso), status de
// services/chamados.js, regras de preparo do MANAGER.md e os números da base
// de demonstração do back-end (database/seed.sql): farmácias, estoques,
// funcionários e o chamado CH-2026-000001.

// Capítulos: cada seção tem o seu fundo. A barra e as pastas usam as mesmas cores.
export const capitulos = [
  { id: "problema", nome: "O problema", fundo: "gray" },
  { id: "solucao", nome: "A solução", fundo: "green" },
  { id: "como-funciona", nome: "Como funciona", fundo: "mint" },
  { id: "recursos", nome: "Recursos", fundo: "graphite" },
  { id: "plataforma", nome: "Plataforma", fundo: "paper" },
];

// As cinco etapas do relatório de cada chamado (etapasDoProcesso)
export const etapas = [
  {
    id: "aberto",
    nome: "Aberto",
    papel: "funcionario",
    quem: "Funcionário",
    status: "Pendente",
    tom: "yellow",
    texto: "O funcionário abre um chamado de reposição: escolhe os remédios, a quantidade de cada um e a prioridade, de baixa a urgente.",
  },
  {
    id: "gerente",
    nome: "Aguardando o gerente",
    papel: "gerente",
    quem: "Gerente da unidade",
    status: "Em andamento",
    tom: "green",
    texto: "O gerente vê, para cada remédio, quais farmácias da rede podem atender. Aceita e pede à rede, ou recusa com o motivo por escrito.",
  },
  {
    id: "rede",
    nome: "Pedido à rede",
    papel: "gerente",
    quem: "Gerente da farmácia fornecedora",
    status: "Aguardando preparo",
    tom: "blue",
    texto: "Cada remédio vai para uma farmácia fornecedora. O gerente dela aceita o pedido, e a quantidade sai do estoque dela na hora.",
  },
  {
    id: "transito",
    nome: "Em trânsito",
    papel: "funcionario",
    quem: "Equipe da fornecedora",
    status: "A caminho",
    tom: "blue",
    texto: "Toda a equipe recebe o aviso de preparo, e quem aperta Começar primeiro assume. Pronto o preparo, o envio sai com horário previsto de chegada.",
  },
  {
    id: "resolvido",
    nome: "Resolvido",
    papel: "gerente",
    quem: "Quem pediu",
    status: "Resolvido",
    tom: "green",
    texto: "Quando todos os remédios chegam, o chamado se encerra. O relatório guarda cada etapa com data, hora e responsável.",
  },
];

// Cada recurso tem a cor e o ícone da plataforma onde ele vive
export const papeis = {
  funcionario: { nome: "Funcionário", cor: "blue" },
  gerente: { nome: "Gerente", cor: "green" },
  admin: { nome: "Admin", cor: "graphite" },
};

export const recursos = [
  { palavra: "Pedir", nome: "Chamados", papel: "funcionario", texto: "Peça a reposição do que faltou, com quantidade e prioridade." },
  { palavra: "Rede", nome: "Disponibilidade", papel: "gerente", texto: "Antes de aceitar, veja quais farmácias têm cada remédio." },
  { palavra: "Envio", nome: "Pedidos da rede", papel: "gerente", texto: "Aceite um pedido e o remédio sai do seu estoque." },
  { palavra: "50", unidade: "un.", nome: "Preparo", papel: "funcionario", texto: "Caixas de 50 unidades. Quem aperta Começar assume." },
  { palavra: "3D", nome: "Operação 3D", papel: "gerente", texto: "Estoque, equipe, balcões e doca da unidade em 3D." },
  { palavra: "Calor", nome: "Desempenho", papel: "admin", texto: "Mapa de calor, rotas, saúde do sistema e alertas." },
];

// Telas da demonstração: recriadas em HTML a partir da plataforma
export const telas = [
  { id: "painel", nome: "Painel do gerente", papel: "gerente", titulo: "Tudo o que precisa de você, numa tela.", frase: "Chamados pendentes, pedidos da rede e o estoque que pede atenção." },
  { id: "relatorio", nome: "Relatório do chamado", papel: "gerente", titulo: "Cada chamado tem a sua história.", frase: "Quem pediu, quem respondeu e em que etapa ele está, com data e hora." },
  { id: "solicitar", nome: "Solicitar reposição", papel: "funcionario", titulo: "Faltou? Peça na hora.", frase: "O funcionário escolhe o remédio, a quantidade e a prioridade." },
  { id: "operacao", nome: "Operação 3D", papel: "gerente", titulo: "A unidade inteira, em 3D.", frase: "Gôndolas, equipe, balcões e doca com os mesmos dados das outras telas." },
  { id: "desempenho", nome: "Desempenho", papel: "admin", titulo: "A rede inteira sob controle.", frase: "Uso, erros, tempo de resposta e alertas para o administrador." },
];

export const parceiros = [
  { nome: "SUS", url: "https://www.gov.br/saude/pt-br/sus" },
  { nome: "Farmácia Popular", url: "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular" },
];

export const creditoFoto = "Foto: “Hospital Pharmacy”, de Mattes, domínio público, via Wikimedia Commons.";
