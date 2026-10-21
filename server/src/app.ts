import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import express, { type Express } from 'express';

import { config } from './config.ts';
import { errorHandler, notFoundHandler } from './middleware/errors.ts';
import { requestContext } from './middleware/requestContext.ts';
import { chatRouter } from './routes/chat.ts';
import { healthRouter } from './routes/health.ts';
import { widgetRouter } from './routes/widget.ts';
import { apiCors } from './security/cors.ts';
import { apiHeaders, applyHtmlHeaders, baseHeaders } from './security/headers.ts';

const currentDir = dirname(fileURLToPath(import.meta.url)); // .../server/src
const webDist = resolve(currentDir, '../../web/dist');

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy !== false) app.set('trust proxy', config.trustProxy);

  app.use(baseHeaders);
  app.use(requestContext);
  app.use(express.json({ limit: config.limits.maxBodyBytes }));

  /**
   * Public widget loader. Served explicitly (before static) so it always gets
   * the right content type, CORS and cache headers, and so a missing build
   * returns a clear 404 instead of the SPA's HTML.
   */
  app.get('/widget.js', (_req, res) => {
    const file = join(webDist, 'widget.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*'); // intentionally public asset
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=300');

    if (!existsSync(file)) {
      res.status(404).send('// widget.js is not built yet. Run: npm run build');
      return;
    }
    res.sendFile(file);
  });

  const api = express.Router();
  api.use(apiCors);
  api.use(apiHeaders);
  api.use('/health', healthRouter);
  api.use('/chat', chatRouter);
  api.use('/widget', widgetRouter);
  app.use('/api', api);

  // Serve the built SPA when present (after `npm run build`; Vite serves it in dev).
  if (existsSync(join(webDist, 'index.html'))) {
    app.use(
      express.static(webDist, {
        index: false,
        setHeaders: (res, filePath) => {
          // Vite emits content-hashed asset names → safe to cache immutably.
          if (filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );

    const sendHtml = (scope: 'app' | 'embed') => (_req: express.Request, res: express.Response) => {
      applyHtmlHeaders(res, scope);
      res.sendFile(join(webDist, 'index.html'));
    };

    // The embeddable surface: framable only by the configured company origins.
    app.get('/embed', sendHtml('embed'));
    app.get(['/', '/index.html'], sendHtml('app'));

    // Everything else that is not API/widget.js gets the app shell.
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      if (req.path.startsWith('/api') || req.path === '/widget.js') {
        next();
        return;
      }
      applyHtmlHeaders(res, 'app');
      res.sendFile(join(webDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
