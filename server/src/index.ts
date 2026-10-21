// Load .env before anything reads process.env.
import './env.ts';

import { createApp } from './app.ts';
import { config, hasDeepSeekKey } from './config.ts';
import { knowledgeStatus } from './knowledge/index.ts';
import { describeProvider } from './llm/index.ts';

const app = createApp();

const server = app.listen(config.port, config.host, async () => {
  const envFiles = config.envFiles.length > 0 ? config.envFiles.join(', ') : '(none found)';
  const knowledge = await knowledgeStatus();

  console.log('──────────────────────────────────────────────────────────────');
  console.log(`[${config.serviceName}] v${config.version} listening on http://${config.host}:${config.port}`);
  console.log(`[${config.serviceName}] env: ${envFiles}`);
  console.log(`[${config.serviceName}] LLM: ${describeProvider()}`);
  console.log(
    `[${config.serviceName}] DEEPSEEK_API_KEY present: ${hasDeepSeekKey() ? 'yes (value not logged)' : 'no'}`,
  );
  console.log(
    `[${config.serviceName}] knowledge: source=${knowledge.source} documents=${knowledge.documents} demo=${knowledge.demo}`,
  );
  if (knowledge.source === 'sample') {
    console.warn(
      `[${config.serviceName}] ⚠ SAMPLE DATA ACTIVE — answers are NOT real company information. ` +
        'Add curated JSON documents to server/data/company/ before going live.',
    );
  }
  if (knowledge.source === 'none') {
    console.warn(
      `[${config.serviceName}] ⚠ No knowledge documents found — every company question will be refused. ` +
        'Add JSON documents to server/data/company/.',
    );
  }
  console.log(
    `[${config.serviceName}] widget: id=${config.widget.id} company="${config.widget.companyName}" position=${config.widget.position}`,
  );
  console.log(
    `[${config.serviceName}] embed origins: ${
      config.widget.allowedOrigins.length > 0 ? config.widget.allowedOrigins.join(', ') : '(not configured — self only)'
    }`,
  );
  console.log(
    `[${config.serviceName}] rate limit: ${config.rateLimit.maxPerIp}/IP, ${config.rateLimit.maxPerWidget}/widget per ${Math.round(config.rateLimit.windowMs / 1000)}s`,
  );
  console.log(
    `[${config.serviceName}] languages: ${config.languages.join(', ')} | limits: ${config.limits.maxMessageChars} chars, ${config.limits.maxHistoryMessages} history turns, body ${config.limits.maxBodyBytes}`,
  );
  console.log('──────────────────────────────────────────────────────────────');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[${config.serviceName}] port ${config.port} is already in use. Set PORT in .env.`);
  } else {
    console.error(`[${config.serviceName}] server error:`, error);
  }
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`\n[${config.serviceName}] ${signal} received, shutting down.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref();
  });
}
