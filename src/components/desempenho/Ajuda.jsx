import { useId, useState } from "react";

// Ícone "?" com a explicação do indicador (passar o mouse, focar com Tab
// ou tocar). Esc fecha.
export default function Ajuda({ texto, rotulo = "O que é isto?" }) {
  const id = useId();
  const [aberta, setAberta] = useState(false);
  return (
    <span className="adm-dsp-ajuda" onMouseEnter={() => setAberta(true)} onMouseLeave={() => setAberta(false)}>
      <button
        type="button"
        className="adm-dsp-ajuda-botao"
        aria-label={rotulo}
        aria-describedby={aberta ? id : undefined}
        aria-expanded={aberta}
        onFocus={() => setAberta(true)}
        onBlur={() => setAberta(false)}
        onClick={(event) => {
          // dentro de um card clicável, o "?" não navega
          event.preventDefault();
          event.stopPropagation();
          setAberta((atual) => !atual);
        }}
        onKeyDown={(event) => event.key === "Escape" && setAberta(false)}
      >
        ?
      </button>
      {aberta && (
        <span role="tooltip" id={id} className="adm-dsp-ajuda-balao">
          {texto}
        </span>
      )}
    </span>
  );
}
