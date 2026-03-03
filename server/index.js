import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import webpush from 'web-push';
import cron from 'node-cron';

const PORT = Number(process.env.PORT ?? 8787);
const SESSION_DAYS = 30;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://subnote.up.railway.app';
const CAPACITOR_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost', 'ionic://localhost'];
const LOCAL_DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

// Turso (libSQL) クライアント
const tursoUrl = process.env.TURSO_DATABASE_URL ?? `file:${path.join(__dirname, 'subnote.db')}`;
const client = createClient({
  url: tursoUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// sqlite パッケージと同じ API でラップ
const db = {
  get: async (sql, ...args) => {
    const result = await client.execute({ sql, args });
    return result.rows[0] ?? null;
  },
  all: async (sql, ...args) => {
    const result = await client.execute({ sql, args });
    return result.rows;
  },
  run: async (sql, ...args) => {
    await client.execute({ sql, args });
  },
};

await client.executeMultiple(`
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

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    user_id TEXT PRIMARY KEY,
    subscription_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// VAPID キー初期化（DBに保存して永続化）
let vapidPublicKey = '';

async function initVapidKeys() {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    const pubRow = await db.get("SELECT value FROM app_settings WHERE key = 'vapid_public_key'");
    const privRow = await db.get("SELECT value FROM app_settings WHERE key = 'vapid_private_key'");

    if (pubRow && privRow) {
      publicKey = pubRow.value;
      privateKey = privRow.value;
    } else {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
      await db.run(
        "INSERT INTO app_settings (key, value) VALUES ('vapid_public_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        publicKey
      );
      await db.run(
        "INSERT INTO app_settings (key, value) VALUES ('vapid_private_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        privateKey
      );
      console.log('[VAPID] 新しいキーを生成してDBに保存しました');
    }
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'noreply@subnote.app'}`,
    publicKey,
    privateKey
  );
  vapidPublicKey = publicKey;
  console.log('[VAPID] キー初期化完了');
}

await initVapidKeys();

// 通知送信ユーティリティ
function addDaysToDateStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getTodayJST() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

async function sendRenewalNotifications() {
  try {
    const today = getTodayJST();
    const in1day = addDaysToDateStr(today, 1);
    const in3days = addDaysToDateStr(today, 3);

    const rows = await db.all(`
      SELECT ps.user_id, ps.subscription_json, us.state_json
      FROM push_subscriptions ps
      JOIN user_states us ON us.user_id = ps.user_id
    `);

    let notifCount = 0;
    for (const row of rows) {
      try {
        const state = JSON.parse(row.state_json);
        const pushSub = JSON.parse(row.subscription_json);
        const subs = state?.subscriptions ?? [];

        for (const sub of subs) {
          if (sub.status !== 'active') continue;

          const daysUntil =
            sub.nextBillingDate === in1day ? 1 :
            sub.nextBillingDate === in3days ? 3 :
            null;
          if (daysUntil === null) continue;

          const amount = sub.currency === 'JPY'
            ? `¥${Number(sub.amount).toLocaleString('ja-JP')}`
            : `$${sub.amount}`;
          const timing = daysUntil === 1 ? '明日' : '3日後';

          await webpush.sendNotification(
            pushSub,
            JSON.stringify({
              title: `${sub.name} の更新は${timing}です`,
              body: `${amount} が請求される予定です`,
              icon: '/icon-192.png',
              url: '/app',
            })
          );
          notifCount++;
        }
      } catch (e) {
        console.error('[Push] ユーザー', row.user_id, 'への送信エラー:', e.message);
        // 期限切れ・無効なサブスクリプションは削除
        if (e.statusCode === 410 || e.statusCode === 404) {
          await db.run('DELETE FROM push_subscriptions WHERE user_id = ?', row.user_id);
        }
      }
    }
    if (notifCount > 0) console.log(`[Push] ${notifCount}件の通知を送信しました`);
  } catch (e) {
    console.error('[Push] cron エラー:', e.message);
  }
}

// 毎朝 9:00 JST (= 0:00 UTC) に通知チェック
cron.schedule('0 0 * * *', () => {
  console.log('[Cron] 更新通知チェック開始...');
  void sendRenewalNotifications();
});

const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = [ALLOWED_ORIGIN, ...CAPACITOR_ORIGINS, ...LOCAL_DEV_ORIGINS];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

if (isProd) {
  app.use(express.static(distPath));
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too_many_requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'subnote-auth-api',
    endpoints: ['/api/auth/register', '/api/auth/login', '/api/auth/session', '/api/auth/logout', '/api/state', '/api/push-subscription'],
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/debug/db', async (_req, res) => {
  try {
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    res.json({
      db: tursoUrl.startsWith('file:') ? 'local-sqlite' : 'turso-cloud',
      url: tursoUrl.startsWith('file:') ? tursoUrl : tursoUrl.replace(/\/\/.*@/, '//***@'),
      userCount: userCount?.count ?? 0,
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
  // Cookie を優先（Web ブラウザ）、次に Authorization ヘッダー（Capacitor 等）
  if (req.cookies?.auth_token) return req.cookies.auth_token;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

function setAuthCookie(res, token) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie('auth_token', { path: '/' });
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
    setAuthCookie(res, session.token);
    return res.json({
      user: { id, username, createdAt },
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
    setAuthCookie(res, session.token);
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
    // Migration: if authenticated via Bearer header (legacy localStorage token),
    // set a Cookie so subsequent requests use Cookie-based auth.
    const token = getTokenFromRequest(req);
    if (token && !req.cookies?.auth_token) {
      setAuthCookie(res, token);
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
    clearAuthCookie(res);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

// プッシュ通知エンドポイント
app.get('/api/vapid-public-key', (_req, res) => {
  if (!vapidPublicKey) return res.status(503).json({ error: 'vapid_not_ready' });
  res.json({ publicKey: vapidPublicKey });
});

app.post('/api/push-subscription', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const subscription = req.body?.subscription;
    if (!subscription || typeof subscription !== 'object') {
      return res.status(400).json({ error: 'invalid_subscription' });
    }

    await db.run(
      `INSERT INTO push_subscriptions (user_id, subscription_json, created_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET subscription_json = excluded.subscription_json, created_at = excluded.created_at`,
      user.id,
      JSON.stringify(subscription),
      new Date().toISOString()
    );

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.delete('/api/push-subscription', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    await db.run('DELETE FROM push_subscriptions WHERE user_id = ?', user.id);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'server_error' });
  }
});

if (isProd) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(`SubNote API running on port ${PORT}`);
  console.log(`DB: ${tursoUrl.startsWith('file:') ? 'local SQLite' : 'Turso cloud'}`);
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  console.log(`Users in DB: ${userCount?.count ?? 0}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
