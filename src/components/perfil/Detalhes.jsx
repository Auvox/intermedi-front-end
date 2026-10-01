import ListaCompacta from "./ListaCompacta";
import { usePerfil } from "./perfilContext";
import { Detalhes, Grade, LinkPerfil, PerfilLayout, Secao } from "./Blocos";
import {
  AcompanhamentoRemedios,
  HistoricoPedidos,
  PrioridadeBadge,
  ProgressoChamado,
  RespostaChamado,
  StatusChamadoBadge,
  StatusPedidoBadge,
} from "../Chamados";
import { FotoRemedio, TarjaBadge } from "../Remedios";
import { RastreioEntrega } from "../Rastreio";
import { usePerfilDados } from "../../hooks/useResumo";
import { perspectivaDe, useAtualizacaoPeriodica } from "../../hooks/useRastreio";
import { emAndamento, itemDoPedido, pedidosDoChamadoParaRastrear } from "../../services/rastreio";
import { formatarDataChamado, tempoDesde } from "../../services/chamados";
import { numero, turno } from "../../services/perfil";

// GET /chamado/:id
export function DetalheChamado({ id }) {
  const { abrirPerfil, idFarmaciaAtual } = usePerfil();
  const estado = usePerfilDados("chamado", id, (c) => `Chamado #${c.idChamado}`);
  // acompanha a entrega sozinho enquanto houver remédio pedido ou a caminho
  const rastreaveis = estado.data ? pedidosDoChamadoParaRastrear(estado.data) : [];
  useAtualizacaoPeriodica(rastreaveis.some(emAndamento) || estado.data?.status === "pendente", estado.atualizar);
  return (
    <PerfilLayout
      estado={estado}
      montar={(c) => {
        // uma entrega por remédio (o último pedido de cada um)
        const abaRastreio = () => ["rastreio", "Rastreamento", () => (
          <div className="perfil-rastreios">
            {rastreaveis.map((p) => (
              <RastreioEntrega
                key={p.idRedistribuicao}
                pedido={p}
                perspectiva={perspectivaDe(p, idFarmaciaAtual)}
                onAbrir={(el) => abrirPerfil("pedido", p.idRedistribuicao, el)}
              />
            ))}
          </div>
        ), numero(rastreaveis.length)];
        return {
        cabecalho: {
          icone: "ticket",
          nome: c.titulo,
          sobretitulo: `Chamado #${c.idChamado}`,
          selos: <><StatusChamadoBadge status={c.status} /><PrioridadeBadge prioridade={c.prioridade} /></>,
          meta: [
            ["calendar", `Aberto em ${formatarDataChamado(c.dataAbertura)}`],
            ["user", <LinkPerfil key="f" tipo="funcionario" id={c.funcionario?.idFuncionario}>{c.funcionario?.nomeFuncionario}</LinkPerfil>],
            ["pharmacy", <LinkPerfil key="fa" tipo="farmacia" id={c.farmacia?.idFarmacia}>{c.farmacia?.nomeFarmacia}</LinkPerfil>],
          ],
        },
        abas: [
          rastreaveis.length > 0 && c.status === "em_andamento" && abaRastreio(),
          ["resumo", "Resumo", () => (
            <Grade>
              <Secao titulo="Solicitação">
                {c.descricao ? <p className="perfil-texto">{c.descricao}</p> : <p className="perfil-vazio">Sem descrição.</p>}
                <Detalhes itens={[
                  ["Funcionário", <LinkPerfil key="f" tipo="funcionario" id={c.funcionario?.idFuncionario}>{c.funcionario?.nomeFuncionario}</LinkPerfil>],
                  ["Cargo / turno", [c.funcionario?.cargoFuncionario, turno(c.funcionario?.turnoFuncionario)].filter(Boolean).join(" · ")],
                  ["Farmácia", <LinkPerfil key="fa" tipo="farmacia" id={c.farmacia?.idFarmacia}>{c.farmacia?.nomeFarmacia}</LinkPerfil>],
                  ["Aberto em", formatarDataChamado(c.dataAbertura)],
                ]} />
              </Secao>
              <Secao titulo="Resposta do gerente">
                <RespostaChamado chamado={c} />
                {c.status === "pendente" && <p className="perfil-vazio">Aguardando resposta do gerente.</p>}
              </Secao>
            </Grade>
          )],
          ["remedios", "Remédios", () => (
            <Grade>
              <Secao titulo="Acompanhamento dos remédios" largo>
                {!["pendente", "recusado", "cancelado"].includes(c.status) && <ProgressoChamado chamado={c} />}
                <AcompanhamentoRemedios chamado={c} linhaDoTempo onAbrirRemedio={(idRemedio) => abrirPerfil("remedio", idRemedio)} />
              </Secao>
            </Grade>
          ), numero(c.remedios?.length)],
          rastreaveis.length > 0 && c.status !== "em_andamento" && abaRastreio(),
          c.pedidos?.length > 0 && ["pedidos", "Pedidos à rede", () => (
            <Grade>
              <Secao titulo="Pedidos a outras farmácias" largo>
                <HistoricoPedidos pedidos={c.pedidos} />
              </Secao>
            </Grade>
          ), numero(c.pedidos.length)],
        ].filter(Boolean),
        };
      }}
    />
  );
}

// GET /servicos/:id
export function DetalheServico({ id }) {
  const { abrirPerfil } = usePerfil();
  const estado = usePerfilDados("servico", id, (s) => `Serviço nº ${s.idServico}`);
  return (
    <PerfilLayout
      estado={estado}
      montar={(s) => ({
        cabecalho: {
          icone: "clipboard",
          nome: `Serviço nº ${s.idServico}`,
          sobretitulo: "Atendimento",
          subtitulo: `${numero(s.totalMedicamentos)} ${s.totalMedicamentos === 1 ? "remédio" : "remédios"} · ${numero(s.quantidadeTotal)} unidades entregues`,
          meta: [
            ["calendar", formatarDataChamado(s.dataServico)],
            ["heart", <LinkPerfil key="p" tipo="paciente" id={s.idPaciente}>{s.nomePaciente}</LinkPerfil>],
            ["user", <LinkPerfil key="f" tipo="funcionario" id={s.idFuncionario}>{s.nomeFuncionario}</LinkPerfil>],
            ["pharmacy", <LinkPerfil key="fa" tipo="farmacia" id={s.idFarmacia}>{s.nomeFarmacia}</LinkPerfil>],
          ],
        },
        abas: [
          ["remedios", "Remédios entregues", () => (
            <Grade>
              <Secao titulo="Remédios entregues" largo>
                <ListaCompacta
                  rotulo="Remédios entregues"
                  itens={(s.remedios ?? []).map((r) => ({
                    chave: r.idRemedio,
                    inicio: <FotoRemedio foto={r.fotoRemedio} nome={r.nomeRemedio} />,
                    titulo: [r.nomeRemedio, r.dosagemRemedio].filter(Boolean).join(" "),
                    subtitulo: <><TarjaBadge valor={r.tarjaRemedio} /> {[r.fabricanteRemedio, r.categorias].filter(Boolean).join(" · ")}</>,
                    lateral: `${numero(r.quantidade)} un.`,
                    rotulo: `Abrir perfil de ${r.nomeRemedio}`,
                    onAbrir: () => abrirPerfil("remedio", r.idRemedio),
                  }))}
                />
              </Secao>
            </Grade>
          ), numero(s.remedios?.length)],
          ["resumo", "Detalhes", () => (
            <Grade>
              <Secao titulo="Dados do atendimento" largo>
                <Detalhes itens={[
                  ["Paciente", <LinkPerfil key="p" tipo="paciente" id={s.idPaciente}>{s.nomePaciente}</LinkPerfil>],
                  ["Funcionário", <LinkPerfil key="f" tipo="funcionario" id={s.idFuncionario}>{s.nomeFuncionario}</LinkPerfil>],
                  ["Farmácia", <LinkPerfil key="fa" tipo="farmacia" id={s.idFarmacia}>{s.nomeFarmacia}</LinkPerfil>],
                  ["Data", formatarDataChamado(s.dataServico)],
                  ["Observação", s.observacao],
                ]} />
              </Secao>
            </Grade>
          )],
        ],
      })}
    />
  );
}

// GET /redistribuicao/:id
export function DetalhePedido({ id }) {
  const { idFarmaciaAtual } = usePerfil();
  const estado = usePerfilDados("pedido", id, (p) => `Pedido #${p.idRedistribuicao}`);
  useAtualizacaoPeriodica(Boolean(estado.data && emAndamento(estado.data)), estado.atualizar);
  return (
    <PerfilLayout
      estado={estado}
      montar={(p) => ({
        cabecalho: {
          icone: "truck",
          nome: itemDoPedido(p),
          sobretitulo: `Pedido à rede #${p.idRedistribuicao}`,
          subtitulo: `${p.nomeFarmaciaOrigem} → ${p.nomeFarmaciaDestino}`,
          selos: <><StatusPedidoBadge status={p.status} /><TarjaBadge valor={p.tarjaRemedio} /></>,
          meta: [
            ["calendar", `Solicitado ${tempoDesde(p.dataSolicitacao)}`],
            ["pill", <LinkPerfil key="r" tipo="remedio" id={p.idRemedio}>{`Ver ${p.nomeRemedio}`}</LinkPerfil>],
            p.idChamado && ["ticket", <LinkPerfil key="c" tipo="chamado" id={p.idChamado}>{`Chamado #${p.idChamado}`}</LinkPerfil>],
          ],
        },
        abas: [
          ["rastreio", "Rastreamento", () => (
            <div className="perfil-rastreios">
              <RastreioEntrega pedido={p} perspectiva={perspectivaDe(p, idFarmaciaAtual)} />
            </div>
          )],
          ["resumo", "Detalhes", () => (
            <Grade>
              <Secao titulo="Farmácias e gerentes">
                <Detalhes itens={[
                  ["Fornecedora", <LinkPerfil key="o" tipo="farmacia" id={p.idFarmaciaOrigem}>{p.nomeFarmaciaOrigem}</LinkPerfil>],
                  ["Solicitante", <LinkPerfil key="d" tipo="farmacia" id={p.idFarmaciaDestino}>{p.nomeFarmaciaDestino}</LinkPerfil>],
                  ["Pedido por", <LinkPerfil key="gs" tipo="gerente" id={p.idGerenteSolicitante}>{p.nomeGerenteSolicitante}</LinkPerfil>],
                  p.idGerenteResposta && ["Respondido por", <LinkPerfil key="gr" tipo="gerente" id={p.idGerenteResposta}>{p.nomeGerenteResposta}</LinkPerfil>],
                  p.idChamado && ["Chamado", <LinkPerfil key="c" tipo="chamado" id={p.idChamado}>{`#${p.idChamado}`}</LinkPerfil>],
                ]} />
              </Secao>
              <Secao titulo="Linha do tempo">
                <Detalhes itens={[
                  ["Remédio", <LinkPerfil key="r" tipo="remedio" id={p.idRemedio}>{`${p.quantidade}× ${[p.nomeRemedio, p.dosagemRemedio].filter(Boolean).join(" ")}`}</LinkPerfil>],
                  ["Solicitado em", formatarDataChamado(p.dataSolicitacao)],
                  p.dataEnvio && ["Enviado em", formatarDataChamado(p.dataEnvio)],
                  p.dataRecebimento && ["Entregue em", formatarDataChamado(p.dataRecebimento)],
                  p.dataRecusa && ["Recusado em", formatarDataChamado(p.dataRecusa)],
                  p.motivoRecusa && ["Motivo da recusa", p.motivoRecusa],
                ]} />
              </Secao>
            </Grade>
          )],
        ],
      })}
    />
  );
}
