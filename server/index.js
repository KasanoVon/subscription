import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const PORT = Number(process.env.PORT ?? 8787);
const SESSION_DAYS = 30;
// 本番では環境変数で指定: ALLOWED_ORIGIN=https://yourdomain.com
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://subnote.up.railway.app';
// Capacitor (Android/iOS) のオリジン
const CAPACITOR_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost', 'ionic://localhost'];
// ローカル開発用
const LOCAL_DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 本番では DB_PATH=/data/subnote.db のように環境変数で永続ボリュームを指定
const dbPath = process.env.DB_PATH ?? path.join(__dirname, 'subnote.db');
const distPath = path.join(__dirname, '..', 'dist');

// DBファイルの親ディレクトリが存在しない場合は作成
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = await open({
  filename: dbPath,
  driver: sqlite3.Database,
});

await db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS user_states (
    user_id TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const isProd = process.env.NODE_ENV === 'production';

const app = express();
// Railway等のリバースプロキシを信頼する（レートリミットの正確なIP識別に必要）
app.set('trust proxy', 1);
const allowedOrigins = [ALLOWED_ORIGIN, ...CAPACITOR_ORIGINS, ...LOCAL_DEV_ORIGINS];
app.use(cors({
  origin: (origin, callback) => {
    // originがない場合（同一オリジンやサーバー間通信）は許可
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// 本番環境: ビルド済みフロントエンドを配信
if (isProd) {
  app.use(express.static(distPath));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10,                   // 同一IPから10回まで
  message: { error: 'too_many_requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'subnote-auth-api',
    endpoints: ['/api/auth/register', '/api/auth/login', '/api/auth/session', '/api/auth/logout', '/api/state'],
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const STARTUP_FILE = '/data/startup-history.json';

function recordStartup() {
  const now = new Date().toISOString();
  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(STARTUP_FILE, 'utf8'));
  } catch { /* first run or volume reset */ }
  history.push(now);
  try { fs.writeFileSync(STARTUP_FILE, JSON.stringify(history)); } catch { /* ignore */ }
}

recordStartup();

app.get('/api/debug/db', async (_req, res) => {
  try {
    const dbExists = fs.existsSync(dbPath);
    const dbSize = dbExists ? fs.statSync(dbPath).size : 0;
    let dataDir = null;
    try { dataDir = fs.readdirSync('/data'); } catch { dataDir = 'not accessible'; }
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    let startupHistory = [];
    try { startupHistory = JSON.parse(fs.readFileSync(STARTUP_FILE, 'utf8')); } catch { /* ignore */ }
    res.json({
      DB_PATH_env: process.env.DB_PATH ?? '(not set)',
      dbPath,
      dbExists,
      dbSize,
      dataDir,
      userCount: userCount?.count ?? 0,
      startupHistory,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sanitizeUser(userRow) {
  return {
    id: userRow.id,
    username: userRow.username,
    createdAt: userRow.created_at,
  };
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

async function createSession(userId) {
  const token = createSessionToken();
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await db.run(
    'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    token,
    userId,
    expiresAt,
    new Date().toISOString()
  );
  return { token, expiresAt };
}

async function deleteExpiredSessions() {
  await db.run('DELETE FROM sessions WHERE expires_at <= ?', Date.now());
}

async function getAuthUser(req) {
  await deleteExpiredSessions();
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const row = await db.get(
    `
      SELECT u.id, u.username, u.created_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?
    `,
    token,
    Date.now()
  );
  return row ?? null;
}

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (username.length < 2 || username.length > 32 || password.length < 6) {
      return res.status(400).json({ error: 'invalid_input' });
    }

    const existing = await db.get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', username);
    if (existing) {
      return res.status(409).json({ error: 'username_taken' });
    }

    const id = crypto.randomUUID().replace(/-/g, '');
    const createdAt = new Date().toISOString().slice(0, 10);
    const passwordHash = await bcrypt.hash(password, 10);

    await db.run(
      'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
      id,
      username,
      passwordHash,
      createdAt
    );

    const session = await createSession(id);
    return res.json({
      user: {
        id,
        username,
        createdAt,
      },
      token: session.token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!username || !password) {
      return res.status(400).json({ error: 'invalid_input' });
    }

    const userRow = await db.get(
      'SELECT id, username, password_hash, created_at FROM users WHERE username = ? COLLATE NOCASE',
      username
    );

    if (!userRow) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const session = await createSession(userRow.id);
    return res.json({ user: sanitizeUser(userRow), token: session.token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/auth/session', async (req, res) => {
  try {
    const row = await getAuthUser(req);

    if (!row) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    return res.json({ user: sanitizeUser(row) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/state', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const row = await db.get('SELECT state_json FROM user_states WHERE user_id = ?', user.id);
    if (!row) {
      return res.json({ state: null });
    }
    return res.json({ state: JSON.parse(row.state_json) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.put('/api/state', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const state = req.body?.state;
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'invalid_state' });
    }

    const stateJson = JSON.stringify(state);
    const now = new Date().toISOString();

    await db.run(
      `
      INSERT INTO user_states (user_id, state_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
      `,
      user.id,
      stateJson,
      now
    );

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (token) {
      await db.run('DELETE FROM sessions WHERE token = ?', token);
    }
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

// SPA フォールバック: /api 以外は index.html を返す（本番のみ）
if (isProd) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(`Auth API server running on http://localhost:${PORT}`);
  console.log(`DB_PATH env: [${process.env.DB_PATH ?? '(not set)'}]`);
  console.log(`dbPath resolved: [${dbPath}]`);
  const dbExists = fs.existsSync(dbPath);
  const dbSize = dbExists ? fs.statSync(dbPath).size : 0;
  console.log(`DB file: ${dbExists ? `exists (${dbSize} bytes)` : 'NEW (first run or wiped)'}`);
  try {
    const dataDir = fs.readdirSync('/data');
    console.log(`/data contents: ${JSON.stringify(dataDir)}`);
  } catch {
    console.log('/data directory: not accessible');
  }
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  console.log(`Users in DB: ${userCount?.count ?? 0}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
