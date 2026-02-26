---
name: deployment
description: Handles Railway deployment, build verification, environment configuration, and rollback for the TMS prototype. Use when user says "deploy", "push to production", "Railway deploy", "check deployment", "fix build", "add env var", or asks about deployment issues, build failures, or production configuration.
allowed-tools: "Bash(npx:*) Bash(npm:*) Bash(railway:*) Bash(git:*) Bash(curl:*)"
metadata:
  author: TMS Prototype
  version: 1.0.0
---

# Deployment

Manages Railway deployment pipeline: build verification, environment setup, migration safety, and rollback.

## Instructions

### Step 1: Determine Mode

Based on user request, pick one:

- **Pre-deploy check**: Verify build, run checks, confirm ready to deploy
- **Deploy**: Push to Railway (usually just `git push`)
- **Fix build**: Diagnose and fix build failures
- **Env config**: Add or update Railway environment variables
- **Rollback**: Revert to previous deployment
- **Debug production**: Investigate runtime issues

### Step 2: Pre-Deploy Checklist

ALWAYS run through this before any deploy. Consult `references/pipeline.md` for details.

1. **Build locally**: `cd frontend && VITE_API_URL=/api npx vite build`
2. **Check for new dependencies**: Any `npm install` since last deploy? Verify they're in the right `package.json`
3. **Check migrations**: Any new migration files? Will they run cleanly on production data?
4. **Check env vars**: Any new env vars needed? Add to Railway dashboard first
5. **Check for hardcoded URLs**: No `localhost` references in production code
6. **Git status clean**: All changes committed

### Step 3: Execute

**For Deploy:**
1. Run pre-deploy checklist
2. Push to the deploy branch: `git push origin main` (Railway auto-deploys from main)
3. Monitor Railway logs for build + start success
4. Verify the live URL responds

**For Fix Build:**
1. Read the Railway build log (user provides or check dashboard)
2. Common issues — consult `references/pipeline.md`
3. Fix locally, verify with local build, push fix

**For Env Config:**
1. List required env vars from `references/pipeline.md`
2. Guide user to Railway dashboard or use `railway variables set KEY=VALUE`
3. Redeploy after env changes (Railway may auto-redeploy)

**For Rollback:**
1. Find the last working commit: `git log --oneline -10`
2. Railway supports rollback from dashboard (preferred)
3. Or: revert commit + push

### Step 4: Verify

After deploy:
1. Check Railway logs for "Server running on port" message
2. Hit the live URL — does the login page load?
3. Check API health: `curl https://{app-url}/api/stats`
4. Verify DB migrations ran: check Railway logs for Knex output

## Examples

Example 1: Pre-deploy check
User says: "Is this ready to deploy?"
Actions:
1. Run `cd frontend && VITE_API_URL=/api npx vite build`
2. Check `git status` for uncommitted changes
3. Check for new migration files since last deploy
4. Report: build status, pending changes, migration status
Result: "Build passes. 2 new migrations. Ready to deploy."

Example 2: Build failure
User says: "Railway build failed"
Actions:
1. Ask for build log or check common issues
2. Most likely: missing dependency — check if it's in the right package.json
3. Fix, verify locally, push
Result: Identified missing dep, added to frontend/package.json, pushed fix

Example 3: Add new feature with env var
User says: "Add Stripe integration, needs STRIPE_SECRET_KEY"
Actions:
1. Guide user to add env var in Railway dashboard
2. Reference it in code via `process.env.STRIPE_SECRET_KEY`
3. Add to `.env.example` for documentation
4. Deploy with the new code
Result: Env var configured, code deployed, integration live

## Troubleshooting

Error: Build fails on "MODULE_NOT_FOUND"
Cause: Dependency in wrong package.json or missing from install phase
Solution: Check if the package is in `frontend/package.json` (not root). Nixpacks runs `npm ci` separately for frontend and server.

Error: "ECONNREFUSED" on database
Cause: DATABASE_URL not set or DB not provisioned on Railway
Solution: Check Railway dashboard for Postgres plugin. Verify DATABASE_URL env var exists.

Error: Frontend shows blank page in production
Cause: VITE_API_URL not set correctly during build
Solution: Must be `/api` in production (same-origin). Check nixpacks.toml build command.

Error: Migrations fail on deploy
Cause: Migration assumes empty table but production has data, or references table that doesn't exist yet
Solution: Test migration against a copy of production data. Ensure migration ordering is correct.

Error: "Port already in use" or server won't start
Cause: Railway assigns PORT dynamically. Code must use `process.env.PORT`.
Solution: Verify `const PORT = process.env.PORT || 3001` in server/index.js.
