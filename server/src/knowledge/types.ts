import type { Lang } from '../../../shared/lang.ts';

/** One retrievable unit of company knowledge. */
export interface KnowledgeDocument {
  id: string;
  title: string;
  /** Language of the text; 'any' when it applies to every language. */
  lang: Lang | 'any';
  text: string;
  tags?: string[];
}

export interface KnowledgeBase {
  /** Where the data came from — surfaced in /api/health and /api/widget. */
  source: 'company' | 'sample' | 'none';
  companyName: string;
  documents: KnowledgeDocument[];
  loadedAt: string;
}

export interface ScoredDocument {
  doc: KnowledgeDocument;
  /** 0..1 lexical relevance. */
  score: number;
  matchedTerms: string[];
}

export interface RetrievalOutcome {
  /** Documents above the relevance floor, best first. */
  matches: ScoredDocument[];
  /** False when nothing relevant was found → the assistant must refuse. */
  sufficient: boolean;
  bestScore: number;
}

/**
 * Data-provider seam.
 *
 * Anything that can list documents can back the assistant: a JSON file today,
 * a database or CMS tomorrow. Keeping this interface stable is what allows the
 * grounding logic (and its tests) to stay independent of the storage engine.
 */
export interface KnowledgeProvider {
  readonly name: string;
  load(): Promise<KnowledgeBase>;
}
