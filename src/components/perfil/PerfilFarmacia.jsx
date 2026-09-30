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
  PerfilLayout,
  Secao,
  TopRemedios,
} from "./Blocos";
import { avisarDadosAlterados, usePerfilDados } from "../../hooks/useResumo";
import { endereco, numero } from "../../services/perfil";

export default function PerfilFarmacia({ id }) {
  const { podeTrocarFoto, plataforma } = usePerfil();
  const estado = usePerfilDados("farmacia", id, (d) => d.farmacia?.nomeFarmacia);
  const linkEstoque = plataforma === "gerente" && <Link className="perfil-link" to="/gerente/remedios">Estoque completo →</Link>;

  return (
    <PerfilLayout
      estado={estado}
      montar={(d) => {
        const f = d.farmacia;
        return {
          cabecalho: {
            role: "farmacia",
            foto: f.fotoFarmacia,
            nome: f.nomeFarmacia,
            sobretitulo: "Farmácia da rede",
            subtitulo: f.cnesFarmacia && `CNES ${f.cnesFarmacia}`,
            meta: [
              endereco(f, "Farmacia") && ["map", endereco(f, "Farmacia")],
              f.telFarmacia && ["phone", f.telFarmacia],
              f.emailFarmacia && ["mail", f.emailFarmacia],
            ],
            acoes: podeTrocarFoto?.("farmacia", f) && (
              <EnviarFoto
                tipo="farmacia"
                id={f.idFarmacia}
                nome={f.nomeFarmacia}
                fotoAtual={f.fotoFarmacia}
                onAlterada={() => { estado.reload(); avisarDadosAlterados({ tipo: "farmacia", id: f.idFarmacia }); }}
              />
            ),
          },
          periodo: d.periodo,
          semPeriodo: ["estoque"],
          abas: [
            ["geral", "Visão geral", () => (
              <>
                <Kpis>
                  <CardNumero titulo="Serviços" valor={numero(d.servicos.total)} variacao={d.servicos.variacao} icone="clipboard" />
                  <CardNumero titulo="Pacientes atendidos" valor={numero(d.servicos.pacientesAtendidos)} icone="heart" />
                  <CardNumero titulo="Unidades entregues" valor={numero(d.servicos.unidadesEntregues)} icone="pill" />
                  <CardNumero titulo="Chamados" valor={numero(d.chamados.total)} variacao={d.chamados.variacao} icone="ticket" />
                </Kpis>
                <Grade>
                  <GraficoServicos bloco={d.servicos} periodo={d.periodo} />
                  <TopRemedios bloco={d.servicos} />
                  <EstoqueAtencao estoque={d.estoque} acao={linkEstoque} />
                </Grade>
              </>
            )],
            ["equipe", "Equipe", () => <AbaEquipe equipe={d.funcionarios} gerentes={d.gerentes} />, numero((d.funcionarios?.total ?? 0) + (d.gerentes?.length ?? 0))],
            ["estoque", "Estoque", () => <AbaEstoque estoque={d.estoque} link={linkEstoque} />, numero(d.estoque?.totalItens)],
            ["servicos", "Serviços", () => <AbaServicos bloco={d.servicos} periodo={d.periodo} />],
            ["chamados", "Chamados", () => <AbaChamados bloco={d.chamados} periodo={d.periodo} />],
            ["rede", "Rede", () => <AbaRede rede={d.rede} />],
            ["detalhes", "Detalhes", () => (
              <Grade>
                <Secao titulo="Dados da unidade" largo>
                  <Detalhes itens={[
                    ["Nome", f.nomeFarmacia],
                    ["CNES", f.cnesFarmacia],
                    ["Telefone", f.telFarmacia],
                    ["E-mail", f.emailFarmacia],
                    ["Endereço", endereco(f, "Farmacia")],
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
