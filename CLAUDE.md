# TMS Prototype - Project Rules

## Stack
- **Backend**: Node.js (ESM), Express 4, PostgreSQL, Knex.js 3
- **Frontend**: React 19, Vite 7, shadcn/ui (JSX, new-york style), TanStack React Query v5, Tailwind CSS v4
- **Deployment**: Railway via nixpacks.toml
- **AI**: Anthropic Claude API (PDF extraction)
- **Integrations**: Gmail OAuth, Samsara (partial)

## Skills
- `/db-engineering` — Database schema validation, migration creation, and auditing. **Always invoke before writing any migration or evaluating any schema.**

## Conventions
- All UI components use shadcn/ui. No native HTML `<select>`, no hand-rolled modals/toggles/switches.
- Enum values in DB and code: `SCREAMING_SNAKE_CASE` everywhere. No "Dry Van", no "local".
- API routes scoped under `/api`. Static frontend served before auth middleware.
- Railway PORT comes from env var (auto-assigned, usually 8080). App uses `process.env.PORT || 3001`.

## Known Issues (Current DB)
- `updated_at` columns never auto-update (no trigger)
- Zero non-unique indexes
- Zero CHECK constraints
- 14/27 FKs missing ON DELETE
- Mixed PK types (string vs integer)
- `password_hash` defaults to empty string
- Missing UNIQUE on VIN, unit_number, license_number, mc_number

## External Reference DB
- Company's LoadStop DB at `erpdb.xswift.biz` (user: purvesh_thakre, db: loadstop)
- Rich domain coverage (carriers, locations, leases, teams, endorsements, terminals, routes)
- Poor engineering (type_master anti-pattern, no updated_at, no FKs on type refs)
- Use its domain concepts, not its patterns
