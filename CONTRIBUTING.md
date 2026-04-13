# Contributing to LocalShare

First off — thank you for taking the time to contribute! 🎉

LocalShare is intentionally simple and beginner-friendly. Whether you're fixing a typo, reporting a bug, or adding a feature, every contribution matters.

---

## 🐛 Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template. Please include:
- Your OS and Node.js version (`node -v`)
- What you expected vs what happened
- Any error messages from the terminal

## 💡 Suggesting Features

Open a [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) issue. Keep it focused — one idea per issue.

---

## 🛠️ Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/localshare
cd localshare

# 2. Install all dependencies
npm install
cd client && npm install && cd ..

# 3. Run in dev mode (hot reload)
# Terminal 1 — backend
node server/index.js

# Terminal 2 — frontend (Vite dev server with hot reload)
cd client && npx vite
# → Open http://localhost:5173
```

## Project Structure

```
localshare/
├── server/
│   └── index.js        ← Express + WebSocket server
├── client/
│   ├── src/
│   │   ├── main.js     ← All frontend JS (Lucide icons, UI logic)
│   │   └── style.css   ← Tailwind v4 + custom animations
│   ├── index.html
│   └── vite.config.js  ← Dev proxy + build config
├── start.bat           ← One-click launcher (Windows)
├── start.sh            ← One-click launcher (Mac/Linux)
└── README.md
```

## Build for production

```bash
cd client && npx vite build
# Output goes to server/public/ and is served by Express
```

---

## ✅ Pull Request Checklist

- [ ] Code works on Windows, macOS, and Linux
- [ ] UI is tested on mobile screen sizes
- [ ] No new dependencies without discussion
- [ ] Commit messages are clear (`fix: ...`, `feat: ...`, `chore: ...`)

## Code Style

- **Server**: Node.js vanilla — no TypeScript, keep it readable
- **Client**: Vanilla JS with Vite — no frameworks, Tailwind v4 classes only
- **Icons**: Lucide only (already installed)
- Keep functions small and names obvious

---

## Questions?

Open a Discussion or an Issue — happy to help!
