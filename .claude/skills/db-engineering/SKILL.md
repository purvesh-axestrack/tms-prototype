---
name: db-engineering
description: Evaluates and enforces PostgreSQL database engineering best practices. Use when user says "evaluate database", "audit schema", "create migration", "fix database", "review DB", "check schema", or asks about database design quality. Also use automatically before writing any Knex migration.
allowed-tools: "Bash(psql:*) Bash(knex:*)"
metadata:
  author: TMS Prototype
  version: 1.0.0
---

# Database Engineering

## Instructions

### Step 1: Determine Mode

Based on user request, pick one:

- **Evaluate**: Audit a database schema against 12 engineering rules. Read all migration files or connect via psql. Output scored report using `references/evaluation-template.md`.
- **Create migration**: Generate a Knex migration following all rules in `references/rules.md`. Validate every column, constraint, index, and FK before writing.
- **Fix**: Read current migrations, identify all violations of `references/rules.md`, generate a single corrective migration.
- **Compare**: Evaluate two databases using identical criteria. Score both using the same template side by side. Never shift definitions between the two.

### Step 2: Load Rules

Before any evaluation or migration work, read `references/rules.md` for the 12 rules and scoring criteria. Apply every rule — do not skip any.

### Step 3: Execute

**For Evaluate/Compare:**
1. Read all migration files in `server/migrations/` OR connect to external DB via psql
2. For each of the 12 rules, count violations
3. Score using the letter grades defined in `references/rules.md`
4. Output report using format in `references/evaluation-template.md`
5. Domain coverage and domain structure are ALWAYS separate scores

**For Create Migration:**
1. Read `references/rules.md` first
2. Every new column: justify nullability
3. Every enum column: add CHECK constraint
4. Every FK: declare ON DELETE explicitly
5. Every FK column: add btree index
6. Every real-world identifier: add UNIQUE
7. Add updated_at trigger if table is new
8. Use consistent PK type (match existing project convention)
9. Follow naming conventions exactly

**For Fix:**
1. Read all existing migrations to understand current state
2. Read `references/rules.md`
3. List every violation found
4. Generate ONE migration that fixes all issues (indexes, CHECK constraints, ON DELETE, UNIQUE, triggers, etc.)

### Step 4: Validate

Before presenting any migration:
- Verify it follows all 12 rules
- Verify naming conventions
- Verify it includes `down()` for rollback
- Verify one concern per migration (unless this is a "fix all" migration)

## Examples

Example 1: User says "evaluate our database"
Actions:
1. Read all files in `server/migrations/`
2. Score against 12 rules
3. Output report with scores and issues list

Example 2: User says "create a migration for carriers table"
Actions:
1. Read `references/rules.md`
2. Design table with NOT NULL defaults, CHECK constraints, indexes, proper FKs
3. Write Knex migration with `up()` and `down()`

Example 3: User says "compare our DB with the loadstop DB"
Actions:
1. Read our migrations AND connect to external DB via psql
2. Score BOTH using identical criteria and template
3. Present side-by-side table

## Troubleshooting

Error: Migration fails on CHECK constraint syntax in Knex
Solution: Use `knex.raw()` for CHECK constraints: `table.check('status IN (\'OPEN\', \'CLOSED\')')`

Error: Knex doesn't support ON DELETE in `.references()`
Solution: Use `.onDelete('CASCADE')` or `.onDelete('SET NULL')` chained after `.references()`

Error: Trigger function doesn't exist
Solution: Create trigger function in a raw SQL migration before applying triggers to tables
