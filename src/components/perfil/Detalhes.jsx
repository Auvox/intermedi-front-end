import { usePerfil } from "./perfilContext";
import { Detalhes, Grade, LinkPerfil, PerfilLayout, Secao } from "./Blocos";
import { StatusPedidoBadge } from "../Chamados";
import { TarjaBadge } from "../Remedios";
import { RastreioEntrega } from "../Rastreio";
import { usePerfilDados } from "../../hooks/useResumo";
import { perspectivaDe, useAtualizacaoPeriodica } from "../../hooks/useRastreio";
import { emAndamento, itemDoPedido } from "../../services/rastreio";
import { formatarDataChamado, tempoDesde } from "../../services/chamados";

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
