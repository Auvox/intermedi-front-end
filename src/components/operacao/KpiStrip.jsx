import ManagerIcon from "../ManagerIcon";
import { VALIDADE_ALERTA_DIAS } from "../../services/operacao";
import { numero } from "../../services/perfil";

// Indicadores da unidade em volta da cena. Cada cartão leva à parte da cena
// (ou à lista) de onde o número vem.
export default function KpiStrip({ operacao, onAbrir }) {
  const { kpis, indicador } = operacao;
  const abaixo = kpis.estoque.criticos + kpis.estoque.zerados;
  const alertasValidade = kpis.validade.vencidos + kpis.validade.vencendo;
  const cartoes = [
    {
      id: "estoque",
      icone: "box",
      rotulo: "Estoque",
      valor: numero(kpis.estoque.itens),
      unidade: kpis.estoque.itens === 1 ? "item" : "itens",
      detalhe: `${numero(kpis.estoque.unidades)} un. · ${abaixo ? `${abaixo} abaixo do mínimo` : "nenhum abaixo do mínimo"}`,
      tom: abaixo ? "orange" : "green",
    },
    {
      id: "equipe",
      icone: "people",
      rotulo: "Funcionários",
      valor: numero(kpis.equipe.noTurno),
      unidade: "no turno agora",
      detalhe: `de ${kpis.equipe.total} na equipe da unidade`,
      tom: kpis.equipe.noTurno ? "green" : "neutral",
    },
    {
      id: "chamados",
      icone: "ticket",
      rotulo: "Chamados",
      valor: numero(kpis.chamados.pendentes),
      unidade: kpis.chamados.pendentes === 1 ? "pendente" : "pendentes",
      detalhe: `${kpis.chamados.prioritarios} alta/urgente · ${kpis.chamados.emAndamento} em andamento`,
      tom: kpis.chamados.prioritarios ? "red" : kpis.chamados.pendentes ? "yellow" : "green",
    },
    {
      id: "alertas",
      icone: "clock",
      rotulo: "Alertas de validade",
      valor: numero(alertasValidade),
      unidade: alertasValidade === 1 ? "lote" : "lotes",
      detalhe: `${kpis.validade.vencidos} vencidos · ${kpis.validade.vencendo} vencem em até ${VALIDADE_ALERTA_DIAS} dias`,
      tom: kpis.validade.vencidos ? "red" : alertasValidade ? "yellow" : "green",
    },
    {
      id: "operacao",
      icone: "check",
      rotulo: "Operação",
      valor: indicador.valor,
      unidade: "/ 100",
      detalhe: `Indicador geral · ${indicador.label}`,
      tom: indicador.tone,
    },
  ];
  return (
    <div className="op-kpis" role="group" aria-label="Indicadores da unidade">
      {cartoes.map((c) => (
        <button key={c.id} type="button" className={`op-kpi op-tom-${c.tom}`} onClick={() => onAbrir(c.id)}>
          <span className="op-kpi-topo">
            <span className="op-kpi-icone"><ManagerIcon name={c.icone} size={18} /></span>
            {c.rotulo}
          </span>
          <span className="op-kpi-valor">
            <strong>{c.valor}</strong> <small>{c.unidade}</small>
          </span>
          <span className="op-kpi-detalhe">{c.detalhe}</span>
        </button>
      ))}
    </div>
  );
}
