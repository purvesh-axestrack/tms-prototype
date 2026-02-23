export function up(knex) {
  return knex.schema.createTable('samsara_settings', (table) => {
    table.increments('id').primary();
    table.text('api_key_encrypted').nullable();
    table.string('org_id').nullable();
    table.string('org_name').nullable();
    table.boolean('is_active').defaultTo(false);
    table.timestamp('last_vehicle_sync').nullable();
    table.timestamp('last_location_sync').nullable();
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('samsara_settings');
}
