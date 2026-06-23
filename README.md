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

## License

MIT
