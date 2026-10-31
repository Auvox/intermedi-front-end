// Textos e dados da landing premium. Tudo aqui vem do próprio Intermedi:
// etapas de services/relatorio.js (etapasDoProcesso), status de
// services/chamados.js, regras de preparo do MANAGER.md e telas capturadas
// da plataforma. Nada de números de negócio inventados.
import telaGerente from "./assets/screens/gerente.jpg";
import telaRelatorio from "./assets/screens/gerente-chamado-detalhe.jpg";
import telaSolicitar from "./assets/screens/funcionario-solicitar.jpg";
import telaPedidos from "./assets/screens/gerente-pedidos.jpg";
import telaChamados from "./assets/screens/gerente-chamados.jpg";
import telaOperacao from "./assets/screens/gerente-operacao.jpg";
import telaDesempenho from "./assets/screens/admin-desempenho.jpg";
import videoOperacao from "./assets/media/operacao-3d.mp4";
import posterOperacao from "./assets/media/operacao-3d-poster.jpg";

// Capítulos: cada seção tem o seu fundo e a sua tinta. A navegação e as
// pastas do hero usam as mesmas cores.
export const capitulos = [
  { id: "problema", nome: "O problema", fundo: "gray", tinta: "ink" },
  { id: "solucao", nome: "A solução", fundo: "green", tinta: "paper" },
  { id: "como-funciona", nome: "Como funciona", fundo: "mint", tinta: "ink" },
  { id: "recursos", nome: "Recursos", fundo: "graphite", tinta: "paper" },
  { id: "plataforma", nome: "Plataforma", fundo: "paper", tinta: "ink" },
];

export const problemaTexto =
  "Todo dia, alguma farmácia descobre que um remédio acabou. Muitas vezes, a poucos quilômetros dali, outra unidade da mesma rede tem caixas paradas na prateleira. Sem um caminho entre as duas, o pedido vira telefonema, planilha e mensagem perdida: ninguém sabe quem tem, quem aprovou nem quando chega. O paciente volta para casa sem o medicamento, e o estoque que sobrava continua parado. O problema não é falta de remédio na rede. É falta de ligação entre quem tem e quem precisa.";

// Farmácias da base de demonstração do back-end (database/seed.sql).
// Coordenadas no plano da cena, de 0 a 100.
export const farmacias = [
  { id: "pjn", nome: "Farmácia Pedro João Neto", x: 22, y: 30 },
  { id: "vida", nome: "Farmácia Vida", x: 74, y: 22 },
  { id: "leste", nome: "Farmácia Saúde Leste", x: 80, y: 72 },
  { id: "bem", nome: "Drogaria Bem Estar", x: 30, y: 78 },
  { id: "central", nome: "Farmácia Central", x: 52, y: 50 },
];

export const ligacoes = [
  ["pjn", "vida"], ["pjn", "central"], ["pjn", "bem"], ["vida", "central"],
  ["vida", "leste"], ["leste", "central"], ["leste", "bem"], ["bem", "central"],
];

// Simulação: qual farmácia sente a falta e qual tem o remédio em estoque.
export const simulacoes = [
  { remedio: "Paracetamol", falta: "pjn", tem: "vida", quantidade: 50 },
  { remedio: "Vitamina C", falta: "leste", tem: "bem", quantidade: 50 },
  { remedio: "Amoxicilina", falta: "bem", tem: "pjn", quantidade: 40 },
];

// As cinco etapas do relatório de cada chamado (etapasDoProcesso).
export const etapas = [
  {
    id: "aberto",
    nome: "Aberto",
    quem: "Funcionário",
    status: "Pendente",
    tom: "yellow",
    texto: "O funcionário abre um chamado de reposição: escolhe os remédios, a quantidade de cada um e a prioridade, de baixa a urgente.",
    tela: telaSolicitar,
    alt: "Formulário Solicitar reposição da plataforma do funcionário, com remédio, quantidade e prioridade",
  },
  {
    id: "gerente",
    nome: "Aguardando o gerente",
    quem: "Gerente da unidade",
    status: "Em andamento",
    tom: "green",
    texto: "O gerente vê, para cada remédio, quais farmácias da rede podem atender. Aceita e pede à rede, ou recusa com o motivo por escrito.",
    tela: telaRelatorio,
    alt: "Relatório do chamado CH-2026-000001, Falta de paracetamol, aguardando o gerente",
  },
  {
    id: "rede",
    nome: "Pedido à rede",
    quem: "Farmácia fornecedora",
    status: "Aguardando preparo",
    tom: "blue",
    texto: "Cada remédio vai para uma farmácia fornecedora. O gerente dela aceita o pedido, e a quantidade sai do estoque dela na hora.",
    tela: telaPedidos,
    alt: "Tela Pedidos da rede do gerente, com pedidos recebidos e enviados entre farmácias",
  },
  {
    id: "transito",
    nome: "Em trânsito",
    quem: "Equipe da fornecedora",
    status: "A caminho",
    tom: "blue",
    texto: "Toda a equipe recebe o aviso de preparo, e quem aperta Começar primeiro assume. Pronto o preparo, o envio sai com horário previsto de chegada.",
    tela: telaOperacao,
    alt: "Operação 3D da unidade, com gôndolas, equipe, balcões e a doca de recebimento",
  },
  {
    id: "resolvido",
    nome: "Resolvido",
    quem: "Quem pediu",
    status: "Resolvido",
    tom: "green",
    texto: "Quando todos os remédios chegam, o chamado se encerra. O relatório guarda cada etapa com data, hora e responsável.",
    tela: telaChamados,
    alt: "Lista de chamados do gerente com status pendente, recusado e cancelado",
  },
];

// Cada recurso tem a cor da plataforma onde ele vive.
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

export const telas = [
  { id: "gerente", nome: "Painel do gerente", papel: "Gerente", src: telaGerente, alt: "Visão geral do gerente: ferramentas, chamados pendentes, pedidos da rede e itens com atenção" },
  { id: "relatorio", nome: "Relatório do chamado", papel: "Gerente", src: telaRelatorio, alt: "Relatório do chamado com protocolo, solicitante, unidade e linha do tempo das etapas" },
  { id: "solicitar", nome: "Solicitar reposição", papel: "Funcionário", src: telaSolicitar, posicao: "50% 62%", alt: "Formulário de solicitação de reposição da plataforma do funcionário" },
  { id: "operacao", nome: "Operação 3D", papel: "Gerente", src: posterOperacao, video: videoOperacao, alt: "Gravação da Operação 3D percorrendo estoque, doca, gerência e atendimento" },
  { id: "desempenho", nome: "Desempenho", papel: "Admin", src: telaDesempenho, alt: "Aba Desempenho do admin: usuários ativos, cliques, taxa de erro, tempo de resposta e um alerta de rota falhando" },
];

export const parceiros = [
  { nome: "SUS", url: "https://www.gov.br/saude/pt-br/sus" },
  { nome: "Farmácia Popular", url: "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular" },
];

export const creditoFoto = "Foto: “Hospital Pharmacy”, de Mattes, domínio público, via Wikimedia Commons.";
