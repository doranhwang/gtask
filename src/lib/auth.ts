import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import http from 'http';
import { URL } from 'url';
import open from 'open';
import { CREDENTIALS_PATH, getTokenPath, ensureConfigDir } from './config.js';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

const SCOPES = ['https://www.googleapis.com/auth/tasks'];
const LOOPBACK_PORT = 53682;

interface CredentialsFile {
  installed?: { client_id: string; client_secret: string };
  web?: { client_id: string; client_secret: string };
}

function loadCredentials(): { client_id: string; client_secret: string } {
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Credentials not found at ${CREDENTIALS_PATH}.\n` +
        `Create OAuth Client (Desktop app) in Google Cloud Console, ` +
        `then save the downloaded JSON as ${CREDENTIALS_PATH}.`,
    );
  }
  const data = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8')) as CredentialsFile;
  const info = data.installed ?? data.web;
  if (!info) {
    throw new Error('Invalid credentials.json: missing "installed" or "web" section');
  }
  return { client_id: info.client_id, client_secret: info.client_secret };
}

function makeOAuthClient(): OAuth2Client {
  const { client_id, client_secret } = loadCredentials();
  return new google.auth.OAuth2(
    client_id,
    client_secret,
    `http://localhost:${LOOPBACK_PORT}`,
  );
}

async function getCodeViaLoopback(client: OAuth2Client): Promise<string> {
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  return new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        if (!req.url) return;
        const url = new URL(req.url, `http://localhost:${LOOPBACK_PORT}`);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>Auth error: ${error}</h1>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Authentication complete. You may close this tab.</h1>');
          server.close();
          resolve(code);
        }
      } catch (e) {
        reject(e as Error);
      }
    });
    server.listen(LOOPBACK_PORT, () => {
      open(authUrl).catch(() => {
        console.log(`\nOpen this URL manually:\n${authUrl}\n`);
      });
    });
    server.on('error', reject);
  });
}

export async function authenticate(alias: string): Promise<void> {
  ensureConfigDir();
  const client = makeOAuthClient();
  const code = await getCodeViaLoopback(client);
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
  const client = makeOAuthClient();
  const tokens = JSON.parse(readFileSync(tokenPath, 'utf-8'));
  client.setCredentials(tokens);
  client.on('tokens', (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    writeFileSync(tokenPath, JSON.stringify(merged, null, 2), { mode: 0o600 });
  });
  return client;
}
