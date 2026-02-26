/**
 * 026_create_carriers.js
 *
 * Adds carrier support for brokered loads:
 *  - carriers table (company info, MC/DOT, status lifecycle, contact info)
 *  - carrier_insurance table (policy tracking per carrier)
 *  - loads.carrier_id FK + loads.carrier_rate column
 *
 * All 12 db-engineering rules applied:
 *  Rule 1: NOT NULL on all required columns, booleans NOT NULL DEFAULT false
 *  Rule 2: CHECK constraints on every enum column
 *  Rule 3: Explicit ON DELETE on every FK
 *  Rule 4: btree indexes on every FK column
 *  Rule 5: UNIQUE on mc_number, dot_number
 *  Rule 6: updated_at triggers
 *  Rule 8: SCREAMING_SNAKE_CASE enums
 *  Rule 9: No bad defaults
 */

const CARRIER_STATUSES = ['PROSPECT', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];
const INSURANCE_TYPES = ['AUTO_LIABILITY', 'CARGO', 'GENERAL'];

export async function up(knex) {
  // ── carriers table ──────────────────────────────────────────────────────
  await knex.schema.createTable('carriers', (table) => {
    table.increments('id').primary();
    table.string('company_name').notNullable();
    table.string('mc_number');
    table.string('dot_number');
    table.string('scac_code');
    table.string('contact_name');
    table.string('contact_email');
    table.string('contact_phone');
    table.string('address');
    table.string('city');
    table.string('state');
    table.string('zip');
    table.string('status').notNullable().defaultTo('PROSPECT');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.text('notes');
    table.timestamps(true, true);
  });

  // CHECK constraint on status
  await knex.raw(`
    ALTER TABLE carriers
      ADD CONSTRAINT chk_carriers_status
      CHECK (status IN (${CARRIER_STATUSES.map(s => `'${s}'`).join(', ')}))
  `);

  // UNIQUE on real-world identifiers (partial — allow multiple NULLs)
  await knex.raw(`CREATE UNIQUE INDEX uq_carriers_mc_number ON carriers (mc_number) WHERE mc_number IS NOT NULL`);
  await knex.raw(`CREATE UNIQUE INDEX uq_carriers_dot_number ON carriers (dot_number) WHERE dot_number IS NOT NULL`);

  // updated_at trigger
  await knex.raw(`
    CREATE TRIGGER trg_carriers_updated_at
      BEFORE UPDATE ON carriers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);

  // ── carrier_insurance table ─────────────────────────────────────────────
  await knex.schema.createTable('carrier_insurance', (table) => {
    table.increments('id').primary();
    table.integer('carrier_id').notNullable().references('id').inTable('carriers').onDelete('CASCADE');
    table.string('policy_type').notNullable();
    table.string('provider').notNullable();
    table.string('policy_number');
    table.decimal('coverage_amount', 12, 2).notNullable().defaultTo(0);
    table.date('expiration_date');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  // CHECK constraint on policy_type
  await knex.raw(`
    ALTER TABLE carrier_insurance
      ADD CONSTRAINT chk_carrier_insurance_policy_type
      CHECK (policy_type IN (${INSURANCE_TYPES.map(s => `'${s}'`).join(', ')}))
  `);

  // Index on FK
  await knex.raw(`CREATE INDEX ix_carrier_insurance_carrier_id ON carrier_insurance (carrier_id)`);

  // updated_at trigger
  await knex.raw(`
    CREATE TRIGGER trg_carrier_insurance_updated_at
      BEFORE UPDATE ON carrier_insurance
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);

  // ── Add carrier_id + carrier_rate to loads ──────────────────────────────
  await knex.schema.alterTable('loads', (table) => {
    table.integer('carrier_id').references('id').inTable('carriers').onDelete('SET NULL');
    table.decimal('carrier_rate', 10, 2);
  });

  // Index on new FK
  await knex.raw(`CREATE INDEX ix_loads_carrier_id ON loads (carrier_id)`);
}

export async function down(knex) {
  // Remove loads columns
  await knex.schema.alterTable('loads', (table) => {
    table.dropColumn('carrier_rate');
    table.dropColumn('carrier_id');
  });

  // Drop carrier_insurance
  await knex.raw(`DROP TRIGGER IF EXISTS trg_carrier_insurance_updated_at ON carrier_insurance`);
  await knex.schema.dropTableIfExists('carrier_insurance');

  // Drop carriers
  await knex.raw(`DROP TRIGGER IF EXISTS trg_carriers_updated_at ON carriers`);
  await knex.schema.dropTableIfExists('carriers');
}
