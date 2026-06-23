# GitRadar

A clean developer dashboard scanning the complete history of GitHub. Monitor, filter, and discover repositories in real-time.

🌐 **Live:** https://alztrk.github.io/gitradar

## Features

- Real-time GitHub trending repos with velocity scoring
- Multi-language filtering (JavaScript, TypeScript, Python, Rust, Go, etc.)
- Project Health Scorecard with detailed breakdown
- Repository comparison matrix (select multiple repos)
- Bookmarks with private notes
- Dark/Light theme
- Turkish / English language support
- Search with advanced filters (date range, stars, license, org/user)
- Rate limit indicator

## Tech

- **Frontend:** React 19, Vite, Tailwind CSS, Recharts, Monaco Editor
- **Backend:** Express.js proxy server (optional, for API rate limit bypass)
- **i18n:** Custom context-based TR/EN translation

## Usage

```bash
npm install
npm run dev        # Start frontend on localhost
npm run server     # Start backend API proxy on port 4000
```

## Deploy

The frontend is deployed to GitHub Pages. The backend proxy server is not included in the Pages build — the app falls back to direct GitHub API calls.

## Setup

### 1. GitHub OAuth App

1. Go to https://github.com/settings/developers → New OAuth App
2. Homepage URL: `https://alztrk.github.io/gitradar`
3. Callback URL: `http://localhost:4000/auth/github/callback` (dev) or `https://gitradar-api.onrender.com/auth/github/callback` (prod)
4. Copy Client ID and Client Secret

### 2. Backend (Render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

Set these environment variables on Render:
- `GH_CLIENT_ID` — from step 1
- `GH_CLIENT_SECRET` — from step 1
- `BASE_URL` — `https://gitradar-api.onrender.com`
- `CORS_ORIGIN` — `https://alztrk.github.io`

### 3. Frontend

```bash
VITE_API_URL=https://gitradar-api.onrender.com npm run build
npm run preview
```

## License

MIT
