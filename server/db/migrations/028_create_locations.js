/**
 * Locations master table — reusable facilities for stop autocomplete.
 */
export function up(knex) {
  return knex.schema.createTable('locations', (table) => {
    table.increments('id').primary();
    table.string('facility_name').notNullable();
    table.string('address');
    table.string('city').notNullable();
    table.string('state', 2).notNullable();
    table.string('zip', 10);
    table.decimal('lat', 10, 7);
    table.decimal('lng', 10, 7);
    table.string('contact_name');
    table.string('contact_phone');
    table.text('notes');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    // Search index on facility name and city
    table.index(['facility_name'], 'idx_locations_facility_name');
    table.index(['city', 'state'], 'idx_locations_city_state');
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('locations');
}
