/**
 * Add auto-updating updated_at trigger + fix password_hash default.
 *
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  // ── 1. Create the trigger function ──────────────────────────────────
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ── 2. Apply trigger to all tables that have updated_at ─────────────
  const tables = [
    'users', 'customers', 'drivers', 'loads', 'stops', 'vehicles',
    'invoices', 'settlements', 'carriers', 'carrier_insurance',
    'email_imports', 'accessorial_types', 'deduction_types',
  ];

  for (const table of tables) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table};
      CREATE TRIGGER trg_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    `);
  }

  // ── 3. Fix password_hash: remove default empty string ───────────────
  await knex.raw(`ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT`);

  // ── 4. Dedupe SCAC codes and add UNIQUE index ──────────────────────
  // Null out duplicates (keep the first by id)
  await knex.raw(`
    UPDATE carriers SET scac_code = NULL
    WHERE id NOT IN (
      SELECT MIN(id) FROM carriers
      WHERE scac_code IS NOT NULL
      GROUP BY scac_code
    )
    AND scac_code IS NOT NULL
  `);
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS uq_carriers_scac_code ON carriers (scac_code) WHERE scac_code IS NOT NULL`);
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS uq_carriers_scac_code`);
  await knex.raw(`ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT ''`);

  const tables = [
    'users', 'customers', 'drivers', 'loads', 'stops', 'vehicles',
    'invoices', 'settlements', 'carriers', 'carrier_insurance',
    'email_imports', 'accessorial_types', 'deduction_types',
  ];
  for (const table of tables) {
    await knex.raw(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table}`);
  }
  await knex.raw(`DROP FUNCTION IF EXISTS set_updated_at()`);
}
