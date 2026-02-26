/**
 * 029 — Add domain depth columns to loads and stops.
 *
 * loads:  parent_load_id, driver2_id, reefer fields, reference numbers, is_ltl, exclude_from_settlement
 * stops:  action_type, arrival/departure, free_time_minutes, trailer_id, trailer_dropped, stop_status
 */

export async function up(knex) {
  // ── Loads ──────────────────────────────────────────────────────────────
  await knex.schema.alterTable('loads', (t) => {
    t.integer('parent_load_id').unsigned().references('id').inTable('loads').onDelete('SET NULL').defaultTo(null);
    t.integer('driver2_id').unsigned().references('id').inTable('drivers').onDelete('SET NULL').defaultTo(null);
    t.boolean('is_reefer').notNullable().defaultTo(false);
    t.string('reefer_mode').defaultTo(null);
    t.decimal('set_temp', 5, 2).defaultTo(null);
    t.decimal('reefer_fuel_pct', 5, 2).defaultTo(null);
    t.string('bol_number').defaultTo(null);
    t.string('po_number').defaultTo(null);
    t.string('pro_number').defaultTo(null);
    t.string('pickup_number').defaultTo(null);
    t.string('delivery_number').defaultTo(null);
    t.boolean('is_ltl').notNullable().defaultTo(false);
    t.boolean('exclude_from_settlement').notNullable().defaultTo(false);
  });

  await knex.raw(`CREATE INDEX ix_loads_parent_load_id ON loads (parent_load_id)`);
  await knex.raw(`CREATE INDEX ix_loads_driver2_id ON loads (driver2_id)`);

  await knex.raw(`
    ALTER TABLE loads
      ADD CONSTRAINT chk_loads_reefer_mode
      CHECK (reefer_mode IN ('CONTINUOUS', 'CYCLE_SENTRY', 'OFF'))
  `);

  // ── Stops ──────────────────────────────────────────────────────────────
  await knex.schema.alterTable('stops', (t) => {
    t.string('action_type').defaultTo(null);
    t.timestamp('arrival_time').defaultTo(null);
    t.timestamp('departure_time').defaultTo(null);
    t.integer('free_time_minutes').notNullable().defaultTo(120);
    t.integer('trailer_id').unsigned().references('id').inTable('vehicles').onDelete('SET NULL').defaultTo(null);
    t.boolean('trailer_dropped').notNullable().defaultTo(false);
    t.string('stop_status').defaultTo(null);
  });

  await knex.raw(`CREATE INDEX ix_stops_trailer_id ON stops (trailer_id)`);

  await knex.raw(`
    ALTER TABLE stops
      ADD CONSTRAINT chk_stops_action_type
      CHECK (action_type IN ('LIVE_LOAD', 'LIVE_UNLOAD', 'DROP_TRAILER', 'HOOK_TRAILER'))
  `);

  await knex.raw(`
    ALTER TABLE stops
      ADD CONSTRAINT chk_stops_stop_status
      CHECK (stop_status IN ('PENDING', 'EN_ROUTE', 'AT_FACILITY', 'LOADING', 'UNLOADING', 'COMPLETED'))
  `);
}

export async function down(knex) {
  // ── Stops (reverse) ────────────────────────────────────────────────────
  await knex.raw('ALTER TABLE stops DROP CONSTRAINT IF EXISTS chk_stops_stop_status');
  await knex.raw('ALTER TABLE stops DROP CONSTRAINT IF EXISTS chk_stops_action_type');
  await knex.raw('DROP INDEX IF EXISTS ix_stops_trailer_id');

  await knex.schema.alterTable('stops', (t) => {
    t.dropColumn('stop_status');
    t.dropColumn('trailer_dropped');
    t.dropColumn('trailer_id');
    t.dropColumn('free_time_minutes');
    t.dropColumn('departure_time');
    t.dropColumn('arrival_time');
    t.dropColumn('action_type');
  });

  // ── Loads (reverse) ────────────────────────────────────────────────────
  await knex.raw('ALTER TABLE loads DROP CONSTRAINT IF EXISTS chk_loads_reefer_mode');
  await knex.raw('DROP INDEX IF EXISTS ix_loads_driver2_id');
  await knex.raw('DROP INDEX IF EXISTS ix_loads_parent_load_id');

  await knex.schema.alterTable('loads', (t) => {
    t.dropColumn('exclude_from_settlement');
    t.dropColumn('is_ltl');
    t.dropColumn('delivery_number');
    t.dropColumn('pickup_number');
    t.dropColumn('pro_number');
    t.dropColumn('po_number');
    t.dropColumn('bol_number');
    t.dropColumn('reefer_fuel_pct');
    t.dropColumn('set_temp');
    t.dropColumn('reefer_mode');
    t.dropColumn('is_reefer');
    t.dropColumn('driver2_id');
    t.dropColumn('parent_load_id');
  });
}
