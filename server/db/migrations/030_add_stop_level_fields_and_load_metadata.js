/**
 * 030 — Add stop-level domain fields and load metadata.
 *
 * loads:  booking_authority_id, sales_agent_id, customer_ref_number
 * stops:  appointment_type, quantity, quantity_type, commodity, weight,
 *         stop_reefer_mode, stop_set_temp, bol_number, po_number, ref_number, instructions
 */

export async function up(knex) {
  // ── Loads ──────────────────────────────────────────────────────────────
  await knex.schema.alterTable('loads', (t) => {
    t.integer('booking_authority_id').unsigned().references('id').inTable('carriers').onDelete('SET NULL').defaultTo(null);
    t.string('sales_agent_id').references('id').inTable('users').onDelete('SET NULL').defaultTo(null);
    t.string('customer_ref_number').defaultTo(null);
  });

  await knex.raw(`CREATE INDEX ix_loads_booking_authority_id ON loads (booking_authority_id)`);

  // ── Stops ──────────────────────────────────────────────────────────────
  await knex.schema.alterTable('stops', (t) => {
    t.string('appointment_type').notNullable().defaultTo('APPOINTMENT');
    t.decimal('quantity', 10, 2).defaultTo(null);
    t.string('quantity_type').defaultTo(null);
    t.string('commodity').defaultTo(null);
    t.decimal('weight', 10, 2).defaultTo(null);
    t.string('stop_reefer_mode').defaultTo(null);
    t.decimal('stop_set_temp', 5, 2).defaultTo(null);
    t.string('bol_number').defaultTo(null);
    t.string('po_number').defaultTo(null);
    t.string('ref_number').defaultTo(null);
    t.text('instructions').defaultTo(null);
  });

  await knex.raw(`
    ALTER TABLE stops
      ADD CONSTRAINT chk_stops_appointment_type
      CHECK (appointment_type IN ('FCFS', 'APPOINTMENT'))
  `);

  await knex.raw(`
    ALTER TABLE stops
      ADD CONSTRAINT chk_stops_stop_reefer_mode
      CHECK (stop_reefer_mode IN ('CONTINUOUS', 'CYCLE', 'SPECIAL_SETTING'))
  `);
}

export async function down(knex) {
  // ── Stops (reverse) ────────────────────────────────────────────────────
  await knex.raw('ALTER TABLE stops DROP CONSTRAINT IF EXISTS chk_stops_stop_reefer_mode');
  await knex.raw('ALTER TABLE stops DROP CONSTRAINT IF EXISTS chk_stops_appointment_type');

  await knex.schema.alterTable('stops', (t) => {
    t.dropColumn('instructions');
    t.dropColumn('ref_number');
    t.dropColumn('po_number');
    t.dropColumn('bol_number');
    t.dropColumn('stop_set_temp');
    t.dropColumn('stop_reefer_mode');
    t.dropColumn('weight');
    t.dropColumn('commodity');
    t.dropColumn('quantity_type');
    t.dropColumn('quantity');
    t.dropColumn('appointment_type');
  });

  // ── Loads (reverse) ────────────────────────────────────────────────────
  await knex.raw('DROP INDEX IF EXISTS ix_loads_booking_authority_id');

  await knex.schema.alterTable('loads', (t) => {
    t.dropColumn('customer_ref_number');
    t.dropColumn('sales_agent_id');
    t.dropColumn('booking_authority_id');
  });
}
