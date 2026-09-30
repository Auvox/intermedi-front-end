import { useState } from "react";
import CardNumero from "./CardNumero";
import ListaCompacta from "./ListaCompacta";
import ManagerIcon from "../ManagerIcon";
import { usePerfil } from "./perfilContext";
import { AbaServicos, Detalhes, GraficoServicos, Grade, Kpis, PerfilLayout, Secao, TopRemedios } from "./Blocos";
import { usePerfilDados } from "../../hooks/useResumo";
import { formatarDataChamado, tempoDesde } from "../../services/chamados";
import { endereco, mascararCpf, numero } from "../../services/perfil";

export default function PerfilPaciente({ id }) {
  const { abrirPerfil } = usePerfil();
  const [mostrarCpf, setMostrarCpf] = useState(false);
  const estado = usePerfilDados("paciente", id, (d) => d.paciente?.nomePaciente);

  return (
    <PerfilLayout
      estado={estado}
      montar={(d) => {
        const p = d.paciente;
        const geral = d.totaisGerais ?? {};
        const cpf = (
          <>
            CPF <span aria-live="polite">{mostrarCpf ? p.cpfPaciente : mascararCpf(p.cpfPaciente)}</span>{" "}
            <button type="button" className="perfil-link" aria-pressed={mostrarCpf} onClick={() => setMostrarCpf((v) => !v)}>
              {mostrarCpf ? "ocultar" : "mostrar"}
            </button>
          </>
        );
        return {
          cabecalho: {
            role: "paciente",
            foto: p.fotoPerfilPaciente,
            nome: p.nomePaciente,
            sobretitulo: "Paciente",
            subtitulo: p.medicamentoFrequentePaciente && `Medicamento frequente: ${p.medicamentoFrequentePaciente}`,
            meta: [
              ["id", cpf],
              p.telPaciente && ["phone", p.telPaciente],
              p.emailPaciente && ["mail", p.emailPaciente],
              geral.primeiroAtendimento && ["calendar", `Cliente desde ${formatarDataChamado(geral.primeiroAtendimento).slice(0, 10)}`],
            ],
          },
          periodo: d.periodo,
          semPeriodo: ["farmacias"],
          abas: [
            ["geral", "Visão geral", () => (
              <>
                <Kpis>
                  <CardNumero titulo="Atendimentos no período" valor={numero(d.servicos.total)} variacao={d.servicos.variacao} icone="clipboard" />
                  <CardNumero titulo="Unidades recebidas" valor={numero(d.servicos.unidadesEntregues)} icone="pill" />
                  <CardNumero
                    titulo="Atendimentos no total"
                    valor={numero(geral.servicos)}
                    icone="heart"
                    detalhe={geral.primeiroAtendimento && `desde ${formatarDataChamado(geral.primeiroAtendimento).slice(0, 10)}`}
                  />
                  <CardNumero
                    titulo="Último atendimento"
                    valor={geral.ultimoAtendimento ? tempoDesde(geral.ultimoAtendimento) : "—"}
                    icone="clock"
                    detalhe={geral.ultimoAtendimento && formatarDataChamado(geral.ultimoAtendimento)}
                  />
                </Kpis>
                <Grade>
                  <GraficoServicos bloco={d.servicos} periodo={d.periodo} />
                  <TopRemedios bloco={d.servicos} titulo="Remédios que mais recebe" />
                </Grade>
              </>
            )],
            ["atendimentos", "Remédios e atendimentos", () => <AbaServicos bloco={d.servicos} periodo={d.periodo} />, numero(d.servicos.total)],
            ["farmacias", "Farmácias", () => (
              <Grade>
                <Secao titulo="Farmácias onde é atendido" descricao="Todo o histórico do paciente" largo>
                  <ListaCompacta
                    rotulo="Farmácias onde é atendido"
                    vazio="Ainda não foi atendido em nenhuma farmácia."
                    itens={(d.farmacias ?? []).map((f) => ({
                      chave: f.idFarmacia,
                      inicio: <span className="perfil-lista-icone"><ManagerIcon name="pharmacy" size={16} /></span>,
                      titulo: f.nomeFarmacia,
                      subtitulo: `Último atendimento ${tempoDesde(f.ultimoAtendimento)}`,
                      lateral: `${numero(f.atendimentos)} ${f.atendimentos === 1 ? "atendimento" : "atendimentos"}`,
                      rotulo: `Abrir perfil da ${f.nomeFarmacia}`,
                      onAbrir: () => abrirPerfil("farmacia", f.idFarmacia),
                    }))}
                  />
                </Secao>
              </Grade>
            ), numero(d.farmacias?.length)],
            ["detalhes", "Detalhes", () => (
              <Grade>
                <Secao titulo="Dados cadastrais">
                  <Detalhes itens={[
                    ["Nome", p.nomePaciente],
                    ["CPF", cpf],
                    ["Medicamento frequente", p.medicamentoFrequentePaciente],
                    ["Cadastrado em", p.createdAtPaciente ? formatarDataChamado(p.createdAtPaciente) : null],
                  ]} />
                </Secao>
                <Secao titulo="Contato">
                  <Detalhes itens={[
                    ["E-mail", p.emailPaciente],
                    ["Telefone", p.telPaciente],
                    ["Endereço", endereco(p, "Paciente")],
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
