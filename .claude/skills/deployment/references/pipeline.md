# Deployment Pipeline Reference

## Architecture

```
Git Push → Railway (Nixpacks) → Build → Start → Live
```

Railway auto-deploys from the connected branch (usually `main`).

## Build Pipeline (nixpacks.toml)

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["cd frontend && NODE_ENV=development npm ci && cd ../server && npm ci"]

[phases.build]
cmds = ["cd frontend && VITE_API_URL=/api npx vite build"]

[start]
cmd = "cd server && npx knex migrate:latest && node index.js"
```

### Phase Breakdown

1. **Setup**: Node 20 via Nix
2. **Install**: Frontend deps (with devDeps for build tools) + server deps
3. **Build**: Vite builds frontend to `frontend/dist/`
4. **Start**: Run migrations, then start Express server

### Critical: NODE_ENV=development for Install

Frontend install uses `NODE_ENV=development` because Vite, Tailwind, PostCSS etc. are devDependencies. Without this, `npm ci` skips them and the build fails.

## Environment Variables

### Required in Production

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set by Railway Postgres plugin |
| `PORT` | Server port | Auto-set by Railway (usually 8080) |
| `JWT_SECRET` | Auth token signing | Random 32+ char string |
| `NODE_ENV` | Runtime environment | `production` |

### Optional (Feature-Dependent)

| Variable | Purpose |
|----------|---------|
| `GMAIL_CLIENT_ID` | Gmail OAuth integration |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth integration |
| `GMAIL_REDIRECT_URI` | Must be production URL: `https://{app}.railway.app/api/gmail/callback` |
| `ANTHROPIC_API_KEY` | Claude API for PDF extraction |
| `SAMSARA_API_KEY` | Samsara fleet integration |

### Local Dev (.env in server/)

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tms_dev
DB_USER=postgres
DB_PASSWORD=
PORT=3001
```

## Static Serving

Server serves the built frontend:

```js
// server/index.js
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// SPA catch-all (after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});
```

API routes at `/api/*` are handled BEFORE the static catch-all.

## Common Build Failures

### 1. Missing Dependency
```
Error: Cannot find module 'xyz'
```
**Fix**: Check which package.json it belongs in:
- UI libraries → `frontend/package.json`
- Server libraries → `server/package.json`
- Build tools → `frontend/package.json` (devDependencies)

### 2. Vite Build Error
```
[vite]: Rollup failed to resolve import
```
**Fix**: Missing import or incorrect path alias. Check `@/` paths resolve correctly via vite.config.js alias.

### 3. PostCSS/Tailwind Error
```
Error: PostCSS plugin tailwindcss requires PostCSS 8
```
**Fix**: Version mismatch. Check `frontend/package.json` for compatible versions.

### 4. Migration Error on Start
```
migration "025_xxx" failed
```
**Fix**: Migration has an error that only surfaces with production data. Test against a DB dump first.

### 5. Port Binding Error
```
Error: listen EADDRINUSE
```
**Fix**: Ensure code uses `process.env.PORT`, not a hardcoded port.

## Local Build Verification

Before pushing:

```bash
# 1. Build frontend exactly as Railway does
cd frontend && VITE_API_URL=/api npx vite build

# 2. Check for build warnings/errors
# Zero errors = safe to deploy

# 3. Verify no hardcoded localhost in built output
grep -r "localhost" frontend/dist/ || echo "Clean"
```

## Deployment Commands

```bash
# Deploy (Railway auto-deploys from main)
git push origin main

# Manual trigger (if Railway CLI installed)
railway up

# Check logs
railway logs

# Set env var
railway variables set KEY=VALUE

# Open dashboard
railway open
```

## Rollback Options

1. **Railway Dashboard**: Click "Rollback" on previous deployment
2. **Git revert**: `git revert HEAD && git push origin main`
3. **Force deploy specific commit**: Use Railway dashboard to deploy a specific commit

## Migration Safety

Before deploying migrations that modify existing data:

1. **Additive is safe**: New tables, new columns with defaults
2. **Destructive needs care**: Dropping columns, renaming, changing types
3. **Always include down()**: Every migration must be reversible
4. **Test against prod data**: If possible, test migration on a DB dump first
5. **One concern per migration**: Don't bundle unrelated changes
