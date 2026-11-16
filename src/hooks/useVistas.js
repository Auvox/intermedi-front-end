import { useState } from "react";

// Notificações do sino já clicadas (as outras ficam em destaque), guardadas neste navegador
const CHAVE = "intermedi.notificacoes.vistas";
const LIMITE = 300;

function lerVistas() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE) || "[]"));
  } catch {
    return new Set();
  }
}

// quais notificações já foram clicadas
export function useVistas() {
  const [vistas, setVistas] = useState(lerVistas);
  const marcar = (chaves) => {
    setVistas((atual) => {
      const nova = new Set([...atual, ...chaves]);
      try {
        localStorage.setItem(CHAVE, JSON.stringify([...nova].slice(-LIMITE)));
      } catch {
        // sem storage: o destaque some ao recarregar
      }
      return nova;
    });
  };
  return { vistas, marcar };
}
