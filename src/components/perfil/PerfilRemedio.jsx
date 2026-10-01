import { useState } from "react";
import GraficoBarras from "./GraficoBarras";
import ListaCompacta from "./ListaCompacta";
import { usePerfil } from "./perfilContext";
import { EstoqueNaRede, PerfilLayout, Secao } from "./Blocos";
import ManagerIcon from "../ManagerIcon";
import SolicitarReposicao from "../SolicitarReposicao";
import { SituacaoBadges, TarjaBadge } from "../Remedios";
import useApiList from "../../hooks/useApiList";
import { useFuncionarioAtual } from "../../hooks/useChamados";
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

// Foto grande do produto; sem foto, uma caixinha ilustrada com o nome
function FotoProduto({ remedio: r }) {
  const [falhou, setFalhou] = useState(false);
  const src = fotoUrl(r.fotoRemedio);
  const { label, tone } = tarja(r.tarjaRemedio);
  return (
    <div className={`prod-foto tarja-${tone}`}>
      {src && !falhou ? (
        <img src={src} alt={nomeComDosagem(r)} onError={() => setFalhou(true)} />
      ) : (
        <div className="prod-caixa" role="img" aria-label={`${nomeComDosagem(r)} sem foto`}>
          <b>{r.nomeRemedio}</b>
          <span>{[r.dosagemRemedio, r.apresentacaoRemedio].filter(Boolean).join(" · ")}</span>
          <i />
        </div>
      )}
      <p className="prod-tarja">{label}</p>
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
  const funcionario = useFuncionarioAtual();
  const { items: catalogo } = useApiList(listarRemedios);
  const [aberto, setAberto] = useState(false);
  const pedido = pedidoInicial(remedio, linha);
  return (
    <>
      <button
        type="button"
        className="prod-botao"
        disabled={!funcionario.idFuncionario || !catalogo.length}
        onClick={() => setAberto(true)}
      >
        <ManagerIcon name="ticket" size={18} />
        Solicitar reposição de {remedio.nomeRemedio}
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

// Quadro de estoque (o "preço" da página de produto): a farmácia de quem vê e a rede.
// Admin, sem farmácia, vê o total da rede no lugar da farmácia.
function QuadroEstoque({ rede, linha, idFarmaciaAtual }) {
  const { abrirPerfil } = usePerfil();
  const farmacias = rede.farmacias.map(comSituacao);
  const maior = Math.max(1, ...farmacias.map((f) => Number(f.quantidade) || 0));
  const criticas = farmacias.filter((f) => f.situacao !== "ok" || f.vencido).length;
  const qtd = Number(linha?.quantidade) || 0;
  const minimo = Number(linha?.estoqueMinimo) || 0;
  const pct = minimo > 0 ? Math.min(100, Math.round((qtd / (minimo * 2)) * 100)) : qtd > 0 ? 100 : 0;
  const tom = !linha || linha.vencido ? "zerado" : linha.situacao;
  const minha = (f) => idFarmaciaAtual && String(f.idFarmacia) === String(idFarmaciaAtual);
  const ordenadas = [...farmacias.filter(minha), ...farmacias.filter((f) => !minha(f))];

  return (
    <div className="prod-compra">
      {idFarmaciaAtual ? (
        <div className={`prod-meu ${tom}`} role="group" aria-label="Estoque da sua farmácia">
          <span className="prod-rotulo">Estoque da sua farmácia</span>
          <div className="prod-qtd"><strong>{numero(qtd)}</strong><span>{qtd === 1 ? "unidade" : "unidades"}</span></div>
          {linha ? (
            <>
              <span
                className="prod-barra"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={Math.max(minimo * 2, qtd, 1)}
                aria-valuenow={qtd}
                aria-label={`${qtd} unidades, mínimo ${minimo}`}
              >
                <i style={{ width: `${pct}%` }} />
                {minimo > 0 && <b />}
              </span>
              <span className="prod-meta">Mínimo {numero(minimo)} · lote {linha.lote || "—"} · validade {formatarValidade(linha.validade)}</span>
              <SituacaoBadges item={linha} />
            </>
          ) : (
            <span className="prod-meta">Este remédio não está cadastrado no estoque da sua farmácia.</span>
          )}
        </div>
      ) : (
        <div className="prod-meu ok" role="group" aria-label="Estoque na rede">
          <span className="prod-rotulo">Estoque na rede</span>
          <div className="prod-qtd"><strong>{numero(rede.unidadesNaRede)}</strong><span>unidades</span></div>
          <span className="prod-meta">Em estoque em {numero(rede.farmaciasComEstoque)} de {plural(rede.farmaciasComCadastro, "farmácia", "farmácias")}</span>
          {criticas > 0 && <span className="mgr-badge chamado-badge orange">{plural(criticas, "farmácia precisa", "farmácias precisam")} de reposição</span>}
        </div>
      )}
      <div className="prod-rede">
        <span className="prod-rotulo">Disponível na rede</span>
        {ordenadas.length ? (
          <ul>
            {ordenadas.slice(0, 4).map((f) => (
              <li key={f.idFarmacia}>
                <button type="button" onClick={(e) => abrirPerfil("farmacia", f.idFarmacia, e.currentTarget)} title={f.nomeFarmacia}>
                  {f.nomeFarmacia}{minha(f) && <em>sua</em>}
                </button>
                <span className="prod-mini" aria-hidden="true">
                  <i className={f.situacao !== "ok" || f.vencido ? "alerta" : undefined} style={{ width: `${Math.max(3, (Number(f.quantidade) / maior) * 100)}%` }} />
                </span>
                <strong>{numero(f.quantidade)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="prod-meta">Nenhuma farmácia tem este remédio.</p>
        )}
        <p className="prod-total">
          <b>{plural(rede.unidadesNaRede, "unidade", "unidades")}</b> em {numero(rede.farmaciasComEstoque)} de {plural(rede.farmaciasComCadastro, "farmácia", "farmácias")}
        </p>
      </div>
    </div>
  );
}

// Topo em formato de vitrine: foto à esquerda (com a ação e os dados rápidos
// embaixo, sem deixar vazio), identificação, ficha rápida e o quadro de estoque
function TopoProduto({ remedio: r, rede, idFarmaciaAtual, plataforma }) {
  const titulo = useFocoTitulo();
  const linhaBruta = idFarmaciaAtual && rede.farmacias.find((f) => String(f.idFarmacia) === String(idFarmaciaAtual));
  const linha = linhaBruta ? comSituacao(linhaBruta) : null;
  const aviso = [
    r.exigeReceita
      ? `Exige receita médica${r.retemReceita ? "; a receita fica retida na farmácia" : ""}.`
      : "Não exige receita.",
    r.armazenamentoRemedio && `Armazenamento: ${r.armazenamentoRemedio}`,
  ].filter(Boolean).join(" ");

  return (
    <header className="prod-topo">
      <div className="prod-galeria">
        <FotoProduto remedio={r} />
        {plataforma === "funcionario" && <BotaoReposicao remedio={r} linha={linha} />}
        <p className={`prod-aviso${r.exigeReceita ? " receita" : ""}`}>
          <ManagerIcon name={r.exigeReceita ? "alert" : "info"} size={16} />
          <span>{aviso}</span>
        </p>
        <dl className="prod-fatos">
          <div><dt>Registro ANVISA</dt><dd>{r.registroAnvisaRemedio || "—"}</dd></div>
          <div><dt>Categorias</dt><dd>{r.categorias || "—"}</dd></div>
          <div><dt>No catálogo desde</dt><dd>{r.createdAtRemedio ? formatarDataHora(r.createdAtRemedio).slice(0, 10) : "—"}</dd></div>
        </dl>
      </div>

      <div className="prod-info">
        {r.fabricanteRemedio && <p className="prod-marca">{r.fabricanteRemedio}</p>}
        <h1 ref={titulo} className="perfil-foco-inicial" tabIndex={-1}>{nomeComDosagem(r)}</h1>
        {r.principioAtivoRemedio && <p className="prod-ativo">{r.principioAtivoRemedio}</p>}
        <div className="prod-selos">
          <TarjaBadge valor={r.tarjaRemedio} />
          {r.tipoRemedio && <span className="remedio-tipo">{tipo(r.tipoRemedio)}</span>}
          {r.exigeReceita ? <span className="remedio-tipo">Exige receita</span> : null}
        </div>
        <div className="prod-specs">
          <div><small>Apresentação</small><span>{r.apresentacaoRemedio || "—"}</span></div>
          <div><small>Forma</small><span>{r.formaFarmaceuticaRemedio || "—"}</span></div>
          <div><small>Via</small><span>{r.viaAdministracaoRemedio || "—"}</span></div>
        </div>
        <QuadroEstoque rede={rede} linha={linha} idFarmaciaAtual={idFarmaciaAtual} />
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
