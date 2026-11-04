import { forwardRef } from "react";
import { ARVORES, FIM, FORNECEDORA, MUNDO, PLACAS, PRACAS, PREDIOS, ROTA, RUAS, SOLICITANTE, VAGAS } from "./geometria";

// Uma farmácia vista de cima: telhado verde com a cruz, toldo e porta na
// parede voltada para a estrada, e a etiqueta com o papel e o nome.
function Farmacia({ f, prefixo }) {
  const { x, y, largura: w, altura: h, porta } = f;
  const etiqueta = f.nome.length * 12.5 + 48;
  const cx = x + w / 2 + 12;
  const cy = y + h / 2;
  return (
    <g className="jx-farmacia">
      <rect className="jx-sombra" x={x + 10} y={y + 12} width={w} height={h} rx="18" />
      <rect className="jx-farmacia-base" x={x} y={y} width={w} height={h} rx="18" />
      <rect className="jx-farmacia-telhado" x={x + 44} y={y + 18} width={w - 62} height={h - 36} rx="12" />
      <path className="jx-cruz" d={`M ${cx - 13} ${cy - 39} h 26 v 26 h 26 v 26 h -26 v 26 h -26 v -26 h -26 v -26 h 26 Z`} />
      <rect className="jx-toldo" x={x + 16} y={y + 18} width="18" height={h - 36} rx="6" />
      <rect className="jx-porta" x={porta.x - 4} y={porta.y - 24} width="12" height="48" rx="4" />
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
// e o caminhão já entregou (estado final).
const Mundo = forwardRef(function Mundo(_props, ref) {
  return (
    <svg
      ref={ref}
      className="jx-mundo"
      viewBox={`0 0 ${MUNDO.largura} ${MUNDO.altura}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Ilustração: um caminhão sai da Farmácia Pedro João Neto com caixas de medicamentos, desce pelas ruas do bairro e entrega na Drogaria Bem Estar."
    >
      <rect className="jx-chao" x={-3000} y={-3000} width={MUNDO.largura + 6000} height={MUNDO.altura + 6000} />
      {PRACAS.map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} className="jx-praca" x={x} y={y} width={w} height={h} rx="40" />
      ))}

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

      {/* rota percorrida: revelada até onde o caminhão chegou */}
      <path className="jx-rota" d={ROTA} pathLength="1" data-j="rota" />
      <path className="jx-rota-medida" d={ROTA} data-j="rota-medida" />

      {/* entrega concluída, sobre o telhado da solicitante */}
      <g
        className="jx-entregue"
        data-j="entregue"
        transform={`translate(${SOLICITANTE.x + SOLICITANTE.largura / 2 + 12} ${SOLICITANTE.y + SOLICITANTE.altura / 2})`}
      >
        <circle r="46" />
        <path d="M -19 0 L -6 13 L 20 -14" />
      </g>

      {/* o caminhão, visto de cima, de frente para +x */}
      <g data-j="carrinho" transform={`translate(${FIM.x} ${FIM.y})`}>
        <g data-j="carrinho-giro" transform="rotate(90)">
          <rect className="jx-sombra" x="-56" y="-20" width="118" height="56" rx="10" />
          <rect className="jx-roda" x="-50" y="-33" width="18" height="9" rx="3" />
          <rect className="jx-roda" x="-28" y="-33" width="18" height="9" rx="3" />
          <rect className="jx-roda" x="30" y="-31" width="18" height="9" rx="3" />
          <rect className="jx-roda" x="-50" y="24" width="18" height="9" rx="3" />
          <rect className="jx-roda" x="-28" y="24" width="18" height="9" rx="3" />
          <rect className="jx-roda" x="30" y="22" width="18" height="9" rx="3" />
          <rect className="jx-carro" x="-62" y="-28" width="82" height="56" rx="8" />
          <rect className="jx-cacamba" x="-56" y="-22" width="70" height="44" rx="5" />
          <rect className="jx-cabine" x="22" y="-25" width="34" height="50" rx="11" />
          <rect className="jx-parabrisa" x="42" y="-17" width="9" height="34" rx="3" />
          {VAGAS.map(([vx, vy], i) => (
            <g key={vx} transform={`translate(${vx} ${vy})`}>
              <g className="jx-caixa" data-j="caixa" data-i={i}>
                <rect width="16" height="16" rx="3" />
                <path d="M 8 3.5 V 12.5 M 3.5 8 H 12.5" />
              </g>
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
});

export default Mundo;
