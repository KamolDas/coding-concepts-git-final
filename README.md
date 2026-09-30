# Coding Concepts — Git & GitHub Edition

Nine modules tracing version control from the three-area model (working directory → staging → repo) through branching, remotes, history inspection, safe undoing, history rewriting, pull-request collaboration, CI/CD automation, and the power tools experienced developers reach for weekly.

| # | Module |
|---|--------|
| 1 | Git Fundamentals |
| 2 | Branching & Merging |
| 3 | Remote Repositories (GitHub) |
| 4 | History & Diffs |
| 5 | Undoing Changes (restore/revert/reset) |
| 6 | Rebasing & History Rewriting |
| 7 | Pull Requests |
| 8 | GitHub Actions (CI/CD) |
| 9 | Advanced Git (stash, cherry-pick, .gitignore, tags) |

Every chapter's code is real commands meant to run in an actual terminal against a real (even throwaway) repo — each builds on the repo from earlier chapters, the same way a real project's history accumulates.

## A fix worth knowing about

This edition shares its renderer with the C/Arduino/Register-Level editions, which added `//` comment detection for those languages. Git/GitHub examples are full of URLs (`https://github.com/...`), and `//` in a URL isn't a comment — so the shared `assets/app.js` was patched to only treat `//` as a comment start when it's *not* immediately preceded by `:`. Verified directly: Chapter 3's `git clone https://github.com/...` line renders as one unbroken command, not truncated mid-URL.

## Architecture

Same data-driven design as the rest of this series: content lives in `data/*.json`, rendered by a shared `chapter.html` + `assets/app.js`.

```
index.html / chapter.html   — page shells
assets/styles.css           — shared styling
assets/app.js                — JSON-driven renderer, syntax highlighting, persistence
data/chapters.json           — nav/index summary
data/chapter1.json … 9       — full content per chapter
wrangler.toml / package.json — Cloudflare Pages config + npm scripts
```

Edit a chapter by editing its `data/chapterN.json` — no HTML/JS changes needed.

## Running locally

```bash
python3 -m http.server 8000   # fetch() needs http://, not file://
```

## Deploying

- **GitHub Pages** — push to GitHub, enable Pages on `main` / root (or drag-and-drop upload via GitHub's web UI, no git needed — a little on-the-nose for this particular edition, but it works).
- **Cloudflare Pages (Git-connected)** — Workers & Pages → Create → Connect to Git → Build command empty, Output directory `/`.
- **Cloudflare Pages (Direct upload)** — Workers & Pages → Create → Upload assets → drag this folder in.
- **Cloudflare Pages (CLI)** — `npm install && npx wrangler login && npm run deploy`.

## Progress

Checklists and notes save to `localStorage` per chapter — nothing leaves the browser.

## Author

Kamol Das · CSE, Oxford University
