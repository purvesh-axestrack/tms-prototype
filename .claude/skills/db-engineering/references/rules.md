# Database Engineering Rules

## Rule 1: NOT NULL by Default

- Every column is `NOT NULL` unless the business logic explicitly requires a missing value.
- Ask: "Can a valid record exist without this value?" If no → `NOT NULL`.
- Booleans: ALWAYS `NOT NULL DEFAULT false`. No nullable booleans.
- FK to defining parent (e.g., `loads.customer_id`): `NOT NULL` unless the record genuinely exists before the relationship (e.g., draft before assignment).
- Money/rate columns: `NOT NULL DEFAULT 0` if the record is meaningless without a rate.

**Scoring:** A = only genuinely optional cols nullable | B = few unnecessary nullables | C = many core cols nullable | D = almost everything nullable | F = no thought given

## Rule 2: CHECK Constraints on Every Enum

- Every column holding a fixed set of string values MUST have `CHECK (column IN (...))`.
- Application-level validation is NOT a substitute. Both must exist.
- Applies to: status, role, type, mode, category — any column with a known set of valid values.
- When adding a new enum value, alter the CHECK constraint in a migration.

**Scoring:** A = all constrained | B = most constrained | C = some | D = almost none | F = zero

## Rule 3: Explicit ON DELETE on Every FK

No FK may rely on Postgres's implicit NO ACTION. Every FK must explicitly declare:

| Behavior | When to use |
|---|---|
| `CASCADE` | Child is meaningless without parent (stops→load, line_items→invoice) |
| `SET NULL` | Relationship is optional, record survives parent deletion (loads.truck_id) |
| `RESTRICT` | Deletion must be explicitly blocked — use INTENTIONALLY, never by omission |

**Scoring:** A = all explicit | B = most explicit | C = half | D = most implicit | F = none declared

## Rule 4: Index Every FK and Query Column

- Every FK column: btree index (Postgres does NOT auto-create these).
- Every column in WHERE/JOIN/ORDER BY/GROUP BY: index it.
- Common composites: `(status, customer_id)`, `(driver_id, status)`, `(load_id, sequence_order)`.
- UNIQUE constraints auto-create indexes. Non-unique FKs do NOT.
- Partial indexes where appropriate: `WHERE is_active = true`.

**Scoring:** A = all FKs indexed + composites | B = all FKs indexed | C = some FK indexes | D = only PK+UNIQUE | F = nothing beyond auto-PK

## Rule 5: UNIQUE on Real-World Identifiers

If unique in the real world → UNIQUE in the database:

- Government IDs: VIN, MC#, DOT#, SCAC, CDL/license numbers
- Business identifiers: unit numbers, reference numbers, invoice numbers
- Integration IDs: Samsara ID, Gmail message ID
- Singleton relationships: one gmail_settings per user → UNIQUE on user_id
- Composite uniques: `(license_plate, license_state)`

**Scoring:** A = all natural keys constrained | B = most | C = only obvious ones | D = very few | F = none

## Rule 6: Auto-Updating Timestamps via Trigger

- Every table: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` + `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- `updated_at` MUST auto-update via database trigger, not application code.
- Create trigger function ONCE, apply to ALL tables:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
```

- Use `TIMESTAMPTZ` (with timezone), not `TIMESTAMP`.

**Scoring:** A = trigger-based on all tables | B = trigger exists, not on all | C = columns exist, no trigger | D = some tables missing timestamps | F = no updated_at or never updates

## Rule 7: Consistent Primary Key Strategy

Pick ONE and use everywhere:

- Auto-increment `SERIAL`/`BIGSERIAL`: default. Simple, compact, fast joins.
- UUID v4: when IDs must be globally unique or generated client-side.
- Never mix both without documented per-table rationale.

**Scoring:** A = one consistent strategy | B = one primary, 1-2 exceptions | C = mixed no rationale | D = random | F = chaotic

## Rule 8: Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Tables | snake_case, plural | `loads`, `invoice_line_items` |
| Columns | snake_case | `customer_id`, `rate_amount` |
| FK columns | `{singular_parent}_id` | `customer_id`, `driver_id` |
| Enum values | SCREAMING_SNAKE_CASE | `IN_TRANSIT`, `FLAT`, `PAID` |
| Booleans | `is_` or `has_` prefix | `is_active`, `has_hazmat` |
| Timestamps | `_at` suffix | `created_at`, `delivered_at` |
| Dates | `_date` suffix | `start_date`, `due_date` |
| Indexes | `ix_{table}_{columns}` | `ix_loads_status_customer` |

Zero typos. No mixed conventions.

**Scoring:** A = perfect consistency | B = 1-2 minor deviations | C = mostly consistent | D = multiple conventions | F = typos, mixed case

## Rule 9: Sensitive Data

- Password hashes: `NOT NULL`, NO default. Force explicit setting.
- API keys/tokens: encrypted at rest. Column name indicates this: `api_key_encrypted`.
- OAuth tokens: encrypted. Never plaintext.
- No column may default to empty string `''` as a NULL substitute.
- Secrets never in seed data or migrations.

**Scoring:** A = all encrypted, no bad defaults | B = mostly good | C = some plaintext, some bad defaults | D = plaintext secrets, empty defaults | F = no protection

## Rule 10: No One True Lookup Table

- NEVER create a single table for all enum/lookup values (`type_master` anti-pattern).
- Each domain concept gets its own table or CHECK constraint.
- Small fixed enums (< 10 values): CHECK constraint.
- Large/user-configurable: dedicated lookup table with FK references.

**Scoring:** A = every concept separate | B = mostly separate | C = some OTLT | D = heavy OTLT | F = single type_master

## Rule 11: Denormalization Discipline

- Only denormalize for PROVEN performance needs.
- Derived values: document derivation, ensure recalculation on every change.
- Never store same fact in two places without sync.
- If both `city_id` FK and `city_name` text exist → pick one.

**Scoring:** A = zero redundancy or all documented+synced | B = minor, managed | C = some without sync | D = significant drift likely | F = same data in multiple places

## Rule 12: Migration Discipline

- Append-only. Never edit a run migration.
- Every migration reversible (`up()` and `down()`).
- One concern per migration.
- Name format: `NNN_verb_noun` (e.g., `025_add_indexes_to_loads`).
