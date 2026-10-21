import { CaixasInstanciadas } from "./Pecas";

// Caixas de remédio de todo o estoque em uma única malha instanciada.
// A quantidade de caixas de cada vão é proporcional a quantidade ÷ mínimo
// (cheio com o dobro do mínimo) e a cor indica a situação do item.
export default function MedicineBoxes({ caixas, onClick, onHover, onSair }) {
  return <CaixasInstanciadas itens={caixas} onClick={onClick} onHover={onHover} onSair={onSair} />;
}
