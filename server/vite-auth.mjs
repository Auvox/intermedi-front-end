import { createAuthServer } from './auth.mjs';

// Development only: use Vite's HTTP server, with no child process or auth port.
export function authPlugin(options = {}) {
  return {
    name: 'intermedi-local-auth',
    apply: 'serve',
    config() {
      return { server: { fs: { deny: [
        '.env', '.env.*', '*.{crt,pem}', '**/.git/**',
        '**/server/data/**', '**/*.sqlite', '**/*.sqlite-*',
      ] } } };
    },
    configureServer(vite) {
      const auth = createAuthServer({
        ...options,
        origins: () => {
          const address = vite.httpServer?.address();
          if (!address || typeof address === 'string') return [];
          const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
          const configuredHost = vite.config.server.host;
          if (typeof configuredHost === 'string' && !['0.0.0.0', '::'].includes(configuredHost)) hosts.add(configuredHost);
          const protocol = vite.config.server.https ? 'https' : 'http';
          return [...hosts].map(host => `${protocol}://${host}:${address.port}`);
        },
      });
      vite.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0].startsWith('/api/auth/')) auth.emit('request', req, res);
        else next();
      });
      // A non-listening Server still emits close, which releases the SQLite handle.
      vite.httpServer?.once('close', () => auth.close());
    },
  };
}
