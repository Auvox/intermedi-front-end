import { Link } from "react-router-dom";
import CardNumero from "./CardNumero";
import EnviarFoto from "./EnviarFoto";
import { usePerfil } from "./perfilContext";
import {
  AbaChamados,
  AbaEquipe,
  AbaEstoque,
  AbaRede,
  AbaServicos,
  Detalhes,
  EstoqueAtencao,
  GraficoServicos,
  Grade,
  Kpis,
  LinkPerfil,
  PerfilLayout,
  Secao,
} from "./Blocos";
import { avisarDadosAlterados, usePerfilDados } from "../../hooks/useResumo";
import { formatarDataChamado } from "../../services/chamados";
import { endereco, formatarMinutos, numero } from "../../services/perfil";

export default function PerfilGerente({ id }) {
  const { podeTrocarFoto, plataforma } = usePerfil();
  const estado = usePerfilDados("gerente", id, (d) => d.gerente?.nomeGerente);
  const linkEstoque = plataforma === "gerente" && <Link className="perfil-link" to="/gerente/remedios">Estoque completo →</Link>;

  return (
    <PerfilLayout
      estado={estado}
      montar={(d) => {
        const g = d.gerente;
        const resp = d.chamadosRespondidos ?? {};
        return {
          cabecalho: {
            role: "gerente",
            foto: g.fotoGerente,
            nome: g.nomeGerente,
            sobretitulo: "Gerente",
            subtitulo: [g.crfGerente, g.matriculaGerente && `Matrícula ${g.matriculaGerente}`].filter(Boolean).join(" · "),
            meta: [
              ["pharmacy", <LinkPerfil key="f" tipo="farmacia" id={d.farmacia?.idFarmacia}>{d.farmacia?.nomeFarmacia || "Farmácia não informada"}</LinkPerfil>],
              g.emailGerente && ["mail", g.emailGerente],
              g.telGerente && ["phone", g.telGerente],
            ],
            acoes: podeTrocarFoto?.("gerente", g) && (
              <EnviarFoto
                tipo="gerente"
                id={g.idGerente}
                nome={g.nomeGerente}
                fotoAtual={g.fotoGerente}
                onAlterada={() => { estado.reload(); avisarDadosAlterados({ tipo: "gerente", id: g.idGerente }); }}
              />
            ),
          },
          periodo: d.periodo,
          semPeriodo: ["estoque"],
          abas: [
            ["geral", "Visão geral", () => (
              <>
                <Kpis>
                  <CardNumero
                    titulo="Chamados respondidos"
                    valor={numero(resp.total)}
                    icone="check"
                    detalhe={`${numero(resp.aceitos)} aceitos · ${numero(resp.recusados)} recusados`}
                  />
                  <CardNumero titulo="Tempo médio de resposta" valor={formatarMinutos(resp.tempoMedioRespostaMin)} icone="clock" />
                  <CardNumero
                    titulo="Pendentes agora"
                    valor={numero(resp.pendentesAgora)}
                    icone="ticket"
                    acao={resp.pendentesAgora > 0 && plataforma === "gerente" && (
                      <Link className="perfil-link" to="/gerente/chamados">Ver chamados →</Link>
                    )}
                  />
                  <CardNumero titulo="Serviços da farmácia" valor={numero(d.servicosDaFarmacia?.total)} variacao={d.servicosDaFarmacia?.variacao} icone="clipboard" />
                </Kpis>
                <Grade>
                  <GraficoServicos bloco={d.servicosDaFarmacia} periodo={d.periodo} titulo="Atendimentos da farmácia" />
                  <EstoqueAtencao estoque={d.estoque} acao={linkEstoque} largo />
                </Grade>
              </>
            )],
            ["equipe", "Equipe", () => <AbaEquipe equipe={d.equipe} />, numero(d.equipe?.total)],
            ["estoque", "Estoque", () => <AbaEstoque estoque={d.estoque} link={linkEstoque} />],
            ["servicos", "Serviços", () => <AbaServicos bloco={d.servicosDaFarmacia} periodo={d.periodo} />],
            ["chamados", "Chamados", () => <AbaChamados bloco={d.chamadosDaFarmacia} periodo={d.periodo} />],
            ["rede", "Rede", () => (
              <>
                <p className="perfil-nota">Pedidos entre a farmácia dele e o restante da rede no período.</p>
                <AbaRede rede={d.rede} />
              </>
            )],
            ["detalhes", "Detalhes", () => (
              <Grade>
                <Secao titulo="Dados cadastrais">
                  <Detalhes itens={[
                    ["CPF", g.cpfGerente],
                    ["CRF", g.crfGerente],
                    ["Matrícula", g.matriculaGerente],
                    ["Farmácia", <LinkPerfil key="f" tipo="farmacia" id={d.farmacia?.idFarmacia}>{d.farmacia?.nomeFarmacia}</LinkPerfil>],
                    ["Cadastrado por", d.cadastradoPor?.nomeAdmin],
                    ["Desde", g.createdAtGerente ? formatarDataChamado(g.createdAtGerente) : null],
                  ]} />
                </Secao>
                <Secao titulo="Contato">
                  <Detalhes itens={[
                    ["E-mail", g.emailGerente],
                    ["Telefone", g.telGerente],
                    ["Endereço", endereco(g, "Gerente")],
                  ]} />
                </Secao>
                <Secao titulo="Cadastros feitos por ele" largo>
                  <Detalhes itens={[
                    ["Funcionários", numero(d.cadastradosPorEle?.funcionarios)],
                    ["Itens de estoque", numero(d.cadastradosPorEle?.itensEstoque)],
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
