import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

const CLIENT_ID = process.env.GH_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID';
const CLIENT_SECRET = process.env.GH_CLIENT_SECRET || 'YOUR_GITHUB_CLIENT_SECRET';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Database
const db = new Database(path.join(__dirname, 'data', 'gitradar.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    github_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    session_token TEXT PRIMARY KEY,
    github_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (github_id) REFERENCES users(github_id)
  );
  CREATE TABLE IF NOT EXISTS votes (
    repo_id TEXT NOT NULL,
    github_id INTEGER NOT NULL,
    vote_type INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (repo_id, github_id),
    FOREIGN KEY (github_id) REFERENCES users(github_id)
  );
`);

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No auth token' });
  const session = db.prepare('SELECT * FROM sessions WHERE session_token = ? AND expires_at > datetime("now")').get(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired token' });
  req.github_id = session.github_id;
  next();
}

// GitHub OAuth
app.get('/auth/github', (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=read:user&redirect_uri=${BASE_URL}/auth/github/callback`;
  res.redirect(url);
});

app.get('/auth/github/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(400).json({ error: 'OAuth failed' });

    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    db.prepare('INSERT OR REPLACE INTO users (github_id, username, avatar_url, token) VALUES (?, ?, ?, ?)').run(
      userData.id, userData.login, userData.avatar_url, tokenData.access_token
    );

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (session_token, github_id, expires_at) VALUES (?, ?, ?)').run(sessionToken, userData.id, expires);

    res.redirect(`${FRONTEND_URL}?token=${sessionToken}`);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Current user
app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT github_id, username, avatar_url FROM users WHERE github_id = ?').get(req.github_id);
  res.json(user);
});

// Logout
app.post('/api/logout', auth, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  db.prepare('DELETE FROM sessions WHERE session_token = ?').run(token);
  res.json({ ok: true });
});

// Vote
app.post('/api/vote', auth, (req, res) => {
  const { repo_id, vote_type } = req.body;
  if (!repo_id || vote_type === undefined) return res.status(400).json({ error: 'Missing repo_id or vote_type' });
  const vt = Math.max(-1, Math.min(1, vote_type));
  if (vt === 0) {
    db.prepare('DELETE FROM votes WHERE repo_id = ? AND github_id = ?').run(repo_id, req.github_id);
  } else {
    db.prepare('INSERT OR REPLACE INTO votes (repo_id, github_id, vote_type) VALUES (?, ?, ?)').run(repo_id, req.github_id, vt);
  }
  res.json({ ok: true, vote_type: vt });
});

// Vote counts
app.get('/api/votes/:repoId', (req, res) => {
  const { repoId } = req.params;
  const counts = db.prepare('SELECT vote_type, COUNT(*) as count FROM votes WHERE repo_id = ? GROUP BY vote_type').all(repoId);
  const total = counts.reduce((s, c) => s + c.count, 0);
  const net = counts.reduce((s, c) => s + (c.vote_type === 1 ? c.count : -c.count), 0);
  res.json({ repo_id: repoId, total, net, details: counts });
});

// User's vote on a repo
app.get('/api/votes/:repoId/user', auth, (req, res) => {
  const vote = db.prepare('SELECT vote_type FROM votes WHERE repo_id = ? AND github_id = ?').get(req.params.repoId, req.github_id);
  res.json({ vote_type: vote?.vote_type || 0 });
});

// Existing trend endpoint
app.get('/api/trends', async (req, res) => {
  try {
    const { lang, time, sort, stars } = req.query;
    let queryParts = [];
    const days = parseInt(time || '7', 10);
    if (days > 0) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      queryParts.push(`created:>${date.toISOString().split('T')[0]}`);
    }
    if (lang) queryParts.push(`language:${lang}`);
    queryParts.push(`stars:>=${stars || 0}`);

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(queryParts.join(' '))}&sort=${sort || 'stars'}&order=desc&per_page=12`;
    const response = await fetch(url, { headers: { 'User-Agent': 'GitRadar-API' } });
    if (!response.ok) return res.status(response.status).json({ error: 'GitHub API limit or invalid request.' });

    const data = await response.json();
    const items = data.items.map(item => {
      const days = Math.max(1, Math.ceil((Date.now() - new Date(item.created_at).getTime()) / 86400000));
      return {
        id: item.id, name: item.name,
        owner: { login: item.owner.login, avatar_url: item.owner.avatar_url },
        description: item.description, stars: item.stargazers_count,
        forks: item.forks_count, language: item.language,
        html_url: item.html_url, created_at: item.created_at,
        velocity_score: parseFloat((item.stargazers_count / days).toFixed(1))
      };
    });
    res.json({ total_results: data.total_count, results: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`GitRadar API on http://localhost:${PORT}`));
