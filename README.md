# ThreadsOC — Inventory

A streetwear reseller inventory & storefront manager. React + TypeScript + Vite +
Tailwind on the front, a typed Express + SQLite API on the back, deployed as a
**single Railway service** (the API also serves the built client).

## Architecture

```
src/          React client (Vite)
server/       Express API — the single authoritative store (SQLite)
shared/       Domain types + pure helpers, imported by BOTH client and server
public/seed/  Bundled product photos
```

- **One source of truth**: the SQLite database on the server. Every mutation
  returns the fresh full state, which the client adopts — no field-by-field
  reconciliation, no drift.
- **localStorage is a cache only.** On boot the client shows the cached snapshot
  instantly, then reconciles against the server and overwrites the cache.
- **Auth**: the owner password lives only in the server env (`AUTH_PASSWORD`).
  Login returns a JWT; every write requires it as a Bearer token. No
  write-capable secret is ever shipped in the client bundle.
- **Pure helpers** (`shared/helpers.ts`): profit, stats, grouping, chip mapping,
  id generation, URL/text sanitization, sale validation — all framework-free.

## Local development

```bash
cp .env.example .env      # set AUTH_PASSWORD (dev default is "letmein")
npm install
npm run dev               # client on :5173 (proxies /api to the API on :3001)
```

## Production build (what Railway runs)

```bash
npm run build             # vite build -> dist/
npm run start             # tsx server/src/index.ts, serves dist/ + /api
```

## Environment variables

| Var             | Purpose                                             |
| --------------- | --------------------------------------------------- |
| `AUTH_PASSWORD` | Owner login password (required in production).      |
| `JWT_SECRET`    | Signs session tokens (required in production).      |
| `DB_PATH`       | SQLite file path. On Railway: `/data/threads.db`.   |
| `NODE_ENV`      | `production` makes the server serve `dist/`.        |
| `PORT`          | Injected by Railway; defaults to 3001 locally.      |

## Deployment (Railway)

Single service, Dockerfile builder, one small volume mounted at `/data` for the
SQLite file. Data persists across redeploys; the starter inventory is only
seeded when the database is empty.

```bash
railway up            # build + deploy from this directory
railway variables     # view/manage env vars
```

To change the login password: `railway variables --set "AUTH_PASSWORD=<new>"`
(triggers a redeploy). Existing sessions stay valid until their JWT expires
(30 days) unless you also rotate `JWT_SECRET`.

## Backup & Restore

- **Backup** downloads the entire state (items + sales) as a JSON file.
- **Restore** reads that file back and replaces server state (transactional).
