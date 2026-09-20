import { useRef } from "react";
import "../../styles/accessibility.css";

const options = [
  ["contrast", "Contraste +", "Cores com maior contraste para melhorar a leitura.", "◐"],
  ["links", "Links destacados", "Sublinha e realça os links da página.", "↗"],
  ["text", "Texto maior", "Aumenta as letras em 25%.", "A+"],
  ["spacing", "Espaçamento de texto", "Amplia o espaço entre linhas, letras e palavras.", "↔"],
  ["motion", "Parar animações", "Pausa movimentos e atualizações visuais do mapa.", "Ⅱ"],
  ["images", "Ocultar imagens", "Oculta as imagens e ilustrações da página.", "▧"],
  ["dyslexia", "Dislexia amigável", "Usa Arial, alinhamento à esquerda e mais espaçamento.", "Aa"],
  ["cursor", "Cursor", "Exibe um ponteiro maior e com contorno.", "➤"],
];

const iconPaths = {
  contrast: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v18m0-15a6 6 0 0 1 0 12Z",
  links: "m10 13 4-4m-6 5-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 4 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0",
  text: "m3 19 6-14 6 14M5 14h8m3-5h6m-3-3v6",
  spacing: "M4 5h16M4 19h16M3 12h18m-15-3-3 3 3 3m12-6 3 3-3 3",
  motion: "M8 5v14M16 5v14",
  images: "m3 3 18 18M9 4h10a1 1 0 0 1 1 1v10M4 9v10a1 1 0 0 0 1 1h10M4 16l4-4m8-8h.01",
  dyslexia: "m3 19 5-14 5 14M5 14h6m10-2v7m0-5a3 3 0 1 0 0 2",
  cursor: "m5 3 14 10-7 1-3 7-4-18Zm7 11 5 7",
};

function OptionIcon({ name }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>;
}

export default function AccessibilityMenu({ preferences, onChange, onReset }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  return (
    <aside className="accessibility" aria-label="Acessibilidade">
      <button ref={triggerRef} className="accessibility-trigger" type="button" aria-label="Abrir menu de acessibilidade" aria-haspopup="dialog" aria-controls="accessibility-dialog" onClick={() => dialogRef.current.showModal()}>
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
          <circle cx="16" cy="6" r="3.2" />
          <path d="M6.4 10.5a1.8 1.8 0 0 0-.8 3.5l6.7 1.5v4.4l-3 7.1a1.9 1.9 0 0 0 3.5 1.5l3.2-6.8 3.2 6.8a1.9 1.9 0 0 0 3.5-1.5l-3-7.1v-4.4l6.7-1.5a1.8 1.8 0 0 0-.8-3.5l-6.4 1.3h-6.4Z" />
        </svg>
      </button>
      <dialog ref={dialogRef} id="accessibility-dialog" className="accessibility-panel" aria-labelledby="accessibility-title" onClose={() => triggerRef.current?.focus()} onClick={event => { if (event.target === dialogRef.current) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close(); } }}>
        <header className="accessibility-header"><h2 id="accessibility-title">Menu de acessibilidade</h2><button type="button" autoFocus aria-label="Fechar menu de acessibilidade" onClick={() => dialogRef.current.close()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
        <p className="accessibility-intro">Escolha as opções que tornam a leitura mais confortável para você.</p>
        <div className="accessibility-options">
          {options.map(([key, label, description]) => <button key={key} type="button" aria-pressed={preferences[key]} onClick={() => onChange(key)} title={description}><span className="accessibility-option-icon"><OptionIcon name={key} /></span><span>{label}<small>{preferences[key] ? "Ativado" : "Desativado"}</small></span><span className="accessibility-check" aria-hidden="true"><span /></span></button>)}
        </div>
        <p className="accessibility-note">Preferências salvas automaticamente.</p>
        <button className="accessibility-reset" type="button" onClick={onReset}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></svg>Restaurar padrão</button>
      </dialog>
    </aside>
  );
}
