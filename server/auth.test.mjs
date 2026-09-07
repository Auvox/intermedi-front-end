import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createAuthServer } from './auth.mjs';

test('cadastro, persistência, isolamento, login, sessão e logout', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'intermedi-auth-test-'));
  const databasePath = join(directory, 'test.sqlite');
  let server;
  let base;
  const start = async () => { server = createAuthServer({ databasePath }); server.listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`; };
  const stop = async () => { const closed = once(server, 'close'); server.close(); await closed; };
  async function request(path, data, cookie = '', origin = 'http://localhost:5173') {
    const response = await fetch(`${base}/api/auth/${path}`, { method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, cookie: response.headers.get('set-cookie'), body: await response.json() };
  }
  const account = { nome: 'Gerente de teste', unidade: 'Unidade de teste', email: 'gerente@example.com', senha: 'Teste-seguro-123', confirmarSenha: 'Teste-seguro-123', role: 'gerente' };
  try {
    await start();
    assert.equal((await request('session')).status, 401);
    assert.equal((await request('register', account, '', 'https://untrusted.example')).status, 403);
    assert.equal((await request('register', { ...account, role: 'admin' })).status, 403);
    assert.equal((await request('register', { ...account, confirmarSenha: 'diferente' })).status, 400);
    const registered = await request('register', account);
    assert.equal(registered.status, 201);
    assert.match(registered.cookie, /HttpOnly; SameSite=Strict/);
    const cookie = registered.cookie.split(';')[0];
    assert.equal(registered.body.user.role, 'gerente');
    assert.equal((await request('session', undefined, cookie)).body.user.id, registered.body.user.id);
    assert.equal((await request('register', { ...account, email: ' GERENTE@example.com ' })).status, 409);
    const second = await request('register', { ...account, email: 'segundo@example.com' });
    assert.notEqual(second.body.user.unitId, registered.body.user.unitId);
    const inspect = new DatabaseSync(databasePath);
    const row = inspect.prepare('SELECT * FROM users WHERE email = ?').get(account.email);
    assert.notEqual(row.password_hash, account.senha);
    assert.equal(row.password_hash.length, 128);
    assert.equal(inspect.prepare('SELECT COUNT(*) AS count FROM units').get().count, 2);
    inspect.close();
    await stop(); await start();
    assert.equal((await request('session', undefined, cookie)).status, 200);
    assert.equal((await request('login', { ...account, senha: 'senha-incorreta' })).status, 401);
    const login = await request('login', account, cookie);
    assert.equal(login.status, 200);
    assert.equal((await request('session', undefined, cookie)).status, 401);
    const newCookie = login.cookie.split(';')[0];
    assert.equal((await request('logout', {}, newCookie)).status, 200);
    assert.equal((await request('session', undefined, newCookie)).status, 401);
    assert.equal((await request('session', undefined, 'intermedi_session=inventada')).status, 401);
    const expires = new DatabaseSync(databasePath);
    expires.prepare('UPDATE sessions SET expires = 0').run(); expires.close();
    assert.equal((await request('session', undefined, second.cookie.split(';')[0])).status, 401);
  } finally { if (server?.listening) await stop(); rmSync(directory, { recursive: true, force: true }); }
});

test('limita tentativas e rejeita payload inválido', async () => {
  const server = createAuthServer({ databasePath: ':memory:' }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/auth/login`;
  const headers = { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' };
  try {
    const malformed = await fetch(url, { method: 'POST', headers, body: '{' }); assert.equal(malformed.status, 400);
    for (let i = 0; i < 19; i++) await fetch(url, { method: 'POST', headers, body: '{}' });
    const limited = await fetch(url, { method: 'POST', headers, body: '{}' }); assert.equal(limited.status, 429); assert(limited.headers.has('retry-after'));
  } finally { const closed = once(server, 'close'); server.close(); await closed; }
});
