import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Lang } from '../../../shared/lang.ts';
import { config } from '../config.ts';
import { FileKnowledgeProvider } from './loader.ts';
import { retrieve } from './retrieval.ts';
import type { KnowledgeBase, RetrievalOutcome } from './types.ts';

const currentDir = dirname(fileURLToPath(import.meta.url)); // .../server/src/knowledge
const serverRoot = resolve(currentDir, '../..'); // .../server

/** Absolute path of a knowledge directory configured relative to `server/`. */
function knowledgeDir(name: string): string {
  return resolve(serverRoot, config.knowledge.directory, name);
}

let cachedBase: KnowledgeBase | null = null;
let loadPromise: Promise<KnowledgeBase> | null = null;

/**
 * Loads the knowledge base once, then serves it from memory.
 *
 * Resolution order:
 *   1. `company/`  — real, company-owned documents (production path)
 *   2. `sample/`   — only when KNOWLEDGE_ALLOW_SAMPLE is true (clearly flagged)
 *   3. empty       — the assistant then refuses every company question
 */
export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  if (cachedBase) return cachedBase;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const companyDir = knowledgeDir('company');
    if (existsSync(companyDir)) {
      const companyBase = await new FileKnowledgeProvider({
        directory: companyDir,
        source: 'company',
        companyNameFallback: config.widget.companyName,
      }).load();
      if (companyBase.documents.length > 0) {
        cachedBase = companyBase;
        return companyBase;
      }
    }

    if (config.knowledge.allowSample) {
      const sampleBase = await new FileKnowledgeProvider({
        directory: knowledgeDir('sample'),
        source: 'sample',
        companyNameFallback: config.widget.companyName,
      }).load();
      if (sampleBase.documents.length > 0) {
        cachedBase = sampleBase;
        return sampleBase;
      }
    }

    cachedBase = {
      source: 'none',
      companyName: config.widget.companyName,
      documents: [],
      loadedAt: new Date().toISOString(),
    };
    return cachedBase;
  })();

  return loadPromise;
}

/** Retrieves grounding evidence for a question. Never throws. */
export async function lookupCompanyContext(
  query: string,
  lang: Lang,
): Promise<{ base: KnowledgeBase; outcome: RetrievalOutcome }> {
  const base = await getKnowledgeBase();
  const outcome = base.documents.length === 0
    ? { matches: [], sufficient: false, bestScore: 0 }
    : retrieve(query, base.documents, lang, {
        minScore: config.knowledge.minScore,
        maxDocuments: config.knowledge.maxDocuments,
      });

  return { base, outcome };
}

/** Safe, secret-free summary for /api/health and /api/widget. */
export async function knowledgeStatus(): Promise<{
  source: KnowledgeBase['source'];
  documents: number;
  demo: boolean;
  loadedAt: string | null;
}> {
  const base = await getKnowledgeBase();
  return {
    source: base.source,
    documents: base.documents.length,
    demo: base.source === 'sample',
    loadedAt: base.source === 'none' ? null : base.loadedAt,
  };
}
