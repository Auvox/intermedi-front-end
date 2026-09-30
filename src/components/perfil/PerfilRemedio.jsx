import CardNumero from "./CardNumero";
import GraficoBarras from "./GraficoBarras";
import ListaCompacta from "./ListaCompacta";
import { usePerfil } from "./perfilContext";
import { Detalhes, EstoqueNaRede, Grade, Kpis, PerfilLayout, Secao } from "./Blocos";
import { TarjaBadge } from "../Remedios";
import ManagerIcon from "../ManagerIcon";
import { usePerfilDados } from "../../hooks/useResumo";
import { formatarDataHora, nomeComDosagem, tipo } from "../../services/remedios";
import { numero } from "../../services/perfil";

export default function PerfilRemedio({ id }) {
  const { abrirPerfil } = usePerfil();
  const estado = usePerfilDados("remedio", id, (d) => nomeComDosagem(d.remedio ?? {}));

  return (
    <PerfilLayout
      estado={estado}
      montar={(d) => {
        const r = d.remedio;
        const rede = d.rede;
        return {
          cabecalho: {
            role: "remedio",
            foto: r.fotoRemedio,
            nome: nomeComDosagem(r),
            sobretitulo: "Remédio do catálogo",
            subtitulo: r.principioAtivoRemedio,
            selos: (
              <>
                <TarjaBadge valor={r.tarjaRemedio} />
                {r.tipoRemedio && <span className="remedio-tipo">{tipo(r.tipoRemedio)}</span>}
                {r.exigeReceita ? <span className="remedio-tipo">Exige receita</span> : null}
              </>
            ),
            meta: [
              r.fabricanteRemedio && ["pharmacy", r.fabricanteRemedio],
              r.apresentacaoRemedio && ["box", r.apresentacaoRemedio],
              ["pill", `${numero(rede.unidadesNaRede)} unidades na rede`],
            ],
          },
          periodo: d.periodo,
          semPeriodo: ["rede", "bula"],
          abas: [
            ["geral", "Visão geral", () => (
              <>
                <Kpis>
                  <CardNumero titulo="Unidades entregues" valor={numero(d.servicos.unidadesEntregues)} variacao={d.servicos.variacao} icone="pill" />
                  <CardNumero titulo="Atendimentos" valor={numero(d.servicos.atendimentos)} icone="clipboard" />
                  <CardNumero titulo="Pacientes" valor={numero(d.servicos.pacientes)} icone="heart" />
                  <CardNumero
                    titulo="Chamados pedindo"
                    valor={numero(d.chamados.total)}
                    icone="ticket"
                    detalhe={`${numero(d.chamados.unidadesSolicitadas)} un. em ${numero(d.chamados.farmacias)} ${d.chamados.farmacias === 1 ? "farmácia" : "farmácias"}`}
                  />
                  <CardNumero
                    titulo="Unidades redistribuídas"
                    valor={numero(d.redistribuicoes.unidadesMovimentadas)}
                    icone="truck"
                    detalhe={`${numero(d.redistribuicoes.total)} pedidos · ${numero(d.redistribuicoes.recusadas)} recusados`}
                  />
                </Kpis>
                <Grade>
                  <Secao titulo="Saídas no período" descricao={`Por ${d.periodo?.agrupamento === "mes" ? "mês" : "dia"}`} largo>
                    <GraficoBarras
                      titulo="Saídas de estoque"
                      serie={d.servicos.serie}
                      agrupamento={d.periodo.agrupamento}
                      rotuloTotal="Atendimentos"
                      rotuloUnidades="Unidades"
                    />
                  </Secao>
                  <Secao titulo="Onde mais sai">
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
                  <Secao titulo="Disponibilidade na rede">
                    <div className="perfil-destaque">
                      <span className="perfil-lista-icone"><ManagerIcon name="pharmacy" size={18} /></span>
                      <p>
                        Em estoque em <strong>{numero(rede.farmaciasComEstoque)}</strong> de{" "}
                        <strong>{numero(rede.farmaciasComCadastro)}</strong>{" "}
                        {rede.farmaciasComCadastro === 1 ? "farmácia que cadastrou" : "farmácias que cadastraram"} o remédio.
                      </p>
                    </div>
                    <span className="perfil-medidor" aria-hidden="true">
                      <i style={{ width: `${rede.farmaciasComCadastro ? (rede.farmaciasComEstoque / rede.farmaciasComCadastro) * 100 : 0}%` }} />
                    </span>
                  </Secao>
                </Grade>
              </>
            )],
            ["rede", "Estoque na rede", () => (
              <Grade>
                <Secao
                  titulo="Farmácias com este remédio"
                  descricao={`${numero(rede.unidadesNaRede)} unidades no total · estoque atual, sem filtro de período`}
                  largo
                >
                  <EstoqueNaRede farmacias={rede.farmacias} />
                </Secao>
              </Grade>
            ), numero(rede.farmacias?.length)],
            ["bula", "Bula", () => (
              <Grade>
                <Secao titulo="Bula resumida" largo>
                  {r.descRemedio && <p className="perfil-texto">{r.descRemedio}</p>}
                  {r.exigeReceita ? (
                    <p className="remedio-aviso">Exige receita médica{r.retemReceita ? " · a receita fica retida na farmácia" : ""}.</p>
                  ) : null}
                  <Detalhes itens={[
                    ["Indicações", r.indicacoesRemedio],
                    ["Contraindicações", r.contraindicacoesRemedio],
                    ["Armazenamento", r.armazenamentoRemedio],
                    ["Via de administração", r.viaAdministracaoRemedio],
                  ]} />
                </Secao>
                <Secao titulo="Registro">
                  <Detalhes itens={[
                    ["Registro ANVISA", r.registroAnvisaRemedio],
                    ["Fabricante", r.fabricanteRemedio],
                    ["Apresentação", r.apresentacaoRemedio],
                    ["Forma farmacêutica", r.formaFarmaceuticaRemedio],
                  ]} />
                </Secao>
                <Secao titulo="Cadastro">
                  <Detalhes itens={[
                    ["Categorias", r.categorias],
                    ["Cadastrado em", formatarDataHora(r.createdAtRemedio)],
                    r.updatedAtRemedio && ["Atualizado em", formatarDataHora(r.updatedAtRemedio)],
                  ]} />
                </Secao>
              </Grade>
            )],
          ],
        };
      }}
    />
  );
}
