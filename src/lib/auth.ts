import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import http from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import open from 'open';
import { CREDENTIALS_PATH, getTokenPath, ensureConfigDir } from './config.js';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

const SCOPES = ['https://www.googleapis.com/auth/tasks'];
const AUTH_TIMEOUT_MS = 120_000;

interface CredentialsFile {
  installed?: { client_id: string; client_secret: string };
  web?: { client_id: string; client_secret: string };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadCredentials(): { client_id: string; client_secret: string } {
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Credentials not found at ${CREDENTIALS_PATH}.\n` +
        `Create OAuth Client (Desktop app) in Google Cloud Console, ` +
        `then save the downloaded JSON as ${CREDENTIALS_PATH}.`,
    );
  }
  let data: CredentialsFile;
  try {
    data = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8')) as CredentialsFile;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse credentials.json: ${msg}`);
  }
  const info = data.installed ?? data.web;
  if (!info || typeof info.client_id !== 'string' || typeof info.client_secret !== 'string') {
    throw new Error('Invalid credentials.json: missing or malformed "installed"/"web" section');
  }
  return { client_id: info.client_id, client_secret: info.client_secret };
}

function makeOAuthClient(redirectUri: string): OAuth2Client {
  const { client_id, client_secret } = loadCredentials();
  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

interface AuthCodeResult {
  code: string;
  redirectUri: string;
}

async function awaitAuthCode(): Promise<AuthCodeResult> {
  const expectedState = crypto.randomBytes(16).toString('hex');

  return new Promise<AuthCodeResult>((resolve, reject) => {
    let timer: NodeJS.Timeout | undefined;

    const server = http.createServer((req, res) => {
      const closeAll = () => {
        if (timer) clearTimeout(timer);
        timer = undefined;
        server.close();
      };
      try {
        if (!req.url) return;
        const url = new URL(req.url, 'http://localhost');
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const state = url.searchParams.get('state');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Auth error: ${escapeHtml(error)}</h1>`);
          closeAll();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        if (!code) return;
        if (state !== expectedState) {
          res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>State mismatch — possible CSRF, request rejected.</h1>');
          closeAll();
          reject(new Error('OAuth state mismatch — possible CSRF'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Authentication complete. You may close this tab.</h1>');
        const addr = server.address();
        const port = addr && typeof addr !== 'string' ? addr.port : 0;
        closeAll();
        resolve({ code, redirectUri: `http://127.0.0.1:${port}` });
      } catch (e) {
        closeAll();
        reject(e as Error);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Failed to bind loopback server'));
        return;
      }
      const redirectUri = `http://127.0.0.1:${addr.port}`;
      const client = makeOAuthClient(redirectUri);
      const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        state: expectedState,
      });
      open(authUrl).catch(() => {
        console.log(`\nOpen this URL manually:\n${authUrl}\n`);
      });
      timer = setTimeout(() => {
        server.close();
        reject(new Error(`OAuth flow timed out after ${AUTH_TIMEOUT_MS / 1000}s`));
      }, AUTH_TIMEOUT_MS);
    });

    server.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
  });
}

export async function authenticate(alias: string): Promise<void> {
  ensureConfigDir();
  const { code, redirectUri } = await awaitAuthCode();
  const client = makeOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  const tokenPath = getTokenPath(alias);
  writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  chmodSync(tokenPath, 0o600);
}

export async function getAuthClient(alias: string): Promise<OAuth2Client> {
  const tokenPath = getTokenPath(alias);
  if (!existsSync(tokenPath)) {
    throw new Error(`No token for "${alias}". Run: gtask auth add ${alias}`);
  }
  let tokens: Record<string, unknown>;
  try {
    tokens = JSON.parse(readFileSync(tokenPath, 'utf-8')) as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse token file for "${alias}": ${msg}`);
  }
  const client = makeOAuthClient('http://localhost');
  client.setCredentials(tokens);
  client.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    writeFileSync(tokenPath, JSON.stringify(merged, null, 2), { mode: 0o600 });
    chmodSync(tokenPath, 0o600);
  });
  return client;
}
