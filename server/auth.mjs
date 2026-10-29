import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const lifetime = 8 * 60 * 60 * 1000;
const cookieName = "intermedi_session";

export function createAuthServer({
  databasePath = fileURLToPath(new URL("./data/auth.sqlite", import.meta.url)),
  secure = false,
  origins = ["http://localhost:5173", "http://127.0.0.1:5173"],
  // back do Intermedi, que confere o login do gerente
  backendUrl = (process.env.INTERMEDI_API_URL || "http://localhost:3000").replace(/\/$/, ""),
} = {}) {
  if (databasePath !== ":memory:")
    mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL CHECK(role = 'gerente'),
      unit_id TEXT NOT NULL REFERENCES units(id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
    );`);
  const attempts = new Map();
  function cookie(value, age) {
    return `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${age}${secure ? "; Secure" : ""}`;
  }
  function token(req) {
    return (
      (req.headers.cookie || "")
        .split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1) || ""
    );
  }
  function userFor(req) {
    return db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.unit_id AS unitId, n.name AS unitName
      FROM sessions s JOIN users u ON u.id = s.user_id JOIN units n ON n.id = u.unit_id
      WHERE s.token_hash = ? AND s.expires > ?`,
      )
      .get(digest(token(req)), Date.now());
  }
  function session(req, res, userId) {
    db.prepare("DELETE FROM sessions WHERE expires <= ? OR token_hash = ?").run(
      Date.now(),
      digest(token(req)),
    );
    const value = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
      digest(value),
      userId,
      Date.now() + lifetime,
    );
    res.setHeader("Set-Cookie", cookie(value, lifetime / 1000));
  }
  function send(res, status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(data));
  }
  // O gerente entra com CPF + matrícula + senha (os dados do e-mail de
  // boas-vindas). Quem confere é o back (/auth/login); aqui só guardamos a
  // pessoa e a farmácia dela para a sessão do front.
  async function loginNoBack({ cpf, matricula, senha }) {
    let response;
    try {
      response = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, matricula, senha }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw { status: 503, message: "Não foi possível conectar ao servidor do Intermedi. Tente novamente." };
    }
    const result = await response.json().catch(() => ({}));
    if (response.status === 429) throw { status: 429, message: result.error || "Muitas tentativas. Aguarde e tente de novo." };
    if (!response.ok) throw { status: 401, message: "CPF, matrícula ou senha incorretos." };
    if (result.usuario?.papel !== "gerente")
      throw { status: 403, message: "Esta conta não é de gerente. Escolha o seu perfil em Trocar perfil." };
    return { usuario: result.usuario, token: result.token };
  }
  function guardarGerente(usuario) {
    const id = `gerente-${usuario.id}`;
    const email = String(usuario.email || `${id}@intermedi.local`).trim().toLowerCase();
    const unitId = usuario.idFarmacia == null ? "sem-farmacia" : `farmacia-${usuario.idFarmacia}`;
    const unitName = String(usuario.nomeFarmacia || "Unidade não vinculada").trim();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("INSERT INTO units VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name").run(unitId, unitName);
      // contas antigas com o mesmo e-mail (do cadastro público que saiu) dão lugar a esta
      const antigas = db.prepare("SELECT id FROM users WHERE email = ? AND id <> ?").all(email, id);
      for (const antiga of antigas) {
        db.prepare("DELETE FROM sessions WHERE user_id = ?").run(antiga.id);
        db.prepare("DELETE FROM users WHERE id = ?").run(antiga.id);
      }
      // a senha de verdade fica só no back: aqui vai um valor aleatório
      db.prepare(`INSERT INTO users VALUES (?, ?, ?, ?, ?, 'gerente', ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, unit_id = excluded.unit_id`)
        .run(id, String(usuario.nome || email), email, randomBytes(32).toString("hex"), randomBytes(16).toString("hex"), unitId);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return { id, name: String(usuario.nome || email), email, role: "gerente", unitId, unitName };
  }
  async function body(req) {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      throw { status: 415, message: "Envie os dados em JSON." };
    const chunks = [];
    let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 8192)
        throw { status: 413, message: "Dados muito extensos." };
      chunks.push(chunk);
    }
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString());
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new Error();
      return data;
    } catch {
      throw { status: 400, message: "Dados inválidos." };
    }
  }
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (req.method === "GET" && path === "/api/auth/session") {
        const user = userFor(req);
        return send(
          res,
          user ? 200 : 401,
          user ? { user } : { message: "Entre na sua conta para continuar." },
        );
      }
      if (
        req.method !== "POST" ||
        !["/api/auth/login", "/api/auth/logout"].includes(path)
      )
        return send(res, 404, { message: "Rota não encontrada." });
      // Only explicitly configured same-origin frontends may mutate sessions.
      const allowedOrigins =
        typeof origins === "function" ? origins() : origins;
      if (!allowedOrigins.includes(req.headers.origin))
        return send(res, 403, { message: "Origem não autorizada." });
      if (path === "/api/auth/logout") {
        db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
          digest(token(req)),
        );
        res.setHeader("Set-Cookie", cookie("", 0));
        return send(res, 200, { message: "Você saiu da conta." });
      }
      const now = Date.now();
      for (const [key, value] of attempts)
        if (value.until <= now) attempts.delete(key);
      const address = req.socket.remoteAddress;
      const limit = attempts.get(address) || {
        count: 0,
        until: now + 15 * 60 * 1000,
      };
      if (limit.count >= 20) {
        res.setHeader("Retry-After", Math.ceil((limit.until - now) / 1000));
        return send(res, 429, {
          message:
            "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.",
        });
      }
      limit.count++;
      attempts.set(address, limit);
      const data = await body(req);
      const cpf = typeof data.cpf === "string" ? data.cpf.trim() : "";
      const matricula =
        typeof data.matricula === "string" ? data.matricula.trim() : "";
      const senha = typeof data.senha === "string" ? data.senha : "";
      if (!cpf || cpf.length > 20 || !matricula || matricula.length > 20 || !senha)
        return send(res, 400, {
          message: "Informe o CPF, a matrícula e a senha.",
        });
      if (data.role !== "gerente")
        return send(res, 403, {
          message: "Este serviço permite somente o acesso de gerente.",
        });
      const { usuario, token: tokenDoBack } = await loginNoBack({ cpf, matricula, senha });
      const user = guardarGerente(usuario);
      session(req, res, user.id);
      // o token do back vai para a aba do gerente: é com ele que o tempo logado é contado
      return send(res, 200, { user, token: tokenDoBack });
    } catch (error) {
      send(res, error.status || 500, {
        message: error.status
          ? error.message
          : "Não foi possível concluir a solicitação. Tente novamente.",
      });
    }
  });
  server.on("close", () => db.close());
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const production = process.env.NODE_ENV === "production";
  if (production && !process.env.AUTH_ORIGINS)
    throw new Error("Configure AUTH_ORIGINS com a origem HTTPS do site.");
  const server = createAuthServer({
    secure: production,
    origins: process.env.AUTH_ORIGINS?.split(",").map((v) => v.trim()),
  });
  const port = Number(process.env.AUTH_PORT || 3001);
  server.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? `A porta ${port} já está ocupada. Para desenvolver, use somente npm run dev: a autenticação já está incluída no site.`
        : `Não foi possível iniciar a autenticação: ${error.message}`,
    );
    server.close();
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`Autenticação disponível em http://127.0.0.1:${port}`),
  );
  const stop = () => {
    server.close();
    server.closeIdleConnections();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
