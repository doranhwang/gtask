import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CONFIG_DIR, ensureConfigDir } from './config.js';

const LAST_LIST_PATH = join(CONFIG_DIR, 'last-list.json');

export interface ListCacheEntry {
  alias: string;
  listId: string;
  taskId: string;
}

export function saveListCache(entries: ListCacheEntry[]): void {
  ensureConfigDir();
  writeFileSync(LAST_LIST_PATH, JSON.stringify(entries, null, 2), { mode: 0o600 });
}

export function loadListCache(): ListCacheEntry[] {
  if (!existsSync(LAST_LIST_PATH)) return [];
  try {
    return JSON.parse(readFileSync(LAST_LIST_PATH, 'utf-8')) as ListCacheEntry[];
  } catch {
    return [];
  }
}

export function resolveTaskRef(input: string): ListCacheEntry {
  if (/^\d+$/.test(input)) {
    const idx = parseInt(input, 10) - 1;
    const cache = loadListCache();
    if (idx < 0 || idx >= cache.length) {
      throw new Error(
        `No cached task at index ${idx + 1}. Run 'gtask list' first to populate index.`,
      );
    }
    return cache[idx]!;
  }
  const parts = input.split(':');
  if (parts.length < 3) {
    throw new Error(`Invalid task ref: ${input}. Expected numeric index or alias:listId:taskId`);
  }
  const [alias, listId, ...rest] = parts;
  return { alias: alias!, listId: listId!, taskId: rest.join(':') };
}
