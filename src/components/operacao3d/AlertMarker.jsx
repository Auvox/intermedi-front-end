const ICONES = {
  alerta: <path d="M12 8v5m0 3.2v.1M10.3 4.5l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-2.5l-8-14a2 2 0 0 0-3.4 0Z" />,
  relogio: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  chamado: <><path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z" /><path d="M14.5 6v12" strokeDasharray="2 2.2" /></>,
  caminhao: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
};
const ICONE_DA_SITUACAO = { vencido: "relogio", vencendo: "relogio", zerado: "alerta", critico: "alerta" };
const TOM_DA_SITUACAO = { vencido: "red", zerado: "red", critico: "orange", vencendo: "yellow" };

// Marcador de alerta preso a um ponto da cena (pela camada de rótulos). É um
// botão de verdade (teclado e leitor de tela); o texto completo fica no
// aria-label e no title.
export default function AlertMarker({ situacao, tom, icone, rotulo, texto, onClick }) {
  const tone = tom ?? TOM_DA_SITUACAO[situacao] ?? "yellow";
  return (
    <button
      type="button"
      className={`op3d-alerta op3d-alerta-${tone}`}
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONES[icone ?? ICONE_DA_SITUACAO[situacao] ?? "alerta"]}
      </svg>
      {texto && <span>{texto}</span>}
    </button>
  );
}
