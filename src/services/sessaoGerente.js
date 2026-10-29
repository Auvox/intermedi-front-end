import { apiRequest } from "./api";
import { guardarTokenSessao } from "./presenca";

// Sessão do gerente no back-end (POST /auth/login com e-mail + matrícula +
// senha). O JWT fica só nesta aba do navegador (sessionStorage).

const CHAVE_TOKEN = "intermedi.gerente.token";

function lerToken() {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

function definirToken(token) {
  try {
    if (token) sessionStorage.setItem(CHAVE_TOKEN, token);
    else sessionStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // modo privado sem storage: o login vale até recarregar
  }
}

// formato que a área do gerente já usa (id, name, email, role, photo)
function paraUsuario(usuario) {
  return {
    id: usuario.id,
    name: usuario.nome,
    email: usuario.email,
    role: usuario.papel,
    matricula: usuario.matricula,
    idFarmacia: usuario.idFarmacia,
    unitName: usuario.nomeFarmacia,
    photo: usuario.foto,
  };
}

export async function entrarComoGerente({ email, matricula, senha }) {
  const dados = await apiRequest("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, matricula, senha }),
  });
  if (dados.usuario?.papel !== "gerente") {
    throw new Error("Esta conta não é de gerente. Escolha o perfil certo para entrar.");
  }
  definirToken(dados.token);
  // o mesmo token conta o tempo logado (presenca.js)
  guardarTokenSessao(dados.token);
  return paraUsuario(dados.usuario);
}

// Quem está logado; erro com status 401 quando não há sessão válida
export async function buscarSessaoGerente(signal) {
  const token = lerToken();
  if (!token) throw Object.assign(new Error("Entre como gerente."), { status: 401 });
  try {
    const { usuario } = await apiRequest("/auth/me", {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (usuario?.papel !== "gerente") throw Object.assign(new Error("Esta área é exclusiva para gerentes."), { status: 401 });
    return paraUsuario(usuario);
  } catch (error) {
    if (error.status === 401) definirToken(null);
    throw error;
  }
}

export async function sairGerente() {
  const token = lerToken();
  definirToken(null);
  if (!token) return;
  await apiRequest("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}
