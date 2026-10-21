import type { Lang } from '../../../shared/lang.ts';
import type { KnowledgeDocument, RetrievalOutcome, ScoredDocument } from './types.ts';

/**
 * Lightweight lexical retrieval (IDF-weighted term coverage).
 *
 * Deliberately no embeddings/vector DB: for a single company's FAQ-sized corpus
 * (tens of documents) this is accurate enough, has zero cost, no latency and no
 * extra dependency. The interface allows swapping in a vector store later if the
 * corpus grows.
 */

/** Function words across uz/en/ru — they carry no retrieval signal. */
const STOPWORDS = new Set<string>([
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'of', 'to',
  'in', 'on', 'at', 'for', 'with', 'and', 'or', 'if', 'it', 'its', 'this', 'that', 'these',
  'those', 'i', 'you', 'your', 'we', 'our', 'they', 'their', 'he', 'she', 'my', 'me', 'us',
  'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'can', 'could', 'should',
  'would', 'will', 'shall', 'may', 'might', 'must', 'have', 'has', 'had', 'there', 'here',
  'about', 'from', 'by', 'as', 'so', 'than', 'then', 'also', 'any', 'all', 'some', 'please',
  // Uzbek
  'va', 'bu', 'u', 'shu', 'men', 'siz', 'biz', 'ular', 'ning', 'uchun', 'bilan', 'ham',
  'bor', 'yoq', 'nima', 'qanday', 'qayerda', 'qachon', 'kim', 'nega', 'mumkin', 'kerak',
  'edi', 'ekan', 'bolsa', 'lekin', 'ammo', 'yoki', 'deb', 'sizning', 'bizning', 'menga',
  'iltimos', 'rahmat', 'salom', 'xabar', 'savol', 'javob',
  // Russian
  'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она',
  'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'ее',
  'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'когда',
  'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него', 'до',
  'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей',
  'может', 'они', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем',
  'была', 'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет',
  'ж', 'тогда', 'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь',
  'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас', 'были', 'куда', 'зачем',
  'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой', 'хоть', 'после',
  'над', 'больше', 'тот', 'через', 'эти', 'нас', 'про', 'всего', 'них', 'какая', 'много',
  'разве', 'три', 'эту', 'моя', 'впрочем', 'хорошо', 'свою', 'этой', 'перед', 'иногда',
  'лучше', 'чуть', 'том', 'нельзя', 'такой', 'им', 'более', 'всегда', 'конечно', 'всю',
  'между', 'ваш', 'наш', 'ваши', 'наши', 'это', 'эта', 'пожалуйста', 'спасибо', 'привет',
]);

/**
 * Two-character fragments carry no meaning and match by accident. The Uzbek
 * apostrophe (o‘/g‘) is an *intra-word* character: replacing it with a space
 * would split "qo'shinni" into "qo" + "shinni" and create false matches.
 */
const MIN_TOKEN_LENGTH = 3;
const WORD_APOSTROPHES = /[\u0027\u2018\u2019\u02BB\u02BC\u0060\u00B4]/g;

/** Lowercases, strips punctuation and drops stopwords. Cyrillic-safe. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(WORD_APOSTROPHES, '') // keep Uzbek words whole: qo'shinni → qoshinni
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(token));
}

/**
 * Conservative suffix stripping.
 *
 * Cheap substitute for a full stemmer: it makes "return"/"returns"/"returned"
 * and "hour"/"hours" collapse to one term, which is the difference between a
 * realistic customer question matching and being refused. Suffixes are only
 * removed when the remaining stem stays long enough to keep it meaningful.
 */
const SUFFIXES = [
  'lar', 'ning', 'dan', 'dagi', 'ni', 'da',            // Uzbek
  'ами', 'ах', 'ов', 'ам', 'ы', 'и', 'а', 'я', 'е', 'у', // Russian
  'ings', 'ing', 'ies', 'es', 'ed', 'ly', 's',           // English
];

export function stem(token: string): string {
  for (const suffix of SUFFIXES) {
    if (token.length - suffix.length >= 4 && token.endsWith(suffix)) {
      const base = token.slice(0, token.length - suffix.length);
      // "returns" -> "return", "delivery policies" -> "polic" (fine), keep simple.
      return base.endsWith('e') && suffix === 's' ? base : base;
    }
  }
  return token;
}

function stemAll(tokens: string[]): string[] {
  return tokens.map(stem);
}

function documentTerms(doc: KnowledgeDocument): Set<string> {
  return new Set(stemAll(tokenize(`${doc.title} ${doc.text} ${(doc.tags ?? []).join(' ')}`)));
}

export interface RetrieveOptions {
  /** Minimum relevance (0..1) for a document to count as evidence. */
  minScore: number;
  /** How many documents to hand to the model. */
  maxDocuments: number;
}

/**
 * Ranks documents for a question.
 *
 * score = (IDF mass of matched query terms / total IDF mass) / lengthPenalty
 *   - IDF mass means rare terms (e.g. "warranty") outweigh common ones;
 *   - the length penalty stops one huge document from matching everything;
 *   - documents in the question's language get a small boost.
 */
export function retrieve(
  query: string,
  documents: readonly KnowledgeDocument[],
  lang: Lang,
  options: RetrieveOptions,
): RetrievalOutcome {
  const queryTerms = [...new Set(stemAll(tokenize(query)))];
  if (queryTerms.length === 0 || documents.length === 0) {
    return { matches: [], sufficient: false, bestScore: 0 };
  }

  const termSets = documents.map(documentTerms);

  // Document frequency for IDF.
  const df = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const terms of termSets) if (terms.has(term)) count += 1;
    df.set(term, count);
  }

  const totalDocs = documents.length;
  const idf = (term: string): number => Math.log(1 + totalDocs / (1 + (df.get(term) ?? 0)));

  /**
   * Only terms that exist in *some* document can be evidence. Words the corpus
   * has never seen ("long", "take", "please") are neutral noise: counting them
   * would make ordinary conversational phrasing fail to match, while an
   * unrelated question still matches nothing at all and is still refused.
   */
  const matchableTerms = queryTerms.filter((term) => (df.get(term) ?? 0) > 0);
  if (matchableTerms.length === 0) {
    return { matches: [], sufficient: false, bestScore: 0 };
  }

  // Coverage must be measured over matchable terms only: a word the corpus has
  // never seen cannot be evidence either way, and counting it in the
  // denominator would reject valid questions that happen to be wordy.
  const queryIdfTotal = matchableTerms.reduce((sum, term) => sum + idf(term), 0);
  if (queryIdfTotal <= 0) {
    return { matches: [], sufficient: false, bestScore: 0 };
  }

  const scored: ScoredDocument[] = [];
  documents.forEach((doc, index) => {
    const terms = termSets[index] ?? new Set<string>();
    const matched = matchableTerms.filter((term) => terms.has(term));
    if (matched.length === 0) return;

    const matchedIdf = matched.reduce((sum, term) => sum + idf(term), 0);
    const coverage = matchedIdf / queryIdfTotal;

    // Length attenuation: 1 for short docs, smaller for very long ones.
    const lengthPenalty = 1 + Math.log10(1 + terms.size / 120);
    let score = coverage / lengthPenalty;

    // Small language affinity boost (never enough to fabricate evidence).
    if (doc.lang === lang) score *= 1.08;

    scored.push({ doc, score: Math.min(1, Number(score.toFixed(4))), matchedTerms: matched });
  });

  scored.sort((a, b) => b.score - a.score);
  const bestScore = scored[0]?.score ?? 0;
  const matches = scored.filter((item) => item.score >= options.minScore).slice(0, options.maxDocuments);

  return { matches, sufficient: matches.length > 0, bestScore };
}
