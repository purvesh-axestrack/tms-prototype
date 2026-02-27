/**
 * 033 — Carrier-centric dispatch: add carrier ownership to drivers/vehicles
 *        and team driver relationships on drivers.
 */

export async function up(knex) {
  // drivers.carrier_id → carriers.id
  await knex.schema.alterTable('drivers', (t) => {
    t.integer('carrier_id')
      .nullable()
      .references('id').inTable('carriers').onDelete('SET NULL');
    t.string('team_driver_id')
      .nullable()
      .references('id').inTable('drivers').onDelete('SET NULL');
  });

  await knex.raw('CREATE INDEX ix_drivers_carrier_id ON drivers (carrier_id)');
  await knex.raw('CREATE INDEX ix_drivers_team_driver_id ON drivers (team_driver_id)');

  // vehicles.carrier_id → carriers.id
  await knex.schema.alterTable('vehicles', (t) => {
    t.integer('carrier_id')
      .nullable()
      .references('id').inTable('carriers').onDelete('SET NULL');
  });

  await knex.raw('CREATE INDEX ix_vehicles_carrier_id ON vehicles (carrier_id)');
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS ix_vehicles_carrier_id');
  await knex.schema.alterTable('vehicles', (t) => {
    t.dropColumn('carrier_id');
  });

  await knex.raw('DROP INDEX IF EXISTS ix_drivers_team_driver_id');
  await knex.raw('DROP INDEX IF EXISTS ix_drivers_carrier_id');
  await knex.schema.alterTable('drivers', (t) => {
    t.dropColumn('team_driver_id');
    t.dropColumn('carrier_id');
  });
}
