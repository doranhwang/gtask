import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

export const CONFIG_DIR = join(homedir(), '.config', 'gtask');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export const CREDENTIALS_PATH = join(CONFIG_DIR, 'credentials.json');
export const TOKENS_DIR = join(CONFIG_DIR, 'tokens');

const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function validateAlias(alias: string): void {
  if (!ALIAS_PATTERN.test(alias)) {
    throw new Error(
      `Invalid alias "${alias}". Use only letters, numbers, underscores, and hyphens.`,
    );
  }
}

export interface AccountConfig {
  email: string;
  label: string;
}

export interface Config {
  default_alias?: string;
  accounts: Record<string, AccountConfig>;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  if (!existsSync(TOKENS_DIR)) {
    mkdirSync(TOKENS_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadConfig(): Config {
  ensureConfigDir();
  if (!existsSync(CONFIG_PATH)) {
    return { accounts: {} };
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as Config;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Failed to parse config.json: ${msg}. Fix or remove ${CONFIG_PATH} and retry.`,
    );
  }
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getTokenPath(alias: string): string {
  validateAlias(alias);
  const target = resolve(TOKENS_DIR, `${alias}.json`);
  const baseResolved = resolve(TOKENS_DIR);
  if (!target.startsWith(baseResolved + '/')) {
    throw new Error(`Path traversal attempt for alias "${alias}"`);
  }
  return target;
}

export function listAliases(): string[] {
  return Object.keys(loadConfig().accounts);
}

export function getAccount(alias: string): AccountConfig | undefined {
  return loadConfig().accounts[alias];
}

export function getDefaultAlias(): string | undefined {
  return loadConfig().default_alias;
}
