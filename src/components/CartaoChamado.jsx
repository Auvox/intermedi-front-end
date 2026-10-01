import { PrioridadeBadge, SituacaoItemBadge } from "./Chamados";
import { LinhaRastreavel, RastreioMini } from "./Rastreio";
import { propsLinha } from "../services/perfil";
import { formatarDataChamado, statusChamado } from "../services/chamados";
import { etapasDoProcesso, protocoloDoChamado } from "../services/relatorio";

// Um chamado da lista, no mesmo formato do relatório: protocolo, carimbo de status,
// linha do processo, itens e a decisão. Clicar abre o relatório completo.
export default function CartaoChamado({ chamado: c, onAbrir }) {
  const { label, tone } = statusChamado(c.status);
  const protocolo = protocoloDoChamado(c);
  const pedidosPorId = new Map((c.pedidos ?? []).map((p) => [p.idRedistribuicao, p]));
  const etapas = etapasDoProcesso(c);
  const resposta = c.resposta;
  return (
    <article
      {...propsLinha((el) => onAbrir(c, el), `Abrir relatório do chamado ${protocolo}: ${c.titulo}`)}
      className={`perfil-linha cartao-chamado cartao-${tone}`}
    >
      <header className="cartao-topo">
        <span className="cartao-protocolo rel-mono">{protocolo}</span>
        <span className="cartao-data">Aberto em {formatarDataChamado(c.dataAbertura)} · {c.farmacia?.nomeFarmacia}</span>
        <span className={`cartao-carimbo rel-${tone}`}>{label}</span>
      </header>

      <div className="cartao-titulo">
        <h3>{c.titulo}</h3>
        <PrioridadeBadge prioridade={c.prioridade} />
      </div>

      <ol className="cartao-processo" aria-label="Andamento do chamado">
        {etapas.map((e) => (
          <li key={e.id} className={e.situacao} aria-current={e.situacao === "atual" ? "step" : undefined}>
            <span aria-hidden="true" />
            <strong>{e.titulo}</strong>
            {e.quando && <small>{e.quando}</small>}
          </li>
        ))}
      </ol>

      <div className="rel-tabela cartao-itens">
        <table>
          <thead>
            <tr><th scope="col">Remédio</th><th scope="col" className="rel-num">Qtd.</th><th scope="col">Fornecedora</th><th scope="col">Situação</th></tr>
          </thead>
          <tbody>
            {(c.remedios ?? []).map((r) => {
              const p = r.pedidoAtual;
              const completo = p && pedidosPorId.get(p.idRedistribuicao);
              return (
                <LinhaRastreavel key={r.idRemedio} colSpan={4} pedido={["a_caminho", "recebido"].includes(r.situacao) ? completo : null} celulas={(botao) => (<>
                  <td><strong>{[r.nomeRemedio, r.dosagemRemedio].filter(Boolean).join(" ")}</strong></td>
                  <td className="rel-num">{r.quantidadeSolicitada} un.</td>
                  <td>{p?.nomeFarmaciaFornecedora && r.situacao !== "sem_fornecedor" ? p.nomeFarmaciaFornecedora : "—"}</td>
                  <td>
                    {r.situacao ? <SituacaoItemBadge situacao={r.situacao} /> : <span className="cartao-mudo">Aguardando o gerente</span>}
                    {r.situacao === "a_caminho" && completo && <div className="rel-mini"><RastreioMini pedido={completo} />{botao}</div>}
                    {r.situacao === "recebido" && p?.dataRecebimento && <small>Chegou em {formatarDataChamado(p.dataRecebimento, { ano: false })}</small>}
                    {r.situacao === "recebido" && completo && botao}
                  </td>
                </>)} />
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="cartao-rodape">
        <span className={`cartao-decisao ${c.status === "recusado" ? "recusado" : resposta ? "aceito" : "pendente"}`}>
          {resposta ? (
            <>
              <b aria-hidden="true">{c.status === "recusado" ? "✕" : "✓"}</b>
              {c.status === "recusado" ? "Recusado" : "Aceito"} por {resposta.nomeGerente} em {formatarDataChamado(resposta.dataResposta, { ano: false })}
              {resposta.respostaGerente && <em> — “{resposta.respostaGerente}”</em>}
            </>
          ) : c.status === "pendente" ? (
            <>Aguardando a decisão do gerente</>
          ) : (
            <>Sem decisão registrada</>
          )}
        </span>
        <span className="cartao-abrir" aria-hidden="true">Ver relatório →</span>
      </footer>
    </article>
  );
}
