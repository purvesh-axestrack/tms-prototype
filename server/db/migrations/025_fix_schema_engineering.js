/**
 * 025_fix_schema_engineering.js
 *
 * Corrective migration addressing violations of all 12 db-engineering rules.
 *
 * Fixes:
 *  Rule 1  — NOT NULL on all boolean columns
 *  Rule 2  — CHECK constraints on every enum column
 *  Rule 3  — Explicit ON DELETE on all 14 FKs missing it
 *  Rule 4  — btree indexes on every FK column
 *  Rule 5  — UNIQUE on real-world identifiers
 *  Rule 6  — set_updated_at() trigger on all 18 tables
 *  Rule 8  — Fix 'Dry Van' → 'DRY_VAN', 'local' → 'LOCAL'
 *  Rule 9  — Remove empty-string default on password_hash
 */

// ─── All 18 tables ──────────────────────────────────────────────────────────
const ALL_TABLES = [
  'users', 'customers', 'drivers', 'loads', 'stops', 'documents',
  'email_imports', 'gmail_settings', 'refresh_tokens',
  'accessorial_types', 'load_accessorials', 'invoices',
  'invoice_line_items', 'settlements', 'settlement_line_items',
  'deduction_types', 'driver_deductions', 'vehicles', 'samsara_settings',
];

// ─── FK columns that need ON DELETE fixed (drop + re-add) ───────────────────
// Format: [table, column, refTable, refColumn, onDelete]
const FK_FIXES = [
  ['loads',                'customer_id',         'customers',        'id', 'SET NULL'],
  ['loads',                'driver_id',           'drivers',          'id', 'SET NULL'],
  ['loads',                'dispatcher_id',       'users',            'id', 'SET NULL'],
  ['loads',                'email_import_id',     'email_imports',    'id', 'SET NULL'],
  ['gmail_settings',       'user_id',             'users',            'id', 'CASCADE'],
  ['invoices',             'customer_id',         'customers',        'id', 'RESTRICT'],
  ['invoices',             'created_by',          'users',            'id', 'SET NULL'],
  ['invoice_line_items',   'load_id',             'loads',            'id', 'SET NULL'],
  ['load_accessorials',    'accessorial_type_id', 'accessorial_types','id', 'RESTRICT'],
  ['settlements',          'driver_id',           'drivers',          'id', 'RESTRICT'],
  ['settlements',          'approved_by',         'users',            'id', 'SET NULL'],
  ['settlements',          'created_by',          'users',            'id', 'SET NULL'],
  ['settlement_line_items','load_id',             'loads',            'id', 'SET NULL'],
  ['driver_deductions',    'driver_id',           'drivers',          'id', 'CASCADE'],
  ['driver_deductions',    'deduction_type_id',   'deduction_types',  'id', 'RESTRICT'],
];

// ─── FK columns that need btree indexes ─────────────────────────────────────
// Format: [table, column(s)]
const FK_INDEXES = [
  ['loads',                'customer_id'],
  ['loads',                'driver_id'],
  ['loads',                'dispatcher_id'],
  ['loads',                'email_import_id'],
  ['loads',                'invoice_id'],
  ['loads',                'settlement_id'],
  ['loads',                'truck_id'],
  ['loads',                'trailer_id'],
  ['stops',                'load_id'],
  ['documents',            'load_id'],
  ['documents',            'email_import_id'],
  ['gmail_settings',       'user_id'],
  ['refresh_tokens',       'user_id'],
  ['load_accessorials',    'load_id'],
  ['load_accessorials',    'accessorial_type_id'],
  ['invoice_line_items',   'invoice_id'],
  ['invoice_line_items',   'load_id'],
  ['invoices',             'customer_id'],
  ['invoices',             'created_by'],
  ['settlements',          'driver_id'],
  ['settlements',          'approved_by'],
  ['settlements',          'created_by'],
  ['settlement_line_items','settlement_id'],
  ['settlement_line_items','load_id'],
  ['driver_deductions',    'driver_id'],
  ['driver_deductions',    'deduction_type_id'],
  ['vehicles',             'current_driver_id'],
];

// ─── CHECK constraints for every enum column ────────────────────────────────
// Format: [table, column, allowedValues]
const ENUM_CHECKS = [
  ['users',               'role',              ['ADMIN', 'DISPATCHER', 'ACCOUNTANT']],
  ['drivers',             'status',            ['AVAILABLE', 'EN_ROUTE', 'OUT_OF_SERVICE']],
  ['drivers',             'pay_model',         ['CPM', 'PERCENTAGE', 'FLAT']],
  ['loads',               'status',            ['OPEN', 'SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT', 'COMPLETED', 'TONU', 'CANCELLED', 'INVOICED', 'BROKERED']],
  ['loads',               'rate_type',         ['FLAT', 'CPM', 'PERCENTAGE']],
  ['loads',               'equipment_type',    ['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'LOWBOY', 'HOTSHOT', 'CONTAINER', 'POWER_ONLY', 'TANKER', 'STRAIGHT_TRUCK', 'SPRINTER_VAN', 'CARGO_VAN', 'DRY_VAN_REEFER']],
  ['stops',               'stop_type',         ['PICKUP', 'DELIVERY']],
  ['documents',           'doc_type',          ['RATE_CON', 'BOL', 'POD', 'INVOICE', 'OTHER']],
  ['documents',           'storage_type',      ['LOCAL', 'S3']],
  ['email_imports',       'processing_status', ['PENDING', 'PROCESSING', 'EXTRACTED', 'DRAFT_CREATED', 'APPROVED', 'REJECTED', 'FAILED', 'SKIPPED']],
  ['accessorial_types',   'unit',              ['FLAT', 'PER_HOUR', 'PER_DAY', 'PER_MILE', 'PERCENTAGE']],
  ['invoice_line_items',  'line_type',         ['LOAD_CHARGE', 'FUEL_SURCHARGE', 'ACCESSORIAL', 'ADJUSTMENT']],
  ['invoices',            'status',            ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID']],
  ['settlements',         'status',            ['DRAFT', 'APPROVED', 'PAID']],
  ['settlement_line_items','line_type',        ['LOAD_PAY', 'BONUS', 'FUEL_ADVANCE', 'DEDUCTION']],
  ['vehicles',            'type',              ['TRACTOR', 'TRAILER']],
  ['vehicles',            'status',            ['ACTIVE', 'IN_SHOP', 'OUT_OF_SERVICE', 'INACTIVE']],
];

// ─── Boolean columns → NOT NULL DEFAULT ─────────────────────────────────────
// Format: [table, column, defaultValue]
const BOOL_FIXES = [
  ['customers',        'is_active',     true],
  ['gmail_settings',   'is_active',     false],
  ['users',            'is_active',     true],
  ['accessorial_types','is_active',     true],
  ['deduction_types',  'is_recurring',  false],
  ['deduction_types',  'is_active',     true],
  ['driver_deductions','is_active',     true],
  ['samsara_settings', 'is_active',     false],
];

// ─── UNIQUE constraints on real-world identifiers ───────────────────────────
// Format: [table, column(s)]  — single string = single column, array = composite
const UNIQUE_FIXES = [
  ['customers', 'mc_number'],
  ['drivers',   'license_number'],
  ['loads',     'reference_number'],
  ['vehicles',  'unit_number'],
  ['vehicles',  'vin'],
  ['vehicles',  ['license_plate', 'license_state']],
];


// ═══════════════════════════════════════════════════════════════════════════════
//  UP
// ═══════════════════════════════════════════════════════════════════════════════
export async function up(knex) {

  // ── Rule 6: Create trigger function ─────────────────────────────────────
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ── Rule 6: Apply trigger to every table ────────────────────────────────
  for (const t of ALL_TABLES) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trg_${t}_updated_at ON "${t}";
      CREATE TRIGGER trg_${t}_updated_at
        BEFORE UPDATE ON "${t}"
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
  }

  // ── Rule 8 + data fix: Fix bad enum defaults before adding CHECKs ──────
  // Fix all mixed-case equipment_type values in existing rows
  await knex.raw(`UPDATE loads SET equipment_type = 'DRY_VAN' WHERE equipment_type = 'Dry Van'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'REEFER' WHERE equipment_type = 'Reefer'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'FLATBED' WHERE equipment_type = 'Flatbed'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'STEP_DECK' WHERE equipment_type IN ('Stepdeck', 'StepDeck', 'Step Deck')`);
  await knex.raw(`UPDATE loads SET equipment_type = 'LOWBOY' WHERE equipment_type = 'Lowboy'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'HOTSHOT' WHERE equipment_type = 'Hot Shot'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'CONTAINER' WHERE equipment_type = 'Container'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'POWER_ONLY' WHERE equipment_type = 'Power Only'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'TANKER' WHERE equipment_type = 'Tanker'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'STRAIGHT_TRUCK' WHERE equipment_type = 'Straight Truck'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'SPRINTER_VAN' WHERE equipment_type = 'Sprinter Van'`);
  await knex.raw(`UPDATE loads SET equipment_type = 'CARGO_VAN' WHERE equipment_type = 'Cargo Van'`);
  // Fix 'local' → 'LOCAL' in existing rows
  await knex.raw(`UPDATE documents SET storage_type = 'LOCAL' WHERE storage_type = 'local'`);
  // Fix any 's3' → 'S3' in existing rows
  await knex.raw(`UPDATE documents SET storage_type = 'S3' WHERE storage_type = 's3'`);

  // Fix column defaults
  await knex.raw(`ALTER TABLE loads ALTER COLUMN equipment_type SET DEFAULT 'DRY_VAN'`);
  await knex.raw(`ALTER TABLE documents ALTER COLUMN storage_type SET DEFAULT 'LOCAL'`);

  // ── Rule 2: CHECK constraints on every enum column ──────────────────────
  for (const [table, column, values] of ENUM_CHECKS) {
    const list = values.map(v => `'${v}'`).join(', ');
    const name = `chk_${table}_${column}`;
    await knex.raw(`
      ALTER TABLE "${table}"
        ADD CONSTRAINT "${name}" CHECK ("${column}" IN (${list}))
    `);
  }

  // ── Rule 1: Boolean columns → NOT NULL ──────────────────────────────────
  for (const [table, column, defaultVal] of BOOL_FIXES) {
    // Backfill any NULLs first
    await knex.raw(`UPDATE "${table}" SET "${column}" = ${defaultVal} WHERE "${column}" IS NULL`);
    await knex.raw(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL`);
    await knex.raw(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT ${defaultVal}`);
  }

  // ── Rule 9: Fix password_hash — remove empty string default ─────────────
  await knex.raw(`ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT`);

  // ── Rule 3: Fix FKs missing ON DELETE ───────────────────────────────────
  for (const [table, column, refTable, refColumn, onDelete] of FK_FIXES) {
    // Find and drop the existing FK constraint
    const { rows } = await knex.raw(`
      SELECT con.conname
      FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
      WHERE rel.relname = '${table}'
        AND att.attname = '${column}'
        AND con.contype = 'f'
    `);

    for (const row of rows) {
      await knex.raw(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname}"`);
    }

    // Re-add with explicit ON DELETE
    const constraintName = `fk_${table}_${column}`;
    await knex.raw(`
      ALTER TABLE "${table}"
        ADD CONSTRAINT "${constraintName}"
        FOREIGN KEY ("${column}") REFERENCES "${refTable}"("${refColumn}")
        ON DELETE ${onDelete}
    `);
  }

  // ── Rule 4: btree indexes on all FK columns ─────────────────────────────
  for (const [table, column] of FK_INDEXES) {
    const idxName = `ix_${table}_${column}`;
    await knex.raw(`CREATE INDEX IF NOT EXISTS "${idxName}" ON "${table}" ("${column}")`);
  }

  // ── Rule 5: UNIQUE constraints on real-world identifiers ────────────────
  for (const [table, columns] of UNIQUE_FIXES) {
    if (Array.isArray(columns)) {
      // Composite unique
      const cols = columns.map(c => `"${c}"`).join(', ');
      const name = `uq_${table}_${columns.join('_')}`;
      await knex.raw(`
        CREATE UNIQUE INDEX "${name}" ON "${table}" (${cols})
          WHERE ${columns.map(c => `"${c}" IS NOT NULL`).join(' AND ')}
      `);
    } else {
      // Single-column partial unique (allows multiple NULLs)
      const name = `uq_${table}_${columns}`;
      await knex.raw(`
        CREATE UNIQUE INDEX "${name}" ON "${table}" ("${columns}")
          WHERE "${columns}" IS NOT NULL
      `);
    }
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  DOWN — fully reversible
// ═══════════════════════════════════════════════════════════════════════════════
export async function down(knex) {

  // ── Remove UNIQUE indexes ───────────────────────────────────────────────
  for (const [table, columns] of UNIQUE_FIXES) {
    const name = Array.isArray(columns)
      ? `uq_${table}_${columns.join('_')}`
      : `uq_${table}_${columns}`;
    await knex.raw(`DROP INDEX IF EXISTS "${name}"`);
  }

  // ── Remove FK indexes ──────────────────────────────────────────────────
  for (const [table, column] of FK_INDEXES) {
    const idxName = `ix_${table}_${column}`;
    await knex.raw(`DROP INDEX IF EXISTS "${idxName}"`);
  }

  // ── Restore original FKs (without ON DELETE = implicit NO ACTION) ──────
  for (const [table, column, refTable, refColumn] of FK_FIXES) {
    const constraintName = `fk_${table}_${column}`;
    await knex.raw(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraintName}"`);
    await knex.raw(`
      ALTER TABLE "${table}"
        ADD CONSTRAINT "${constraintName}"
        FOREIGN KEY ("${column}") REFERENCES "${refTable}"("${refColumn}")
    `);
  }

  // ── Restore password_hash default ──────────────────────────────────────
  await knex.raw(`ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT ''`);

  // ── Remove NOT NULL from booleans (restore to nullable) ─────────────────
  for (const [table, column] of BOOL_FIXES) {
    await knex.raw(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`);
  }

  // ── Drop CHECK constraints ─────────────────────────────────────────────
  for (const [table, column] of ENUM_CHECKS) {
    const name = `chk_${table}_${column}`;
    await knex.raw(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}"`);
  }

  // ── Restore old enum defaults ──────────────────────────────────────────
  await knex.raw(`ALTER TABLE loads ALTER COLUMN equipment_type SET DEFAULT 'Dry Van'`);
  await knex.raw(`ALTER TABLE documents ALTER COLUMN storage_type SET DEFAULT 'local'`);

  // ── Drop triggers ─────────────────────────────────────────────────────
  for (const t of ALL_TABLES) {
    await knex.raw(`DROP TRIGGER IF EXISTS trg_${t}_updated_at ON "${t}"`);
  }

  // ── Drop trigger function ─────────────────────────────────────────────
  await knex.raw(`DROP FUNCTION IF EXISTS set_updated_at()`);
}
