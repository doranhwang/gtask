import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const CONFIG_DIR = join(homedir(), '.config', 'gtask');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export const CREDENTIALS_PATH = join(CONFIG_DIR, 'credentials.json');
export const TOKENS_DIR = join(CONFIG_DIR, 'tokens');

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
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as Config;
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getTokenPath(alias: string): string {
  return join(TOKENS_DIR, `${alias}.json`);
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
