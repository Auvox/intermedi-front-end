import { useState } from "react";
import GraficoBarras from "./GraficoBarras";
import ListaCompacta from "./ListaCompacta";
import { usePerfil } from "./perfilContext";
import { EstoqueNaRede, PerfilLayout, Secao } from "./Blocos";
import SolicitarReposicao from "../SolicitarReposicao";
import useApiList from "../../hooks/useApiList";
import { useFarmaciaDoFuncionario } from "../../hooks/useChamados";
import { avisarDadosAlterados, useFocoTitulo, usePerfilDados } from "../../hooks/useResumo";
import { fotoUrl, listarRemedios } from "../../services/api";
import {
  comSituacao,
  formatarDataHora,
  formatarValidade,
  nomeComDosagem,
  quantidadeReposicao,
  reposicaoDoEstoque,
  tarja,
  tipo,
} from "../../services/remedios";
import { numero } from "../../services/perfil";

const plural = (n, um, varios) => `${numero(n)} ${Number(n) === 1 ? um : varios}`;

// Capa pequena do cabeçalho: a foto do remédio ou, sem foto, a embalagem em
// tipo (nome e dosagem) com a faixa da tarja embaixo, como na caixa de verdade
function CapaRemedio({ remedio: r }) {
  const [falhou, setFalhou] = useState(false);
  const src = fotoUrl(r.fotoRemedio);
  const { tone } = tarja(r.tarjaRemedio);
  return (
    <div className={`ficha-capa tarja-${tone}`}>
      {src && !falhou ? (
        <img src={src} alt={nomeComDosagem(r)} onError={() => setFalhou(true)} />
      ) : (
        <span className="ficha-capa-caixa" role="img" aria-label={`${nomeComDosagem(r)} sem foto`}>
          <b>{r.nomeRemedio}</b>
          <small>{r.dosagemRemedio}</small>
        </span>
      )}
      <i aria-hidden="true" />
    </div>
  );
}

// Pedido já preenchido com este remédio. Crítico/zerado: quantidade para chegar ao
// dobro do mínimo e prioridade alta/urgente; em dia: sugestão só se fizer sentido.
function pedidoInicial(remedio, linha) {
  if (!linha) return { itensIniciais: [{ idRemedio: remedio.idRemedio, quantidade: "" }], prioridadeInicial: "alta" };
  const item = { ...linha, idRemedio: remedio.idRemedio };
  if (linha.situacao !== "ok" || linha.vencido) return reposicaoDoEstoque([item]);
  const sugestao = quantidadeReposicao(item);
  return { itensIniciais: [{ idRemedio: remedio.idRemedio, quantidade: sugestao > 1 ? sugestao : "" }], prioridadeInicial: "media" };
}

// Funcionário: abre o pedido de reposição (chamado) com este remédio já incluído
function BotaoReposicao({ remedio, linha }) {
  const funcionario = useFarmaciaDoFuncionario();
  const { items: catalogo } = useApiList(listarRemedios);
  const [aberto, setAberto] = useState(false);
  const pedido = pedidoInicial(remedio, linha);
  return (
    <>
      <button
        type="button"
        className="ficha-acao"
        disabled={!funcionario.idFuncionario || !catalogo.length}
        onClick={() => setAberto(true)}
      >
        Solicitar reposição
      </button>
      {aberto && (
        <SolicitarReposicao
          medicines={catalogo}
          funcionario={funcionario}
          itensIniciais={pedido.itensIniciais}
          prioridadeInicial={pedido.prioridadeInicial}
          onClose={() => setAberto(false)}
          onSuccess={() => avisarDadosAlterados({ tipo: "chamado" })}
        />
      )}
    </>
  );
}

const SINAL = { critico: "Abaixo do mínimo", zerado: "Zerado" };

// Régua do estoque: a quantidade contra o mínimo (a marca fica no mínimo; a
// régua inteira é o dobro dele). Só a parte cheia leva a cor da plataforma.
function Regua({ quantidade, minimo, tom }) {
  const escala = Math.max(minimo * 2, quantidade, 1);
  const pct = (v) => `${Math.min(100, (v / escala) * 100)}%`;
  return (
    <span
      className={`ficha-regua is-${tom}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={escala}
      aria-valuenow={quantidade}
      aria-label={`${quantidade} unidades, mínimo ${minimo}`}
    >
      <i style={{ width: pct(quantidade) }} />
      {minimo > 0 && <b style={{ left: pct(minimo) }} />}
    </span>
  );
}

// Estoque da unidade de quem vê (admin, sem farmácia: o total da rede)
function EstoqueDaUnidade({ rede, linha, idFarmaciaAtual }) {
  if (!idFarmaciaAtual) {
    return (
      <section className="ficha-card ficha-unidade" aria-label="Estoque na rede">
        <h2>Estoque na rede</h2>
        <p className="ficha-numero">{numero(rede.unidadesNaRede)} <small>unidades</small></p>
        <p className="ficha-nota">Em estoque em {numero(rede.farmaciasComEstoque)} de {plural(rede.farmaciasComCadastro, "farmácia", "farmácias")}.</p>
      </section>
    );
  }
  if (!linha) {
    return (
      <section className="ficha-card ficha-unidade" aria-label="Estoque da sua farmácia">
        <h2>Estoque da sua farmácia</h2>
        <p className="ficha-numero is-vazio">— <small>não cadastrado</small></p>
        <p className="ficha-nota">Este remédio não está no estoque da sua farmácia.</p>
      </section>
    );
  }
  const qtd = Number(linha.quantidade) || 0;
  const minimo = Number(linha.estoqueMinimo) || 0;
  const tom = linha.vencido ? "zerado" : linha.situacao;
  return (
    <section className="ficha-card ficha-unidade" aria-label="Estoque da sua farmácia">
      <h2>
        Estoque da sua farmácia
        {(SINAL[tom] || linha.vencido) && <span className={`ficha-sinal is-${tom}`}>{linha.vencido ? "Lote vencido" : SINAL[tom]}</span>}
      </h2>
      <p className="ficha-numero">{numero(qtd)} <small>{qtd === 1 ? "unidade" : "unidades"}</small></p>
      <Regua quantidade={qtd} minimo={minimo} tom={tom} />
      <dl className="ficha-linha">
        <div><dt>Mínimo</dt><dd>{numero(minimo)}</dd></div>
        <div><dt>Lote</dt><dd>{linha.lote || "—"}</dd></div>
        <div><dt>Validade</dt><dd className={linha.vencido ? "is-alerta" : undefined}>{formatarValidade(linha.validade)}</dd></div>
      </dl>
    </section>
  );
}

// A rede: quanto cada farmácia tem (a sua primeiro, na cor da plataforma)
function NaRede({ rede, idFarmaciaAtual }) {
  const { abrirPerfil } = usePerfil();
  const farmacias = rede.farmacias.map(comSituacao);
  const maior = Math.max(1, ...farmacias.map((f) => Number(f.quantidade) || 0));
  const minha = (f) => idFarmaciaAtual && String(f.idFarmacia) === String(idFarmaciaAtual);
  const ordenadas = [...farmacias.filter(minha), ...farmacias.filter((f) => !minha(f)).sort((a, b) => b.quantidade - a.quantidade)];
  return (
    <section className="ficha-card ficha-rede" aria-label="Disponível na rede">
      <h2>
        Disponível na rede
        <span className="ficha-total">{plural(rede.unidadesNaRede, "unidade", "unidades")}</span>
      </h2>
      {ordenadas.length ? (
        <ul>
          {ordenadas.slice(0, 5).map((f) => (
            <li key={f.idFarmacia} className={minha(f) ? "is-minha" : undefined}>
              <button type="button" onClick={(e) => abrirPerfil("farmacia", f.idFarmacia, e.currentTarget)} title={f.nomeFarmacia}>
                {f.nomeFarmacia}{minha(f) && <em> · sua</em>}
              </button>
              <span className="ficha-mini" aria-hidden="true">
                <i style={{ width: `${Math.max(2, (Number(f.quantidade) / maior) * 100)}%` }} />
              </span>
              <strong className={f.situacao !== "ok" || f.vencido ? "is-alerta" : undefined}>{numero(f.quantidade)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ficha-nota">Nenhuma farmácia da rede tem este remédio.</p>
      )}
      <p className="ficha-nota">Em estoque em {numero(rede.farmaciasComEstoque)} de {plural(rede.farmaciasComCadastro, "farmácia", "farmácias")}.</p>
    </section>
  );
}

// Topo da ficha: o remédio como cabeçalho (capa, nome, uma linha de dados e a
// ação), e embaixo o estoque da unidade ao lado da rede, e a ficha rápida.
function TopoProduto({ remedio: r, rede, idFarmaciaAtual, plataforma }) {
  const titulo = useFocoTitulo();
  const linhaBruta = idFarmaciaAtual && rede.farmacias.find((f) => String(f.idFarmacia) === String(idFarmaciaAtual));
  const linha = linhaBruta ? comSituacao(linhaBruta) : null;
  const { label: tarjaLabel } = tarja(r.tarjaRemedio);
  const dados = [r.principioAtivoRemedio, r.apresentacaoRemedio, r.formaFarmaceuticaRemedio, r.viaAdministracaoRemedio && `via ${r.viaAdministracaoRemedio}`]
    .filter(Boolean);
  const fatos = [
    ["Fabricante", r.fabricanteRemedio],
    ["Registro ANVISA", r.registroAnvisaRemedio],
    ["Categorias", r.categorias],
    ["Receita", r.exigeReceita ? `Exige receita${r.retemReceita ? ", fica retida" : ""}` : "Não exige"],
    ["Armazenamento", r.armazenamentoRemedio],
    ["No catálogo desde", r.createdAtRemedio && formatarDataHora(r.createdAtRemedio).slice(0, 10)],
  ];

  return (
    <header className="ficha">
      <div className="ficha-cabecalho">
        <CapaRemedio remedio={r} />
        <div className="ficha-titulo">
          <h1 ref={titulo} className="perfil-foco-inicial" tabIndex={-1}>{nomeComDosagem(r)}</h1>
          <p className="ficha-dados">{dados.join(" · ")}</p>
          <p className="ficha-selos">
            <span className={`ficha-selo tarja-${tarja(r.tarjaRemedio).tone}`}>{tarjaLabel}</span>
            {r.tipoRemedio && <span className="ficha-selo">{tipo(r.tipoRemedio)}</span>}
          </p>
        </div>
        {plataforma === "funcionario" && <BotaoReposicao remedio={r} linha={linha} />}
      </div>

      <div className="ficha-grade">
        <EstoqueDaUnidade rede={rede} linha={linha} idFarmaciaAtual={idFarmaciaAtual} />
        <NaRede rede={rede} idFarmaciaAtual={idFarmaciaAtual} />
        <section className="ficha-card ficha-fatos" aria-label="Ficha rápida">
          <dl>
            {fatos.map(([rotulo, valor]) => (
              <div key={rotulo}><dt>{rotulo}</dt><dd>{valor || "—"}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </header>
  );
}

function Bula({ remedio: r }) {
  const partes = [
    ["Para que serve", r.indicacoesRemedio || r.descRemedio],
    ["Quando não usar", r.contraindicacoesRemedio],
    ["Como guardar", r.armazenamentoRemedio],
    ["Como usar", r.viaAdministracaoRemedio && `Via ${r.viaAdministracaoRemedio}${r.formaFarmaceuticaRemedio ? ` · ${r.formaFarmaceuticaRemedio}` : ""}.`],
    ["Receita", r.exigeReceita
      ? `Exige receita médica${r.retemReceita ? " e a receita fica retida na farmácia" : ""}.`
      : "Venda livre, não exige receita."],
    r.descRemedio && r.indicacoesRemedio && ["Sobre o remédio", r.descRemedio],
  ].filter((p) => p && p[1]);
  return (
    <div className="prod-bula">
      {partes.map(([titulo, texto]) => (
        <section key={titulo}>
          <h2>{titulo}</h2>
          <p>{texto}</p>
        </section>
      ))}
    </div>
  );
}

function Ficha({ remedio: r }) {
  const linhas = [
    ["Nome", r.nomeRemedio],
    ["Dosagem", r.dosagemRemedio],
    ["Princípio ativo", r.principioAtivoRemedio],
    ["Fabricante", r.fabricanteRemedio],
    ["Registro ANVISA", r.registroAnvisaRemedio],
    ["Tipo", r.tipoRemedio && tipo(r.tipoRemedio)],
    ["Tarja", tarja(r.tarjaRemedio).label],
    ["Apresentação", r.apresentacaoRemedio],
    ["Forma farmacêutica", r.formaFarmaceuticaRemedio],
    ["Via de administração", r.viaAdministracaoRemedio],
    ["Categorias", r.categorias],
    ["Cadastrado em", r.createdAtRemedio && formatarDataHora(r.createdAtRemedio)],
    r.updatedAtRemedio && ["Atualizado em", formatarDataHora(r.updatedAtRemedio)],
  ].filter(Boolean);
  return (
    <table className="prod-ficha">
      <tbody>
        {linhas.map(([rotulo, valor]) => (
          <tr key={rotulo}><th scope="row">{rotulo}</th><td>{valor || "—"}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PerfilRemedio({ id }) {
  const { abrirPerfil, idFarmaciaAtual, plataforma } = usePerfil();
  const estado = usePerfilDados("remedio", id, (d) => nomeComDosagem(d.remedio ?? {}));

  return (
    <PerfilLayout
      estado={estado}
      variante="produto"
      montar={(d) => {
        const r = d.remedio;
        const rede = d.rede;
        const criticas = rede.farmacias.map(comSituacao).filter((f) => f.situacao !== "ok" || f.vencido).length;
        return {
          topo: <TopoProduto remedio={r} rede={rede} idFarmaciaAtual={idFarmaciaAtual} plataforma={plataforma} />,
          periodo: d.periodo,
          semPeriodo: ["rede", "bula", "ficha"],
          abas: [
            ["movimento", "Movimento", () => (
              <div className="inst-colunas">
                <div className="inst-principal">
                  <Secao titulo="Saídas no período" descricao={`Por ${d.periodo?.agrupamento === "mes" ? "mês" : "dia"}`}>
                    <GraficoBarras
                      titulo="Saídas de estoque"
                      serie={d.servicos.serie}
                      agrupamento={d.periodo.agrupamento}
                      rotuloTotal="Atendimentos"
                      rotuloUnidades="Unidades"
                    />
                  </Secao>
                  <Secao titulo="Onde mais sai" descricao="Farmácias que mais entregaram no período">
                    <ListaCompacta
                      rotulo="Farmácias onde mais sai"
                      vazio="Nenhuma saída neste período."
                      itens={(d.servicos.porFarmacia ?? []).map((f, i) => ({
                        chave: f.idFarmacia,
                        inicio: <span className="perfil-rank">{i + 1}</span>,
                        titulo: f.nomeFarmacia,
                        lateral: `${numero(f.unidades)} un.`,
                        rotulo: `Abrir perfil da ${f.nomeFarmacia}`,
                        onAbrir: () => abrirPerfil("farmacia", f.idFarmacia),
                      }))}
                    />
                  </Secao>
                </div>
                <aside className="inst-lateral" aria-label="Pedidos e reposição">
                  <Secao titulo="Pedidos e reposição" descricao="No período escolhido">
                    <dl className="inst-fluxo-linhas">
                      <div><dt>Chamados pedindo este remédio</dt><dd>{numero(d.chamados.total)}</dd></div>
                      <div><dt>Unidades pedidas</dt><dd>{numero(d.chamados.unidadesSolicitadas)}</dd></div>
                      <div><dt>Farmácias que pediram</dt><dd>{numero(d.chamados.farmacias)}</dd></div>
                      <div><dt>Unidades redistribuídas na rede</dt><dd>{numero(d.redistribuicoes.unidadesMovimentadas)}</dd></div>
                      <div><dt>Pedidos entre farmácias</dt><dd>{numero(d.redistribuicoes.total)}</dd></div>
                      <div><dt>Pedidos recusados</dt><dd>{numero(d.redistribuicoes.recusadas)}</dd></div>
                    </dl>
                  </Secao>
                </aside>
              </div>
            ), undefined, {
              valor: numero(d.servicos.unidadesEntregues),
              rotulo: d.servicos.unidadesEntregues === 1 ? "unidade entregue no período" : "unidades entregues no período",
              detalhe: `${plural(d.servicos.atendimentos, "atendimento", "atendimentos")} · ${plural(d.servicos.pacientes, "paciente", "pacientes")}`,
            }],
            ["rede", "Disponibilidade na rede", () => (
              <div className="prod-largura"><EstoqueNaRede farmacias={rede.farmacias} /></div>
            ), undefined, {
              valor: numero(rede.unidadesNaRede),
              rotulo: rede.unidadesNaRede === 1 ? "unidade na rede" : "unidades na rede",
              detalhe: `Em estoque em ${numero(rede.farmaciasComEstoque)} de ${plural(rede.farmaciasComCadastro, "farmácia", "farmácias")} · ${plural(criticas, "precisa", "precisam")} de reposição`,
            }],
            ["bula", "Bula", () => <Bula remedio={r} />],
            ["ficha", "Ficha técnica", () => <Ficha remedio={r} />],
          ],
        };
      }}
    />
  );
}
