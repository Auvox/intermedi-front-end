import { useRef } from "react";
import "../../styles/accessibility.css";

// Painel de acessibilidade: lista simples, agrupada, com chave liga/desliga.
// As chaves (contrast, links...) são as mesmas lidas por useAccessibility.
const grupos = [
  {
    titulo: "Leitura",
    itens: [
      ["text", "Letras maiores", "Aumenta o texto em 25%"],
      ["contrast", "Mais contraste", "Texto mais escuro sobre fundo claro"],
      ["spacing", "Mais espaço entre linhas", "Linhas, letras e palavras mais soltas"],
      ["dyslexia", "Fonte para dislexia", "Arial, alinhada à esquerda"],
      ["links", "Sublinhar links", "Deixa claro o que é clicável"],
    ],
  },
  {
    titulo: "Tela",
    itens: [
      ["motion", "Parar animações", "Nada se mexe sozinho na página"],
      ["images", "Esconder imagens", "Mostra só o texto"],
      ["cursor", "Ponteiro grande", "Seta maior, com contorno"],
    ],
  },
];

export default function AccessibilityMenu({ preferences, onChange, onReset }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const ativos = grupos.flatMap((g) => g.itens).filter(([chave]) => preferences[chave]).length;

  function fecharAoClicarFora(event) {
    if (event.target !== dialogRef.current) return;
    const area = event.currentTarget.getBoundingClientRect();
    const fora = event.clientX < area.left || event.clientX > area.right || event.clientY < area.top || event.clientY > area.bottom;
    if (fora) event.currentTarget.close();
  }

  return (
    <aside className="accessibility" aria-label="Acessibilidade">
      <button
        ref={triggerRef}
        className="accessibility-trigger"
        type="button"
        aria-label="Abrir opções de acessibilidade"
        aria-haspopup="dialog"
        aria-controls="accessibility-dialog"
        onClick={() => dialogRef.current.showModal()}
      >
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
          <circle cx="16" cy="6" r="3.2" />
          <path d="M6.4 10.5a1.8 1.8 0 0 0-.8 3.5l6.7 1.5v4.4l-3 7.1a1.9 1.9 0 0 0 3.5 1.5l3.2-6.8 3.2 6.8a1.9 1.9 0 0 0 3.5-1.5l-3-7.1v-4.4l6.7-1.5a1.8 1.8 0 0 0-.8-3.5l-6.4 1.3h-6.4Z" />
        </svg>
        {ativos > 0 && <span className="accessibility-trigger-count" aria-hidden="true">{ativos}</span>}
      </button>
      <dialog
        ref={dialogRef}
        id="accessibility-dialog"
        className="accessibility-panel"
        aria-labelledby="accessibility-title"
        onClose={() => triggerRef.current?.focus()}
        onClick={fecharAoClicarFora}
      >
        <header className="accessibility-header">
          <div>
            <h2 id="accessibility-title">Acessibilidade</h2>
            <p>Ajuste a página do seu jeito. Vale para este navegador.</p>
          </div>
          <button type="button" autoFocus aria-label="Fechar" onClick={() => dialogRef.current.close()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>

        {grupos.map((grupo) => (
          <section key={grupo.titulo} className="accessibility-group" aria-label={grupo.titulo}>
            <h3>{grupo.titulo}</h3>
            <ul>
              {grupo.itens.map(([chave, rotulo, ajuda]) => (
                <li key={chave}>
                  <button type="button" role="switch" aria-checked={Boolean(preferences[chave])} onClick={() => onChange(chave)}>
                    <span className="accessibility-label">
                      {rotulo}
                      <small>{ajuda}</small>
                    </span>
                    <span className="accessibility-switch" aria-hidden="true"><span /></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <footer className="accessibility-footer">
          <button className="accessibility-reset" type="button" onClick={onReset} disabled={!ativos}>
            Voltar ao padrão
          </button>
          <button className="accessibility-done" type="button" onClick={() => dialogRef.current.close()}>
            Pronto
          </button>
        </footer>
      </dialog>
    </aside>
  );
}
