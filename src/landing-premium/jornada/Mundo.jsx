import { forwardRef } from "react";
import { ARVORES, FIM, FORNECEDORA, MUNDO, PLACAS, PREDIOS, ROTA, RUAS, SOLICITANTE, VAGAS } from "./geometria";

function Farmacia({ f, prefixo }) {
  const { x, y, largura: w, altura: h, porta } = f;
  const etiqueta = f.nome.length * 12.5 + 48;
  return (
    <g className="jx-farmacia">
      <rect className="jx-sombra" x={x + 10} y={y + 12} width={w} height={h} rx="16" />
      <rect className="jx-farmacia-base" x={x} y={y} width={w} height={h} rx="16" />
      <rect className="jx-farmacia-telhado" x={x + 18} y={y + 18} width={w - 36} height={h - 70} rx="10" />
      <path className="jx-cruz" d={`M ${x + w / 2 - 12} ${y + 40} h 24 v 22 h 22 v 24 h -22 v 22 h -24 v -22 h -22 v -24 h 22 Z`} />
      <rect className="jx-toldo" x={x + 18} y={y + h - 40} width={w - 36} height="22" rx="6" />
      <rect className="jx-porta" x={porta.x - 22} y={y + h - 14} width="44" height="14" rx="4" />
      <g className="jx-etiqueta" transform={`translate(${x + w / 2} ${y - 46})`} data-j={`${prefixo}-etiqueta`}>
        <rect x={-etiqueta / 2} y="-26" width={etiqueta} height="52" rx="26" />
        <text className="jx-etiqueta-papel" y="-5" textAnchor="middle">{f.papel}</text>
        <text className="jx-etiqueta-nome" y="15" textAnchor="middle">{f.nome}</text>
      </g>
    </g>
  );
}

// O mundo inteiro, em unidades do mundo. A câmera é o viewBox do <svg>, que
// useCameraVirtual muda a cada quadro; sem animação, o mundo aparece inteiro
// e o carrinho já entregou (estado final).
const Mundo = forwardRef(function Mundo(_props, ref) {
  return (
    <svg
      ref={ref}
      className="jx-mundo"
      viewBox={`0 0 ${MUNDO.largura} ${MUNDO.altura}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Ilustração: um carrinho sai da Farmácia Pedro João Neto com caixas de medicamentos, percorre as ruas do bairro e entrega na Drogaria Bem Estar."
    >
      <rect className="jx-chao" x={-2000} y={-2000} width={MUNDO.largura + 4000} height={MUNDO.altura + 4000} />
      <rect className="jx-praca" x="1460" y="1080" width="240" height="320" rx="40" />

      <g className="jx-ruas">
        {RUAS.map((d) => <path key={d} className="jx-rua-meiofio is-secundaria" d={d} />)}
        <path className="jx-rua-meiofio" d={ROTA} />
        {RUAS.map((d) => <path key={d} className="jx-rua is-secundaria" d={d} />)}
        <path className="jx-rua" d={ROTA} />
      </g>

      <g className="jx-predios">
        {PREDIOS.map(([x, y, w, h]) => (
          <g key={`${x}-${y}`}>
            <rect className="jx-sombra" x={x + 10} y={y + 12} width={w} height={h} rx="14" />
            <rect className="jx-predio" x={x} y={y} width={w} height={h} rx="14" />
            <rect className="jx-predio-telhado" x={x + 16} y={y + 16} width={w - 32} height={h - 32} rx="8" />
          </g>
        ))}
      </g>

      <g className="jx-arvores">
        {ARVORES.map(([x, y, r]) => (
          <g key={`${x}-${y}`}>
            <circle className="jx-sombra" cx={x + 5} cy={y + 7} r={r} />
            <circle className="jx-arvore" cx={x} cy={y} r={r} />
            <circle className="jx-arvore-miolo" cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.45} />
          </g>
        ))}
      </g>

      <g className="jx-placas">
        {PLACAS.map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <rect className="jx-placa-poste" x="-2" y="-2" width="4" height="22" rx="2" />
            <rect className="jx-placa" x="-11" y="-20" width="22" height="18" rx="4" />
          </g>
        ))}
      </g>

      <Farmacia f={FORNECEDORA} prefixo="forn" />
      <Farmacia f={SOLICITANTE} prefixo="sol" />

      {/* rota percorrida: revelada até onde o carrinho chegou */}
      <path className="jx-rota" d={ROTA} pathLength="1" data-j="rota" />
      <path className="jx-rota-medida" d={ROTA} data-j="rota-medida" />

      {/* entrega concluída */}
      <g className="jx-entregue" data-j="entregue" transform={`translate(${SOLICITANTE.porta.x} ${SOLICITANTE.y + 70})`}>
        <circle r="34" />
        <path d="M -14 0 L -4 10 L 15 -11" />
      </g>

      {/* o carrinho, visto de cima, de frente para +x */}
      <g data-j="carrinho" transform={`translate(${FIM.x} ${FIM.y})`}>
        <g data-j="carrinho-giro">
          <rect className="jx-sombra" x="-36" y="-14" width="84" height="44" rx="10" />
          <rect className="jx-roda" x="-30" y="-27" width="16" height="9" rx="3" />
          <rect className="jx-roda" x="16" y="-27" width="16" height="9" rx="3" />
          <rect className="jx-roda" x="-30" y="18" width="16" height="9" rx="3" />
          <rect className="jx-roda" x="16" y="18" width="16" height="9" rx="3" />
          <rect className="jx-carro" x="-42" y="-22" width="84" height="44" rx="10" />
          <rect className="jx-cabine" x="18" y="-22" width="24" height="44" rx="9" />
          <rect className="jx-parabrisa" x="24" y="-15" width="9" height="30" rx="3" />
          <rect className="jx-cacamba" x="-36" y="-16" width="52" height="32" rx="5" />
          {VAGAS.map(([vx, vy], i) => (
            <g key={vx} transform={`translate(${vx} ${vy})`}>
              <g className="jx-caixa" data-j="caixa" data-i={i}>
                <rect width="14" height="14" rx="2.5" />
                <path d="M 7 3 V 11 M 3 7 H 11" />
              </g>
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
});

export default Mundo;
