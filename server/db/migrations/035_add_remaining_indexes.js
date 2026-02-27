/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.raw('CREATE INDEX IF NOT EXISTS ix_loads_driver2_id ON loads (driver2_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS ix_loads_parent_load_id ON loads (parent_load_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS ix_loads_status ON loads (status)');
  await knex.raw('CREATE INDEX IF NOT EXISTS ix_loads_booking_authority_id ON loads (booking_authority_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS ix_vehicles_current_driver2_id ON vehicles (current_driver2_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS ix_carrier_insurance_carrier_id ON carrier_insurance (carrier_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS ix_email_imports_load_id ON email_imports (load_id)');
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS ix_loads_driver2_id');
  await knex.raw('DROP INDEX IF EXISTS ix_loads_parent_load_id');
  await knex.raw('DROP INDEX IF EXISTS ix_loads_status');
  await knex.raw('DROP INDEX IF EXISTS ix_loads_booking_authority_id');
  await knex.raw('DROP INDEX IF EXISTS ix_vehicles_current_driver2_id');
  await knex.raw('DROP INDEX IF EXISTS ix_carrier_insurance_carrier_id');
  await knex.raw('DROP INDEX IF EXISTS ix_email_imports_load_id');
}
