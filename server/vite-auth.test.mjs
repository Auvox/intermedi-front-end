import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import { createServer } from 'vite';
import { authPlugin } from './vite-auth.mjs';
import { mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';

test('Vite atende contas na mesma porta, mesmo com a porta preferida ocupada', async () => {
  const occupied = createHttpServer();
  occupied.listen(0, '127.0.0.1');
  await once(occupied, 'listening');
  const requestedPort = occupied.address().port;
  let vite;
  const directory = mkdtempSync(join(tmpdir(), 'intermedi-vite-test-'));
  const databasePath = join(directory, 'auth.sqlite');
  try {
    vite = await createServer({
      configFile: false, logLevel: 'silent', root: directory, cacheDir: join(directory, 'cache'),
      plugins: [authPlugin({ databasePath })],
      server: { host: '127.0.0.1', port: requestedPort, strictPort: false, fs: { allow: [directory] } },
    });
    await vite.listen();
    const actualPort = vite.httpServer.address().port;
    assert.notEqual(actualPort, requestedPort);
    const base = `http://127.0.0.1:${actualPort}`;
    const databaseDownload = await fetch(`${base}/@fs/${databasePath.replaceAll('\\', '/')}`);
    assert.equal(databaseDownload.status, 403, 'O banco de contas nunca pode ser baixado pelo Vite');
    async function request(path, data, cookie = '', origin = base) {
      const response = await fetch(`${base}/api/auth/${path}`, {
        method: data ? 'POST' : 'GET',
        headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie },
        body: data ? JSON.stringify(data) : undefined,
      });
      return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
    }
    assert.equal((await request('session')).status, 401);
    const account = { nome: 'Teste integrado', unidade: 'Unidade de teste', role: 'gerente', email: 'vite@example.com', senha: 'teste-integrado-123', confirmarSenha: 'teste-integrado-123' };
    assert.equal((await request('register', account, '', 'https://terceiro.example')).status, 403);
    const registered = await request('register', account);
    assert.equal(registered.status, 201);
    assert.equal((await request('session', undefined, registered.cookie)).body.user.id, registered.body.user.id);
    assert.equal((await request('logout', {}, registered.cookie)).status, 200);
    assert.equal((await request('session', undefined, registered.cookie)).status, 401);
    const loggedIn = await request('login', account);
    assert.equal(loggedIn.status, 200);
    assert.equal((await request('session', undefined, loggedIn.cookie)).body.user.role, 'gerente');
    await vite.close();
    assert.equal(vite.httpServer.listening, false);
    // The same port can be reused immediately after closing the one server.
    vite = await createServer({ configFile: false, logLevel: 'silent', root: directory, cacheDir: join(directory, 'cache'), plugins: [authPlugin({ databasePath: ':memory:' })], server: { host: '127.0.0.1', port: actualPort, strictPort: true } });
    await vite.listen();
    assert.equal(vite.httpServer.address().port, actualPort);
  } finally {
    await vite?.close();
    const closed = once(occupied, 'close'); occupied.close(); await closed;
    const temporaryRelative = relative(realpathSync(tmpdir()), realpathSync(directory));
    assert(temporaryRelative && !temporaryRelative.startsWith('..') && !isAbsolute(temporaryRelative));
    rmSync(directory, { recursive: true, force: true });
  }
});
