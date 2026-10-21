import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { KnowledgeBase, KnowledgeDocument, KnowledgeProvider } from './types.ts';

/**
 * JSON-file knowledge provider.
 *
 * The production path is a `company/` directory of curated JSON documents that
 * the company owns. If that directory is absent, an explicitly flagged `sample/`
 * dataset may be loaded so the UI can be exercised end-to-end — the resulting
 * `source: 'sample'` is surfaced by /api/health and /api/widget, so demo content
 * can never be mistaken for real company data.
 */

const MAX_DOCUMENT_CHARS = 8_000;
const VALID_LANGS = new Set(['uz', 'en', 'ru', 'any']);

interface RawKnowledgeFile {
  company?: { name?: unknown };
  documents?: unknown;
}

function asString(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`document field "${field}" must be a non-empty string`);
  }
  return value.trim().slice(0, maxLength);
}

/** Validates one raw entry; throws with a precise reason otherwise. */
export function parseDocument(raw: unknown): KnowledgeDocument {
  if (typeof raw !== 'object' || raw === null) throw new Error('document must be an object');
  const candidate = raw as Record<string, unknown>;

  const lang = typeof candidate.lang === 'string' ? candidate.lang.trim().toLowerCase() : 'any';
  if (!VALID_LANGS.has(lang)) {
    throw new Error(`document "${String(candidate.id)}" has unsupported lang "${lang}"`);
  }

  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 12)
    : undefined;

  return {
    id: asString(candidate.id, 'id', 80),
    title: asString(candidate.title, 'title', 200),
    lang: lang as KnowledgeDocument['lang'],
    text: asString(candidate.text, 'text', MAX_DOCUMENT_CHARS),
    ...(tags ? { tags } : {}),
  };
}

function readDirectory(directory: string): { documents: KnowledgeDocument[]; companyName: string | null } {
  const documents: KnowledgeDocument[] = [];
  const seen = new Set<string>();
  let companyName: string | null = null;

  for (const file of readdirSync(directory).filter((name) => name.endsWith('.json')).sort()) {
    const path = join(directory, file);
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as RawKnowledgeFile;

    if (typeof parsed.company?.name === 'string' && companyName === null) {
      companyName = parsed.company.name.trim().slice(0, 80);
    }

    if (!Array.isArray(parsed.documents)) {
      throw new Error(`${file}: "documents" must be an array`);
    }

    for (const rawDocument of parsed.documents) {
      const document = parseDocument(rawDocument);
      if (seen.has(document.id)) continue; // first file wins
      seen.add(document.id);
      documents.push(document);
    }
  }

  return { documents, companyName };
}

export interface FileKnowledgeProviderOptions {
  directory: string;
  source: 'company' | 'sample';
  companyNameFallback: string;
}

export class FileKnowledgeProvider implements KnowledgeProvider {
  readonly name: string;
  private readonly options: FileKnowledgeProviderOptions;

  constructor(options: FileKnowledgeProviderOptions) {
    this.options = options;
    this.name = `${options.source}:${options.directory}`;
  }

  async load(): Promise<KnowledgeBase> {
    const { directory, source, companyNameFallback } = this.options;

    if (!existsSync(directory)) {
      return { source: 'none', companyName: companyNameFallback, documents: [], loadedAt: new Date().toISOString() };
    }

    const { documents, companyName } = readDirectory(directory);
    if (documents.length === 0) {
      return { source: 'none', companyName: companyNameFallback, documents: [], loadedAt: new Date().toISOString() };
    }

    return {
      source,
      companyName: companyName ?? companyNameFallback,
      documents,
      loadedAt: new Date().toISOString(),
    };
  }
}
