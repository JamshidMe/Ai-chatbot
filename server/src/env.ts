import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url)); // .../server/src

/**
 * `.env` lookup order (later files win):
 *   1. project root  <root>/.env
 *   2. server-local  <root>/server/.env
 *
 * Imported for its side effect by `config.ts`, which guarantees the file is
 * parsed before any `process.env` value is read.
 */
export const ENV_CANDIDATES: readonly string[] = [
  resolve(currentDir, '../../.env'),
  resolve(currentDir, '../.env'),
];

export function loadEnvFiles(): string[] {
  const loaded: string[] = [];
  for (const file of ENV_CANDIDATES) {
    if (!existsSync(file)) continue;
    try {
      // Node >= 20.12 built-in parser; throws on malformed files.
      process.loadEnvFile(file);
      loaded.push(file);
    } catch (error) {
      console.warn(`[env] could not load ${file}: ${(error as Error).message}`);
    }
  }
  return loaded;
}

/** Executed on import so `config.ts` sees the values. */
export const loadedEnvFiles: readonly string[] = loadEnvFiles();
