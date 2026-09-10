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

test("sincroniza o login de gerente ausente no auth.sqlite usando o endpoint fake do gerente", async () => {
  const directory = mkdtempSync(
    join(tmpdir(), "intermedi-auth-test-login-sync-"),
  );
  const databasePath = join(directory, "test.sqlite");
  const fake = createServer((req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/gerente") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          mensagem: "TODOS OS GERENTES CADASTRADOS - GET",
          gerente: [
            {
              idGerente: 77,
              nomeGerente: "João Silva",
              emailGerente: "joao.silva@email.com",
              senhaGerente: "123",
            },
          ],
        }),
      );
      return;
    }
    if (path === "/farmacia") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          mensagem: "TODAS AS FARMACIAS CADASTRADAS - GET",
          farmacia: [
            {
              idFarmacia: 88,
              nomeFarmacia: "Farmácia João",
              idGerente: 77,
            },
          ],
        }),
      );
      return;
    }
    if (path === "/gerente/77") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "gerente encontrado",
          resultado: {
            idGerente: 77,
            nomeGerente: "João Silva",
            emailGerente: "joao.silva@email.com",
            senhaGerente: "123",
          },
        }),
      );
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Rota de teste não encontrada." }));
  });
  fake.listen(0, "127.0.0.1");
  await once(fake, "listening");
  const auth = createAuthServer({
    databasePath,
    gerenteApiBase: `http://127.0.0.1:${fake.address().port}`,
  });
  auth.listen(0, "127.0.0.1");
  await once(auth, "listening");

  try {
    const response = await fetch(
      `http://127.0.0.1:${auth.address().port}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:5173",
        },
        body: JSON.stringify({
          email: "joao.silva@email.com",
          senha: "123",
          role: "gerente",
        }),
      },
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.user.email, "joao.silva@email.com");
    assert.equal(payload.user.role, "gerente");
  } finally {
    auth.close();
    fake.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("cadastro, persistência, isolamento, login, sessão e logout", async () => {
  const directory = mkdtempSync(join(tmpdir(), "intermedi-auth-test-"));
  const databasePath = join(directory, "test.sqlite");
  let server;
  let base;
  const start = async () => {
    server = createAuthServer({ databasePath });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    const closed = once(server, "close");
    server.close();
    await closed;
  };
  async function request(
    path,
    data,
    cookie = "",
    origin = "http://localhost:5173",
  ) {
    const response = await fetch(`${base}/api/auth/${path}`, {
      method: data ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: cookie,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return {
      status: response.status,
      cookie: response.headers.get("set-cookie"),
      body: await response.json(),
    };
  }
  const account = {
    nome: "Gerente de teste",
    unidade: "Unidade de teste",
    email: "gerente@example.com",
    senha: "Teste-seguro-123",
    confirmarSenha: "Teste-seguro-123",
    role: "gerente",
  };
  try {
    await start();
    assert.equal((await request("session")).status, 401);
    assert.equal(
      (await request("register", account, "", "https://untrusted.example"))
        .status,
      403,
    );
    assert.equal(
      (await request("register", { ...account, role: "admin" })).status,
      403,
    );
    assert.equal(
      (await request("register", { ...account, confirmarSenha: "diferente" }))
        .status,
      400,
    );
    const registered = await request("register", account);
    assert.equal(registered.status, 201);
    assert.match(registered.cookie, /HttpOnly; SameSite=Strict/);
    const cookie = registered.cookie.split(";")[0];
    assert.equal(registered.body.user.role, "gerente");
    assert.equal(
      (await request("session", undefined, cookie)).body.user.id,
      registered.body.user.id,
    );
    assert.equal(
      (
        await request("register", {
          ...account,
          email: " GERENTE@example.com ",
        })
      ).status,
      409,
    );
    const second = await request("register", {
      ...account,
      email: "segundo@example.com",
    });
    assert.notEqual(second.body.user.unitId, registered.body.user.unitId);
    const inspect = new DatabaseSync(databasePath);
    const row = inspect
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(account.email);
    assert.notEqual(row.password_hash, account.senha);
    assert.equal(row.password_hash.length, 128);
    assert.equal(
      inspect.prepare("SELECT COUNT(*) AS count FROM units").get().count,
      2,
    );
    inspect.close();
    await stop();
    await start();
    assert.equal((await request("session", undefined, cookie)).status, 200);
    assert.equal(
      (await request("login", { ...account, senha: "senha-incorreta" })).status,
      401,
    );
    const login = await request("login", account, cookie);
    assert.equal(login.status, 200);
    assert.equal((await request("session", undefined, cookie)).status, 401);
    const newCookie = login.cookie.split(";")[0];
    assert.equal((await request("logout", {}, newCookie)).status, 200);
    assert.equal((await request("session", undefined, newCookie)).status, 401);
    assert.equal(
      (await request("session", undefined, "intermedi_session=inventada"))
        .status,
      401,
    );
    const expires = new DatabaseSync(databasePath);
    expires.prepare("UPDATE sessions SET expires = 0").run();
    expires.close();
    assert.equal(
      (await request("session", undefined, second.cookie.split(";")[0])).status,
      401,
    );
  } finally {
    if (server?.listening) await stop();
    rmSync(directory, { recursive: true, force: true });
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
      email: "renata@example.com",
      unit: "São Paulo",
      status: "Ativo",
    },
    {
      id: "2",
      name: "Paulo Martins",
      email: "paulo@example.com",
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
