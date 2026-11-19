// Ilustração das páginas de aviso (404, sistema fora do ar, farmácia
// desativada): números grandes no verde da Intermedi e a equipe de saúde em
// volta. Uma enfermeira sentada no primeiro número com a prancheta, um
// farmacêutico e uma farmacêutica segurando as pontas de um cabo desligado.
// Tudo em SVG (sem imagem externa), escala com a tela.

const PELE = ["#f1c7a5", "#c68863", "#8d5a3b"];
const VERDE = "#087f45";
const VERDE_CLARO = "#22b45e";
const TINTA = "#16352a";

function Enfermeira({ x, y }) {
  // sentada na borda: (x, y) é o ponto do assento
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* pernas penduradas */}
      <rect x="-9" y="-2" width="8" height="34" rx="4" fill="#2f6f8f" />
      <rect x="3" y="-2" width="8" height="34" rx="4" fill="#2f6f8f" />
      <ellipse cx="-5" cy="33" rx="7" ry="3.5" fill={TINTA} />
      <ellipse cx="8" cy="33" rx="7" ry="3.5" fill={TINTA} />
      {/* tronco (pijama cirúrgico) */}
      <path d="M-14 2 L-12 -34 Q0 -42 12 -34 L14 2 Z" fill="#3aa6a0" />
      <path d="M-5 -37 L0 -28 L5 -37" fill="none" stroke="#2b8580" strokeWidth="2" />
      {/* pescoço e cabeça */}
      <rect x="-3.5" y="-44" width="7" height="8" fill={PELE[1]} />
      <circle cx="0" cy="-53" r="11" fill={PELE[1]} />
      <path d="M-11 -53 Q-12 -66 0 -66 Q12 -66 11 -53 Q8 -60 0 -60 Q-8 -60 -11 -53 Z" fill="#2a1a12" />
      <path d="M8 -58 Q16 -50 12 -40" fill="none" stroke="#2a1a12" strokeWidth="5" strokeLinecap="round" />
      {/* touca com a cruz */}
      <path d="M-10 -63 Q0 -74 10 -63 L9 -59 L-9 -59 Z" fill="#fff" stroke="#d3e2da" />
      <path d="M0 -70 v6 M-3 -67 h6" stroke={VERDE_CLARO} strokeWidth="2" />
      {/* prancheta no colo e braços */}
      <rect x="-15" y="-24" width="21" height="27" rx="2" fill="#fff" stroke="#c9d8cf" transform="rotate(-12 -4 -10)" />
      <path d="M-11 -17 h12 M-11 -12 h9 M-11 -7 h11" stroke="#9db4a6" strokeWidth="1.6" transform="rotate(-12 -4 -10)" />
      <path d="M-12 -30 Q-20 -18 -9 -12" fill="none" stroke="#3aa6a0" strokeWidth="6" strokeLinecap="round" />
      <path d="M12 -30 Q18 -16 4 -14" fill="none" stroke="#3aa6a0" strokeWidth="6" strokeLinecap="round" />
      <circle cx="4" cy="-14" r="3.5" fill={PELE[1]} />
    </g>
  );
}

function Farmaceutico({ x, y, pele, cabelo, calca, espelhar = false, mulher = false }) {
  // em pé, andando; (x, y) é o chão. A mão da frente segura um plugue.
  return (
    <g transform={`translate(${x} ${y}) scale(${espelhar ? -1 : 1} 1)`}>
      <path d="M-6 -38 L-12 -2" stroke={calca} strokeWidth="8" strokeLinecap="round" />
      <path d="M5 -38 L12 -3" stroke={calca} strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="-14" cy="-1" rx="7" ry="3" fill={TINTA} />
      <ellipse cx="15" cy="-1" rx="7" ry="3" fill={TINTA} />
      {/* jaleco */}
      <path d="M-15 -30 L-13 -74 Q0 -82 13 -74 L15 -30 Q0 -26 -15 -30 Z" fill="#fff" stroke="#cfdcd4" strokeWidth="1.5" />
      <path d="M-5 -77 L0 -64 L5 -77 Z" fill={VERDE} />
      <path d="M0 -64 V-32" stroke="#dbe6df" strokeWidth="1.5" />
      <rect x="4" y="-58" width="7" height="5" rx="1" fill="#e8f3ec" stroke="#cfdcd4" />
      {/* braço de trás e da frente */}
      <path d="M-11 -70 Q-22 -56 -18 -44" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M-11 -70 Q-22 -56 -18 -44" fill="none" stroke="#cfdcd4" strokeWidth="1.2" />
      <path d="M11 -70 Q24 -60 30 -48" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M11 -70 Q24 -60 30 -48" fill="none" stroke="#cfdcd4" strokeWidth="1.2" />
      <circle cx="31" cy="-46" r="3.6" fill={pele} />
      {/* cabeça */}
      <rect x="-3.5" y="-86" width="7" height="8" fill={pele} />
      <circle cx="0" cy="-94" r="10.5" fill={pele} />
      {mulher ? (
        <path d="M-11 -94 Q-12 -108 0 -107 Q12 -108 11 -94 L12 -80 Q8 -84 7 -97 Q0 -101 -7 -97 Q-8 -84 -12 -80 Z" fill={cabelo} />
      ) : (
        <path d="M-10.5 -96 Q-10 -107 1 -106 Q11 -106 10.5 -96 Q6 -101 -2 -100 Q-8 -100 -10.5 -96 Z" fill={cabelo} />
      )}
      {!mulher && <path d="M-6 -88 Q0 -84 6 -88 Q4 -83 0 -83 Q-4 -83 -6 -88 Z" fill={cabelo} opacity=".85" />}
    </g>
  );
}

function Plugue({ x, y, angulo = 0, macho = true }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angulo})`}>
      <rect x="-9" y="-7" width="18" height="14" rx="4" fill={VERDE} />
      {macho ? (
        <>
          <rect x="9" y="-5" width="7" height="2.6" rx="1" fill="#9fb3a7" />
          <rect x="9" y="2.4" width="7" height="2.6" rx="1" fill="#9fb3a7" />
        </>
      ) : (
        <>
          <circle cx="5" cy="-2.5" r="1.4" fill="#cde9d7" />
          <circle cx="5" cy="2.5" r="1.4" fill="#cde9d7" />
        </>
      )}
    </g>
  );
}

function Farmacia({ x, y }) {
  // fachada fechada, para "farmácia desativada"
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-150" y="-190" width="300" height="190" rx="10" fill="#e3f1e8" stroke="#bcd9c6" strokeWidth="2" />
      <rect x="-165" y="-214" width="330" height="40" rx="10" fill={VERDE} />
      <text x="0" y="-187" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff" fontFamily="Poppins, Inter, sans-serif" letterSpacing="2">FARMÁCIA</text>
      <rect x="-120" y="-150" width="110" height="80" rx="6" fill="#fff" stroke="#bcd9c6" />
      <rect x="10" y="-150" width="110" height="150" rx="6" fill="#cfe5d7" stroke="#bcd9c6" />
      {/* grades da porta abaixadas */}
      {[-130, -112, -94, -76, -58, -40, -22].map((linha) => (
        <path key={linha} d={`M14 ${linha} H116`} stroke="#a9c9b5" strokeWidth="3" />
      ))}
      {/* cruz apagada */}
      <g transform="translate(-65 -110)" opacity=".35">
        <rect x="-8" y="-24" width="16" height="48" rx="3" fill={VERDE} />
        <rect x="-24" y="-8" width="48" height="16" rx="3" fill={VERDE} />
      </g>
      {/* placa "fechado" */}
      <path d="M40 -175 L65 -150 L90 -175" fill="none" stroke="#8aa596" strokeWidth="2" />
      <rect x="28" y="-158" width="74" height="26" rx="5" fill="#fff" stroke="#c4291c" strokeWidth="2" />
      <text x="65" y="-140" textAnchor="middle" fontSize="12" fontWeight="700" fill="#c4291c" fontFamily="Poppins, Inter, sans-serif">FECHADO</text>
    </g>
  );
}

export default function IlustracaoAviso({ codigo = "404", fachada = false, balao = "Ops…" }) {
  const digitos = String(codigo).split("");
  return (
    <svg className="aviso-ilustracao" viewBox="0 0 640 360" role="img" aria-hidden="true" focusable="false">
      {/* manchas de fundo */}
      <path d="M70 250 C40 160 120 70 250 80 C330 30 470 40 540 120 C620 180 600 300 500 320 L150 320 C100 315 80 290 70 250 Z" fill="#eef7f1" />
      <path d="M520 110 C560 90 610 120 600 170 C590 200 560 205 540 190" fill="#dff0e5" />
      <path d="M90 140 C70 110 100 80 130 95" fill="none" stroke="#cfe8d8" strokeWidth="10" strokeLinecap="round" />
      {/* cápsulas e cruzes soltas */}
      <g opacity=".9">
        <rect x="552" y="236" width="40" height="16" rx="8" fill="#fff" stroke="#bfe0cb" strokeWidth="2" transform="rotate(-30 572 244)" />
        <rect x="552" y="236" width="20" height="16" rx="8" fill={VERDE_CLARO} transform="rotate(-30 572 244)" />
        <path d="M58 92 h14 M65 85 v14" stroke={VERDE_CLARO} strokeWidth="4" strokeLinecap="round" />
        <path d="M600 70 h10 M605 65 v10" stroke="#9fd5b2" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* balão */}
      <g transform="translate(150 46)">
        <path d="M0 0 h96 a14 14 0 0 1 14 14 v30 a14 14 0 0 1 -14 14 h-58 l-16 16 l2 -16 h-24 a14 14 0 0 1 -14 -14 v-30 a14 14 0 0 1 14 -14 z" fill="#d6ece0" />
        <text x="48" y="36" textAnchor="middle" fontSize={balao.length > 5 ? 15 : 20} fontWeight="700" fill={VERDE} fontFamily="Poppins, Inter, sans-serif">{balao}</text>
      </g>

      {fachada ? (
        <Farmacia x={320} y={318} />
      ) : (
        <g fontFamily="Poppins, Inter, sans-serif" fontWeight="800" fontSize="190" textAnchor="middle">
          {digitos.map((d, i) => (
            <text key={i} x={180 + i * 140} y={300} fill={i === 1 ? "#cdebd8" : VERDE} opacity={i === 1 ? 1 : 0.92}>{d}</text>
          ))}
        </g>
      )}

      {/* chão */}
      <path d="M40 320 H600" stroke="#cfe3d6" strokeWidth="2" strokeLinecap="round" />

      {/* cabo desligado entre os dois farmacêuticos */}
      <path d="M60 312 C120 340 180 300 228 276" fill="none" stroke="#7cc79a" strokeWidth="4" strokeLinecap="round" />
      <path d="M412 276 C460 300 520 345 600 312" fill="none" stroke="#7cc79a" strokeWidth="4" strokeLinecap="round" />
      <Plugue x={238} y={273} angulo={-8} />
      <Plugue x={402} y={273} angulo={188} macho={false} />

      <Farmaceutico x={200} y={320} pele={PELE[0]} cabelo="#3b2618" calca="#24476b" />
      <Farmaceutico x={440} y={320} pele={PELE[2]} cabelo="#1d1210" calca="#3c5a4a" espelhar mulher />
      <Enfermeira x={fachada ? 250 : 172} y={fachada ? 104 : 166} />
    </svg>
  );
}
