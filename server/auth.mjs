import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  scrypt,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const deriveKey = promisify(scrypt);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const lifetime = 8 * 60 * 60 * 1000;
const cookieName = "intermedi_session";

export function createAuthServer({
  databasePath = fileURLToPath(new URL("./data/auth.sqlite", import.meta.url)),
  secure = false,
  origins = ["http://localhost:5173", "http://127.0.0.1:5173"],
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
  const dummySalt = randomBytes(16).toString("hex");
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
  function listFromGerentesPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.gerente)) return payload.gerente;
    if (Array.isArray(payload?.gerentes)) return payload.gerentes;
    return [];
  }
  function detailFromGerentePayload(payload) {
    if (Array.isArray(payload)) return payload[0] ?? {};
    if (payload?.resultado) return payload.resultado;
    if (payload?.gerente) return payload.gerente;
    if (payload?.gerentes) return payload.gerentes[0] ?? {};
    return payload ?? {};
  }
  function listFromFarmaciasPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.farmacia)) return payload.farmacia;
    if (Array.isArray(payload?.farmacias)) return payload.farmacias;
    return [];
  }
  async function syncGerenteFromFakeServer(email, password) {
    try {
      const listResponse = await fetch("http://localhost:3000/gerente", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!listResponse.ok) return null;
      const listPayload = await listResponse.json().catch(() => ({}));
      const rawList = listFromGerentesPayload(listPayload);
      const found = rawList.find((item) => {
        const storedEmail = String(item.emailGerente ?? item.email ?? "")
          .trim()
          .toLowerCase();
        return storedEmail === email;
      });
      if (!found) return null;
      const gerenteId = found.idGerente ?? found.id;
      const detailResponse = await fetch(
        `http://localhost:3000/gerente/${encodeURIComponent(gerenteId)}`,
        { method: "GET", headers: { Accept: "application/json" } },
      );
      if (!detailResponse.ok) return null;
      const detailPayload = await detailResponse.json().catch(() => ({}));
      const detail = detailFromGerentePayload(detailPayload);
      const storedPassword = String(
        detail.senhaGerente ??
          detail.senha ??
          found.senhaGerente ??
          found.senha ??
          "",
      ).trim();
      if (storedPassword !== password) return null;
      const pharmacyResponse = await fetch("http://localhost:3000/farmacia", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const pharmacyPayload = await pharmacyResponse.json().catch(() => ({}));
      const rawFarmacies = listFromFarmaciasPayload(pharmacyPayload);
      const matchingPharmacy = rawFarmacies.find((farmacia) => {
        const relation =
          farmacia.idGerente ?? farmacia.gerenteId ?? farmacia.fkIdGerente;
        return String(relation ?? "") === String(gerenteId);
      });
      const unitName = String(
        matchingPharmacy?.nomeFarmacia ??
          matchingPharmacy?.nome ??
          `Farmácia ${detail.nomeGerente ?? found.nomeGerente ?? email}`,
      ).trim();
      const existingUnit =
        db.prepare("SELECT id FROM units WHERE name = ?").get(unitName) ?? null;
      const unitId = existingUnit?.id ?? randomUUID();
      if (!existingUnit) {
        db.prepare("INSERT INTO units VALUES (?, ?)").run(unitId, unitName);
      }
      const salt = randomBytes(16).toString("hex");
      const hash = (await deriveKey(password, salt, 64)).toString("hex");
      const id = randomUUID();
      db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        id,
        String(detail.nomeGerente ?? found.nomeGerente ?? email),
        email,
        hash,
        salt,
        "gerente",
        unitId,
      );
      return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    } catch {
      return null;
    }
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
        !["/api/auth/register", "/api/auth/login", "/api/auth/logout"].includes(
          path,
        )
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
      const email =
        typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
      const password = typeof data.senha === "string" ? data.senha : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return send(res, 400, {
          message: "Informe um e-mail válido e uma senha.",
        });
      if (data.role !== "gerente")
        return send(res, 403, {
          message: "Este serviço permite somente o acesso de gerente.",
        });
      if (path === "/api/auth/register") {
        const name = typeof data.nome === "string" ? data.nome.trim() : "";
        const unitName =
          typeof data.unidade === "string" ? data.unidade.trim() : "";
        if (
          name.length < 3 ||
          name.length > 120 ||
          unitName.length < 3 ||
          unitName.length > 150
        )
          return send(res, 400, {
            message:
              "Informe seu nome e o nome da nova unidade (mínimo de 3 caracteres).",
          });
        if (data.confirmarSenha !== password)
          return send(res, 400, { message: "As senhas não coincidem." });
        const salt = randomBytes(16).toString("hex");
        const hash = (await deriveKey(password, salt, 64)).toString("hex");
        const id = randomUUID();
        const unitId = randomUUID();
        db.exec("BEGIN IMMEDIATE");
        try {
          // Public registration creates a NEW unit, never access to an existing pharmacy.
          db.prepare("INSERT INTO units VALUES (?, ?)").run(unitId, unitName);
          db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)").run(
            id,
            name,
            email,
            hash,
            salt,
            "gerente",
            unitId,
          );
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          if (error.message.includes("UNIQUE constraint failed: users.email"))
            return send(res, 409, {
              message:
                "Não foi possível cadastrar este e-mail. Se já possui conta, use Entrar.",
            });
          throw error;
        }
        session(req, res, id);
        return send(res, 201, {
          user: { id, name, email, role: "gerente", unitId, unitName },
        });
      }
      let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        user = await syncGerenteFromFakeServer(email, password);
      }
      const hash = await deriveKey(password, user?.salt || dummySalt, 64);
      if (
        !user ||
        !timingSafeEqual(hash, Buffer.from(user.password_hash, "hex"))
      )
        return send(res, 401, { message: "E-mail ou senha incorretos." });
      session(req, res, user.id);
      const unit = db
        .prepare("SELECT name FROM units WHERE id = ?")
        .get(user.unit_id);
      return send(res, 200, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          unitId: user.unit_id,
          unitName: unit.name,
        },
      });
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
