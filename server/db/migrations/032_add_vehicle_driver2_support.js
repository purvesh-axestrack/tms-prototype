/**
 * 032 — Add current_driver2_id to vehicles for team driving support.
 */

export async function up(knex) {
  await knex.schema.alterTable('vehicles', (t) => {
    t.string('current_driver2_id')
      .nullable()
      .references('id').inTable('drivers').onDelete('SET NULL');
  });

  await knex.raw('CREATE INDEX ix_vehicles_current_driver2_id ON vehicles (current_driver2_id)');
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS ix_vehicles_current_driver2_id');
  await knex.schema.alterTable('vehicles', (t) => {
    t.dropColumn('current_driver2_id');
  });
}
