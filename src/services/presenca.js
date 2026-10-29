import { useEffect } from "react";
import { apiRequest } from "./api";

// Tempo logado do gerente e do funcionário. O token do back (do login) fica
// nesta aba do navegador; enquanto a pessoa está na plataforma o front avisa
// o back a cada minuto. O back guarda entrada, último sinal e saída de cada
// sessão: é o "logado de 8h00 até 18h00" que o gerente e o admin veem.

const CHAVE = "intermedi.sessao.token";
const INTERVALO = 60 * 1000;

export function tokenSessao() {
  try {
    return sessionStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function guardarTokenSessao(token) {
  try {
    if (token) sessionStorage.setItem(CHAVE, token);
    else sessionStorage.removeItem(CHAVE);
  } catch {
    // sem storage (modo privado): o tempo logado não é registrado
  }
}

const comToken = (token, options = {}) => ({
  ...options,
  headers: { ...options.headers, ...(token && { Authorization: `Bearer ${token}` }) },
});

// sinal de presença ao entrar, a cada minuto e quando a aba volta a ficar visível
export function usePresenca(ativo = true) {
  useEffect(() => {
    if (!ativo || !tokenSessao()) return undefined;
    let parado = false;
    const avisar = () => {
      const token = tokenSessao();
      if (parado || !token || document.visibilityState === "hidden") return;
      apiRequest("/auth/presenca", comToken(token, { method: "POST" })).catch((error) => {
        // sessão encerrada ou vencida: para de avisar
        if (error.status === 401) {
          parado = true;
          guardarTokenSessao(null);
        }
      });
    };
    avisar();
    const timer = setInterval(avisar, INTERVALO);
    document.addEventListener("visibilitychange", avisar);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", avisar);
    };
  }, [ativo]);
}

// Sair: fecha a sessão no back (marca a hora de saída). Nunca falha.
export async function sairDaConta() {
  const token = tokenSessao();
  guardarTokenSessao(null);
  try {
    sessionStorage.removeItem("intermediEmployeeSession");
  } catch {
    // sem storage: nada a limpar
  }
  if (!token) return;
  await apiRequest("/auth/logout", comToken(token, { method: "POST" })).catch(() => {});
}

// { online, totalMs, sessoes: [{ entrada, saida, duracaoMs, online }] }
export function listarTempoLogado(tipo, id, { dias = 7, signal } = {}) {
  return apiRequest(`/${tipo}/${encodeURIComponent(id)}/acessos?dias=${dias}`, comToken(tokenSessao(), { signal }));
}
