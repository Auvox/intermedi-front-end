import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createAuthServer } from "./auth.mjs";
import { normalizeGerentes } from "../src/services/gerenteMapper.js";

// Back falso: só responde o POST /auth/login como o back do Intermedi
async function fakeBack() {
  const contas = {
    "11122233344:G000077:Provisoria-123": {
      papel: "gerente", id: 77, nome: "João Silva", email: "joao.silva@email.com",
      idFarmacia: 88, nomeFarmacia: "Farmácia João",
    },
    "99999999999:A000001:senha123": { papel: "admin", id: 1, nome: "Admin", email: "admin@intermedi.com" },
  };
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const { cpf = "", matricula = "", senha = "" } = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    const usuario = req.method === "POST" && req.url === "/auth/login"
      && contas[`${cpf.replace(/\D/g, "")}:${matricula.toUpperCase()}:${senha}`];
    res.writeHead(usuario ? 200 : 401, { "Content-Type": "application/json" });
    res.end(JSON.stringify(usuario ? { token: "jwt", usuario } : { error: "CPF, matrícula ou senha incorretos." }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

const gerente = { cpf: "111.222.333-44", matricula: "G000077", senha: "Provisoria-123", role: "gerente" };

test("gerente entra com CPF, matrícula e senha conferidos no back; sessão e logout", async () => {
  const directory = mkdtempSync(join(tmpdir(), "intermedi-auth-test-"));
  const databasePath = join(directory, "test.sqlite");
  const back = await fakeBack();
  let server;
  let base;
  const start = async () => {
    server = createAuthServer({ databasePath, backendUrl: back.url });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    const closed = once(server, "close");
    server.close();
    await closed;
  };
  async function request(path, data, cookie = "", origin = "http://localhost:5173") {
    const response = await fetch(`${base}/api/auth/${path}`, {
      method: data ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
      body: data ? JSON.stringify(data) : undefined,
    });
    return {
      status: response.status,
      cookie: response.headers.get("set-cookie"),
      body: await response.json(),
    };
  }
  try {
    await start();
    // conta antiga do cadastro público com o mesmo e-mail: dá lugar à do back
    const seed = new DatabaseSync(databasePath);
    seed.prepare("INSERT INTO units VALUES ('antiga', 'Unidade antiga')").run();
    seed.prepare("INSERT INTO users VALUES ('antiga', 'Antiga', 'joao.silva@email.com', 'x', 'y', 'gerente', 'antiga')").run();
    seed.close();

    assert.equal((await request("session")).status, 401);
    assert.equal((await request("login", gerente, "", "https://untrusted.example")).status, 403);
    assert.equal((await request("register", { ...gerente, nome: "x", unidade: "y" })).status, 404);
    assert.equal((await request("login", { ...gerente, role: "admin" })).status, 403);
    assert.equal((await request("login", { ...gerente, matricula: "" })).status, 400);
    assert.equal((await request("login", { ...gerente, senha: "errada" })).status, 401);
    const admin = await request("login", { cpf: "999.999.999-99", matricula: "A000001", senha: "senha123", role: "gerente" });
    assert.equal(admin.status, 403);

    const login = await request("login", gerente);
    assert.equal(login.status, 200);
    assert.match(login.cookie, /HttpOnly; SameSite=Strict/);
    const cookie = login.cookie.split(";")[0];
    assert.deepEqual(login.body.user, {
      id: "gerente-77",
      name: "João Silva",
      email: "joao.silva@email.com",
      role: "gerente",
      unitId: "farmacia-88",
      unitName: "Farmácia João",
    });
    assert.equal((await request("session", undefined, cookie)).body.user.unitName, "Farmácia João");

    const inspect = new DatabaseSync(databasePath);
    const rows = inspect.prepare("SELECT * FROM users WHERE email = ?").all("joao.silva@email.com");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "gerente-77");
    assert.notEqual(rows[0].password_hash, gerente.senha);
    inspect.close();

    await stop();
    await start();
    assert.equal((await request("session", undefined, cookie)).status, 200);
    const again = await request("login", gerente, cookie);
    assert.equal(again.status, 200);
    assert.equal((await request("session", undefined, cookie)).status, 401);
    const newCookie = again.cookie.split(";")[0];
    assert.equal((await request("logout", {}, newCookie)).status, 200);
    assert.equal((await request("session", undefined, newCookie)).status, 401);
    assert.equal((await request("session", undefined, "intermedi_session=inventada")).status, 401);

    const last = (await request("login", gerente)).cookie.split(";")[0];
    const expires = new DatabaseSync(databasePath);
    expires.prepare("UPDATE sessions SET expires = 0").run();
    expires.close();
    assert.equal((await request("session", undefined, last)).status, 401);
  } finally {
    if (server?.listening) await stop();
    back.server.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("avisa quando o back está fora do ar", async () => {
  const back = await fakeBack();
  const url = back.url;
  const closed = once(back.server, "close");
  back.server.close();
  await closed;
  const server = createAuthServer({ databasePath: ":memory:", backendUrl: url });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" },
      body: JSON.stringify(gerente),
    });
    assert.equal(response.status, 503);
  } finally {
    server.close();
  }
});

test("normaliza a lista de gerentes recebida do endpoint GET", () => {
  const payload = [
    {
      id: 1,
      nomeGerente: "Renata Lima",
      emailGerente: "renata@example.com",
      cidade: "São Paulo",
      endereco: "Rua A",
      status: "Ativo",
    },
    {
      nome: "Paulo Martins",
      email: "paulo@example.com",
      unidade: "Farmácia Jardim",
    },
  ];

  const normalized = normalizeGerentes(payload);

  assert.deepEqual(normalized, [
    {
      id: "1",
      name: "Renata Lima",
      photo: undefined,
      email: "renata@example.com",
      farmaciaId: null,
      idEndereco: null,
      unit: "São Paulo",
      status: "Ativo",
    },
    {
      id: "2",
      name: "Paulo Martins",
      photo: undefined,
      email: "paulo@example.com",
      farmaciaId: null,
      idEndereco: null,
      unit: "Farmácia Jardim",
      status: "Ativo",
    },
  ]);
});

test("limita tentativas e rejeita payload inválido", async () => {
  const server = createAuthServer({ databasePath: ":memory:" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/api/auth/login`;
  const headers = {
    Origin: "http://localhost:5173",
    "Content-Type": "application/json",
  };
  try {
    const malformed = await fetch(url, { method: "POST", headers, body: "{" });
    assert.equal(malformed.status, 400);
    for (let i = 0; i < 19; i++)
      await fetch(url, { method: "POST", headers, body: "{}" });
    const limited = await fetch(url, { method: "POST", headers, body: "{}" });
    assert.equal(limited.status, 429);
    assert(limited.headers.has("retry-after"));
  } finally {
    const closed = once(server, "close");
    server.close();
    await closed;
  }
});
