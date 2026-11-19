// Monta o conteúdo dos relatórios em PDF do admin a partir da API.
import { baixarRelatorioPdf } from "./relatorioPdf";
import {
  buscarAlertas, buscarResumo, buscarRotas, buscarSaude, duracao, nomeDaTela, nomeAdmin, numero, porcentagem, PLATAFORMAS,
} from "./desempenho";
import {
  listarCatalogo, listarChamadosGerente, listarFarmacias, listarFuncionarios, listarGerentes, listarPacientes,
} from "./api";

const ROTULO_PERIODO = { hoje: "Hoje", "7d": "Últimos 7 dias", "30d": "Últimos 30 dias", personalizado: "Personalizado" };
const dia = (v) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");
const dataHora = (v) => (v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const variacao = (v) => (v === null || v === undefined ? "" : `${v > 0 ? "+" : ""}${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. período anterior`);
const seguro = (promessa, padrao) => promessa.catch(() => padrao);
const situacao = (ativo) => (ativo === 0 ? "Desativado" : "Ativo");
const hojeArquivo = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------ Desempenho
export async function exportarDesempenhoPdf(filtros, farmacias = []) {
  const consulta = filtros.consulta;
  const [resumo, rotas, saude, alertas] = await Promise.all([
    buscarResumo(consulta),
    seguro(buscarRotas(consulta), []),
    seguro(buscarSaude(consulta), null),
    seguro(buscarAlertas("ativo"), { alertas: [] }),
  ]);
  const ind = resumo?.indicadores ?? {};
  const nomeFarmacia = farmacias.find((f) => String(f.idFarmacia) === String(filtros.farmacia))?.nomeFarmacia;
  const periodo = filtros.periodo === "personalizado"
    ? `${dia(filtros.inicio)} a ${dia(filtros.fim)}`
    : ROTULO_PERIODO[filtros.periodo] ?? filtros.periodo;
  const listaAlertas = Array.isArray(alertas) ? alertas : alertas?.alertas ?? [];

  return baixarRelatorioPdf({
    titulo: "Relatório de Desempenho do Sistema",
    subtitulo: "Uso da plataforma, saúde do servidor e alertas operacionais da rede Intermedi",
    sigla: "DSP",
    arquivo: `intermedi-desempenho-${hojeArquivo()}.pdf`,
    emissor: nomeAdmin() || "Administrador da plataforma",
    filtros: [
      ["Período", periodo],
      ["Plataforma", filtros.plataforma === "todas" ? "Todas" : PLATAFORMAS[filtros.plataforma] ?? filtros.plataforma],
      ["Farmácia", nomeFarmacia || "Todas as farmácias"],
    ],
    destaques: [
      ["Usuários ativos", numero(ind.usuariosAtivos?.valor), variacao(ind.usuariosAtivos?.variacao)],
      ["Cliques", numero(ind.cliques?.valor), variacao(ind.cliques?.variacao)],
      ["Taxa de erro", porcentagem(ind.taxaErro?.valor), variacao(ind.taxaErro?.variacao)],
      ["Tempo de resposta", duracao(ind.tempoMedioMs?.valor), variacao(ind.tempoMedioMs?.variacao)],
      ["Requisições", numero(resumo?.requisicoes?.total), "Pedidos feitos ao servidor"],
      ["Requisições com erro", numero(resumo?.requisicoes?.erros), "Falhas do servidor (5xx)"],
      ["Alertas ativos", numero(resumo?.totalAlertas ?? listaAlertas.length), "Precisam de atenção"],
      ["Banco de dados", saude?.banco ? (saude.banco.ok ? "Respondendo" : "Sem resposta") : "—", saude?.status?.frase],
    ],
    secoes: [
      {
        titulo: "Situação geral",
        texto: saude?.status?.frase
          ? `${saude.status.frase}${saude.totais ? ` ${numero(saude.totais.requisicoes)} requisições no período, ${porcentagem(saude.totais.taxaErro)} com erro e resposta média de ${duracao(saude.totais.tempoMedioMs)}.` : ""}`
          : "Resumo da situação do sistema no período escolhido.",
      },
      {
        titulo: "Requisições e erros ao longo do período",
        tabela: {
          cabecalho: ["Início do intervalo", "Requisições", "Com erro", "Taxa de erro"],
          linhas: (resumo?.serie ?? []).filter((p) => p.requisicoes || p.erros).map((p) => [
            dataHora(p.inicio) + (p.parcial ? " (parcial)" : ""),
            numero(p.requisicoes), numero(p.erros),
            p.requisicoes ? porcentagem((p.erros / p.requisicoes) * 100) : "—",
          ]),
        },
        vazio: "Nenhuma requisição registrada no período.",
      },
      {
        titulo: "Telas mais acessadas",
        tabela: {
          cabecalho: ["Tela", "Plataforma", "Visitas", "Cliques"],
          linhas: (resumo?.maisAcessadas ?? []).map((r) => [nomeDaTela(r.rota, r.plataforma), PLATAFORMAS[r.plataforma] ?? r.plataforma, numero(r.visitas), numero(r.cliques)]),
        },
        vazio: "Ainda não há visitas às telas neste período.",
      },
      {
        titulo: "Rotas e telas (uso detalhado)",
        tabela: {
          cabecalho: ["Tela / rota", "Plataforma", "Visitas", "Cliques", "Tempo médio", "Abandono"],
          linhas: rotas.map((r) => [
            nomeDaTela(r.rota, r.plataforma), PLATAFORMAS[r.plataforma] ?? r.plataforma ?? "—",
            numero(r.visitas), numero(r.cliques), duracao(r.tempoMedioMs),
            r.taxaAbandono === undefined || r.taxaAbandono === null ? "—" : porcentagem(r.taxaAbandono),
          ]),
        },
        vazio: "Sem dados de rotas no período.",
      },
      {
        titulo: "Tempo de resposta do servidor",
        tabela: {
          cabecalho: ["Início do intervalo", "Média", "Mais lento (p95)"],
          linhas: (saude?.tempoResposta ?? []).filter((p) => p.mediaMs ?? p.media ?? p.tempoMedioMs).map((p) => [
            dataHora(p.inicio), duracao(p.mediaMs ?? p.media ?? p.tempoMedioMs), duracao(p.p95Ms ?? p.p95),
          ]),
        },
        vazio: "Sem medições de tempo de resposta no período.",
      },
      {
        titulo: "Rotas com erro",
        tabela: {
          cabecalho: ["Método", "Rota", "Erros", "Total", "Taxa de erro"],
          linhas: (saude?.rotasComErro ?? []).map((r) => [r.metodo, r.rota, numero(r.erros), numero(r.total ?? r.requisicoes), porcentagem(r.taxaErro)]),
        },
        vazio: "Nenhuma rota com erro no período.",
      },
      {
        titulo: "Últimos erros registrados",
        tabela: {
          cabecalho: ["Quando", "Rota", "Mensagem"],
          linhas: (saude?.ultimosErros ?? []).slice(0, 30).map((e) => [
            dataHora(e.quando ?? e.criadoEm ?? e.data), [e.metodo, e.rota].filter(Boolean).join(" "), e.mensagem ?? e.message ?? e.erro,
          ]),
        },
        vazio: "Nenhum erro registrado.",
      },
      {
        titulo: "Alertas ativos",
        tabela: {
          cabecalho: ["Severidade", "Alerta", "O que está acontecendo", "Desde", "Ocorrências"],
          linhas: listaAlertas.map((a) => [a.severidade, a.titulo, a.oQue, dataHora(a.criadoEm), numero(a.ocorrencias)]),
        },
        vazio: "Nenhum alerta ativo. Tudo funcionando.",
      },
    ],
  });
}

// ------------------------------------------------------------ Visão geral do admin
async function chamadosDaRede() {
  const gerentes = await listarGerentes();
  const listas = await Promise.all(
    gerentes.map((g) => listarChamadosGerente(g.idGerente, "").then((d) => d.chamados ?? []).catch(() => [])),
  );
  const porId = new Map();
  for (const c of listas.flat()) porId.set(c.idChamado, c);
  return [...porId.values()].sort((a, b) => String(b.dataAbertura).localeCompare(String(a.dataAbertura)));
}

export async function exportarVisaoGeralPdf() {
  const [farmacias, gerentes, funcionarios, pacientes, catalogo, chamados] = await Promise.all([
    seguro(listarFarmacias(), []),
    seguro(listarGerentes(), []),
    seguro(listarFuncionarios(), []),
    seguro(listarPacientes(), []),
    seguro(listarCatalogo({}), { remedios: [] }),
    // não há endpoint geral: junta os chamados de cada gerente (como a aba Solicitações)
    seguro(chamadosDaRede(), []),
  ]);
  const remedios = catalogo?.remedios ?? [];
  const listaChamados = Array.isArray(chamados) ? chamados : [];
  const ativos = (lista) => lista.filter((x) => x.ativo !== 0).length;
  const porFarmacia = (lista, id) => lista.filter((x) => String(x.fkIdFarmacia ?? x.idFarmacia) === String(id)).length;
  const STATUS = { pendente: "Pendente", em_andamento: "Em andamento", resolvido: "Resolvido", recusado: "Recusado" };
  const contarStatus = (s) => listaChamados.filter((c) => c.status === s).length;

  return baixarRelatorioPdf({
    titulo: "Relatório Geral da Rede",
    subtitulo: "Farmácias, equipes, pacientes, catálogo de medicamentos e solicitações da rede Intermedi",
    sigla: "GER",
    arquivo: `intermedi-visao-geral-${hojeArquivo()}.pdf`,
    emissor: nomeAdmin() || "Administrador da plataforma",
    filtros: [["Abrangência", "Toda a rede"], ["Posição em", new Date().toLocaleString("pt-BR")]],
    destaques: [
      ["Farmácias", numero(farmacias.length), `${ativos(farmacias)} ativas`],
      ["Gerentes", numero(gerentes.length), `${ativos(gerentes)} ativos`],
      ["Funcionários", numero(funcionarios.length), `${ativos(funcionarios)} ativos`],
      ["Pacientes", numero(pacientes.length), `${ativos(pacientes)} ativos`],
      ["Medicamentos", numero(remedios.length), "No catálogo da rede"],
      ["Solicitações", numero(listaChamados.length), `${contarStatus("pendente")} pendentes`],
      ["Em andamento", numero(contarStatus("em_andamento")), "Pedidos na rede"],
      ["Resolvidas", numero(contarStatus("resolvido")), `${contarStatus("recusado")} recusadas`],
    ],
    secoes: [
      {
        titulo: "Farmácias da rede",
        tabela: {
          cabecalho: ["Farmácia", "CNES", "Cidade/UF", "Telefone", "Gerentes", "Funcionários", "Situação"],
          linhas: farmacias.map((f) => [
            f.nomeFarmacia, f.cnesFarmacia, [f.cidadeFarmacia, f.ufFarmacia].filter(Boolean).join("/"), f.telFarmacia,
            porFarmacia(gerentes, f.idFarmacia), porFarmacia(funcionarios, f.idFarmacia), situacao(f.ativo),
          ]),
        },
        vazio: "Nenhuma farmácia cadastrada.",
      },
      {
        titulo: "Gerentes",
        tabela: {
          cabecalho: ["Nome", "Matrícula", "CRF", "Farmácia", "E-mail", "Situação"],
          linhas: gerentes.map((g) => [g.nomeGerente, g.matriculaGerente, g.crfGerente, g.nomeFarmacia, g.emailGerente, situacao(g.ativo)]),
        },
        vazio: "Nenhum gerente cadastrado.",
      },
      {
        titulo: "Funcionários",
        tabela: {
          cabecalho: ["Nome", "Matrícula", "Cargo", "Turno", "Farmácia", "Situação"],
          linhas: funcionarios.map((f) => [f.nomeFuncionario, f.matriculaFuncionario, f.cargoFuncionario, f.turnoFuncionario, f.nomeFarmacia, situacao(f.ativo)]),
        },
        vazio: "Nenhum funcionário cadastrado.",
      },
      {
        titulo: "Pacientes",
        texto: "CPF exibido de forma parcial para proteger dados pessoais (LGPD, art. 6º, III — minimização).",
        tabela: {
          cabecalho: ["Nome", "CPF", "Cidade/UF", "Cadastro", "Situação"],
          linhas: pacientes.map((p) => [
            p.nomePaciente,
            p.cpfPaciente ? `***.${String(p.cpfPaciente).replace(/\D/g, "").slice(3, 6)}.***-**` : "—",
            [p.cidadePaciente, p.estadoPaciente].filter(Boolean).join("/"), dia(p.createdAtPaciente), situacao(p.ativo),
          ]),
        },
        vazio: "Nenhum paciente cadastrado.",
      },
      {
        titulo: "Catálogo de medicamentos",
        tabela: {
          cabecalho: ["Medicamento", "Dosagem", "Apresentação", "Fabricante"],
          linhas: remedios.map((r) => [r.nomeRemedio, r.dosagemRemedio, r.apresentacaoRemedio, r.fabricanteRemedio]),
        },
        vazio: "Nenhum medicamento no catálogo.",
      },
      {
        titulo: "Solicitações (chamados de reposição)",
        tabela: {
          cabecalho: ["Nº", "Título", "Farmácia", "Solicitante", "Prioridade", "Aberto em", "Situação"],
          linhas: listaChamados.map((c) => [
            `#${c.idChamado}`, c.titulo, c.farmacia?.nomeFarmacia ?? c.nomeFarmacia, c.funcionario?.nomeFuncionario ?? c.nomeFuncionario,
            c.prioridade, dataHora(c.dataAbertura), STATUS[c.status] ?? c.status,
          ]),
        },
        vazio: "Nenhuma solicitação registrada.",
      },
    ],
  });
}
