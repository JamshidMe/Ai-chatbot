import type { HealthResponse } from '../../../shared/types.ts';
import { Router } from 'express';

import { config } from '../config.ts';
import { knowledgeStatus } from '../knowledge/index.ts';
import { getProvider, isLiveModelConnected } from '../llm/index.ts';

export const healthRouter = Router();

/**
 * GET /api/health
 *
 * Reports what is actually running. `isMock` / `liveModelConnected` make it
 * impossible to mistake mock mode for a connected AI model, and `knowledge`
 * shows whether answers come from company data or the sample dataset.
 *
 * Never exposes secrets: the API key is reported only as a boolean.
 */
healthRouter.get('/', async (_req, res) => {
  const provider = getProvider();
  const knowledge = await knowledgeStatus();

  const body: HealthResponse = {
    status: 'ok',
    service: config.serviceName,
    version: config.version,
    uptimeSeconds: Number(process.uptime().toFixed(1)),
    node: process.version,
    provider: provider.name,
    model: provider.model,
    isMock: provider.isMock,
    liveModelConnected: isLiveModelConnected(),
    languages: [...config.languages],
    limits: {
      maxMessageChars: config.limits.maxMessageChars,
      maxHistoryMessages: config.limits.maxHistoryMessages,
    },
    knowledge,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(body);
});
