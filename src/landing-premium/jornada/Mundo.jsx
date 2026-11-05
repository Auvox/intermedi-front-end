import { forwardRef } from "react";
import { FIM, FORNECEDORA, MUNDO, PREDIOS, ROTA, RUAS, SOLICITANTE, VAGAS } from "./geometria";

// Uma farmácia vista de cima: ladrilho branco sobre uma sombra chapada, o
// bloco verde com a cruz, a porta na parede voltada para a estrada e a
// etiqueta com o papel (Fornecedora ou Solicitante).
function Farmacia({ f, prefixo }) {
  const { x, y, largura: w, altura: h, porta } = f;
  const etiqueta = f.papel.length * 13 + 56;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g className="jx-farmacia">
      <rect className="jx-farmacia-sombra" x={x + 16} y={y + 22} width={w} height={h} rx="34" />
      <rect className="jx-farmacia-base" x={x} y={y} width={w} height={h} rx="34" />
      <rect className="jx-farmacia-telhado" x={x + 14} y={y + 14} width={w - 28} height={h - 28} rx="24" />
      <path className="jx-cruz" d={`M ${cx - 15} ${cy - 45} h 30 v 30 h 30 v 30 h -30 v 30 h -30 v -30 h -30 v -30 h 30 Z`} />
      <rect className="jx-porta" x={porta.x - 6} y={porta.y - 26} width="20" height="52" rx="6" />
      <g className="jx-etiqueta" transform={`translate(${cx} ${y - 44})`} data-j={`${prefixo}-etiqueta`}>
        <rect x={-etiqueta / 2} y="-24" width={etiqueta} height="48" rx="24" />
        <text y="7" textAnchor="middle">{f.papel}</text>
      </g>
    </g>
  );
}

// O mundo inteiro, em unidades do mundo. A câmera é o viewBox do <svg>, que
// useCameraVirtual muda a cada quadro; sem animação, o mundo aparece inteiro
// e o caminhão já entregou (estado final). Cidade limpa: quadras claras e
// uma estrada só.
const Mundo = forwardRef(function Mundo(_props, ref) {
  return (
    <svg
      ref={ref}
      className="jx-mundo"
      viewBox={`0 0 ${MUNDO.largura} ${MUNDO.altura}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Ilustração: um caminhão sai da farmácia fornecedora com medicamentos, desce pela estrada do bairro e entrega na farmácia solicitante."
    >
      <rect className="jx-chao" x={-3000} y={-3000} width={MUNDO.largura + 6000} height={MUNDO.altura + 6000} />

      <g className="jx-predios">
        {PREDIOS.map(([x, y, w, h]) => <rect key={`${x}-${y}`} className="jx-predio" x={x} y={y} width={w} height={h} rx="30" />)}
      </g>

      <g className="jx-ruas">
        {RUAS.map((d) => <path key={d} className="jx-rua-meiofio" d={d} />)}
        <path className="jx-rua-meiofio" d={ROTA} />
        {RUAS.map((d) => <path key={d} className="jx-rua" d={d} />)}
        <path className="jx-rua" d={ROTA} />
      </g>

      <Farmacia f={FORNECEDORA} prefixo="forn" />
      <Farmacia f={SOLICITANTE} prefixo="sol" />

      {/* rota percorrida: revelada até onde o caminhão chegou */}
      <path className="jx-rota" d={ROTA} pathLength="1" data-j="rota" />
      <path className="jx-rota-medida" d={ROTA} data-j="rota-medida" />

      {/* entrega concluída, no lugar da cruz da solicitante */}
      <g
        className="jx-entregue"
        data-j="entregue"
        transform={`translate(${SOLICITANTE.x + SOLICITANTE.largura / 2} ${SOLICITANTE.y + SOLICITANTE.altura / 2})`}
      >
        <circle r="50" />
        <path d="M -20 0 L -6 14 L 21 -14" />
      </g>

      {/* o caminhão, visto de cima, de frente para +x: baú fechado com a
          cápsula, cabine verde e riscos de velocidade atrás */}
      <g data-j="carrinho" transform={`translate(${FIM.x} ${FIM.y})`}>
        <g data-j="carrinho-giro" transform="rotate(90)">
          <g className="jx-rastro" data-j="rastro">
            <path d="M -86 -16 H -112" />
            <path d="M -80 0 H -122" />
            <path d="M -86 16 H -108" />
          </g>
          <rect className="jx-roda" x="-48" y="-34" width="18" height="9" rx="3" />
          <rect className="jx-roda" x="-48" y="25" width="18" height="9" rx="3" />
          <rect className="jx-roda" x="28" y="-32" width="18" height="9" rx="3" />
          <rect className="jx-roda" x="28" y="23" width="18" height="9" rx="3" />
          <rect className="jx-carro" x="-64" y="-29" width="86" height="58" rx="12" />
          <g className="jx-capsula" transform="translate(-21 0) rotate(-35)">
            <rect x="-22" y="-10" width="44" height="20" rx="10" />
            <path d="M -12 -10 A 10 10 0 0 0 -12 10 H 0 V -10 Z" />
          </g>
          <rect className="jx-cabine" x="26" y="-26" width="32" height="52" rx="12" />
          <rect className="jx-parabrisa" x="44" y="-17" width="8" height="34" rx="3" />
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
