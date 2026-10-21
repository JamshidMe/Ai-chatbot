import type { WidgetConfigResponse } from '../../../shared/types.ts';
import { Router } from 'express';

import { config } from '../config.ts';
import { knowledgeStatus } from '../knowledge/index.ts';

export const widgetRouter = Router();

/**
 * GET /api/widget
 *
 * Public, non-secret configuration for the embeddable widget: branding, public
 * widget id, languages, limits and whether the corpus is sample data.
 *
 * This is what lets a company change its name/accent/greeting/position through
 * environment variables without rebuilding the frontend.
 */
widgetRouter.get('/', async (_req, res) => {
  const knowledge = await knowledgeStatus();

  const body: WidgetConfigResponse = {
    widgetId: config.widget.id,
    companyName: config.widget.companyName,
    title: config.widget.title,
    greeting: config.widget.greeting,
    accentColor: config.widget.accentColor,
    position: config.widget.position,
    demoData: knowledge.demo,
    languages: [...config.languages],
    limits: {
      maxMessageChars: config.limits.maxMessageChars,
      maxHistoryMessages: config.limits.maxHistoryMessages,
    },
    embedRestricted: config.widget.allowedOrigins.length > 0,
  };

  res.status(200).json(body);
});
