import CardNumero from "./CardNumero";
import EnviarFoto from "./EnviarFoto";
import { usePerfil } from "./perfilContext";
import {
  AbaChamados,
  AbaServicos,
  Detalhes,
  GraficoServicos,
  Grade,
  Kpis,
  LinkPerfil,
  PerfilLayout,
  Secao,
  TopRemedios,
  UltimosChamados,
} from "./Blocos";
import { avisarDadosAlterados, usePerfilDados } from "../../hooks/useResumo";
import { formatarDataChamado } from "../../services/chamados";
import { endereco, numero, quando, turno } from "../../services/perfil";

export default function PerfilFuncionario({ id }) {
  const { podeTrocarFoto } = usePerfil();
  const estado = usePerfilDados("funcionario", id, (d) => d.funcionario?.nomeFuncionario);

  return (
    <PerfilLayout
      estado={estado}
      montar={(d) => {
        const f = d.funcionario;
        return {
          cabecalho: {
            role: "funcionario",
            foto: f.fotoFuncionario,
            nome: f.nomeFuncionario,
            sobretitulo: "Funcionário",
            subtitulo: [f.cargoFuncionario, turno(f.turnoFuncionario)].filter(Boolean).join(" · "),
            meta: [
              ["pharmacy", <LinkPerfil key="f" tipo="farmacia" id={f.fkIdFarmacia}>{f.nomeFarmacia || "Farmácia não informada"}</LinkPerfil>],
              f.matriculaFuncionario && ["id", `Matrícula ${f.matriculaFuncionario}`],
              f.emailFuncionario && ["mail", f.emailFuncionario],
              f.telFuncionario && ["phone", f.telFuncionario],
            ],
            acoes: podeTrocarFoto?.("funcionario", f) && (
              <EnviarFoto
                tipo="funcionario"
                id={f.idFuncionario}
                nome={f.nomeFuncionario}
                fotoAtual={f.fotoFuncionario}
                onAlterada={() => { estado.reload(); avisarDadosAlterados({ tipo: "funcionario", id: f.idFuncionario }); }}
              />
            ),
          },
          periodo: d.periodo,
          abas: [
            ["geral", "Visão geral", () => (
              <>
                <Kpis>
                  <CardNumero titulo="Serviços realizados" valor={numero(d.servicos.total)} variacao={d.servicos.variacao} icone="clipboard" />
                  <CardNumero titulo="Pacientes atendidos" valor={numero(d.servicos.pacientesAtendidos)} icone="heart" />
                  <CardNumero titulo="Unidades entregues" valor={numero(d.servicos.unidadesEntregues)} icone="pill" />
                  <CardNumero titulo="Chamados abertos" valor={numero(d.chamados.total)} variacao={d.chamados.variacao} icone="ticket" />
                </Kpis>
                <Grade>
                  <GraficoServicos bloco={d.servicos} periodo={d.periodo} />
                  <TopRemedios bloco={d.servicos} />
                  <UltimosChamados bloco={d.chamados} titulo="Últimos chamados abertos por ele" />
                </Grade>
              </>
            )],
            ["servicos", "Serviços", () => <AbaServicos bloco={d.servicos} periodo={d.periodo} />, numero(d.servicos.total)],
            ["chamados", "Chamados", () => <AbaChamados bloco={d.chamados} periodo={d.periodo} />, numero(d.chamados.total)],
            ["detalhes", "Detalhes", () => (
              <Grade>
                <Secao titulo="Dados cadastrais">
                  <Detalhes itens={[
                    ["CPF", f.cpfFuncionario],
                    ["Matrícula", f.matriculaFuncionario],
                    ["Cargo", f.cargoFuncionario],
                    ["Turno", turno(f.turnoFuncionario)],
                    ["Farmácia", <LinkPerfil key="f" tipo="farmacia" id={f.fkIdFarmacia}>{f.nomeFarmacia}</LinkPerfil>],
                    ["Cadastrado por", d.cadastradoPor && <LinkPerfil key="g" tipo="gerente" id={d.cadastradoPor.idGerente}>{d.cadastradoPor.nomeGerente}</LinkPerfil>],
                    ["Desde", f.createdAtFuncionario ? formatarDataChamado(f.createdAtFuncionario) : null],
                  ]} />
                </Secao>
                <Secao titulo="Contato">
                  <Detalhes itens={[
                    ["E-mail", f.emailFuncionario],
                    ["Telefone", f.telFuncionario],
                    ["Endereço", endereco(f, "Funcionario")],
                  ]} />
                </Secao>
                <Secao titulo="Histórico completo" descricao="Desde o cadastro, sem filtro de período" largo>
                  <Detalhes itens={[
                    ["Serviços", numero(d.totaisGerais?.servicos)],
                    ["Chamados", numero(d.totaisGerais?.chamados)],
                    ["Último serviço", quando(d.totaisGerais?.ultimoServico)],
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
