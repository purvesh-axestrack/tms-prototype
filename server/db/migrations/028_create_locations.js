/**
 * Locations master table — reusable facilities for stop autocomplete.
 */
export async function up(knex) {
  await knex.schema.createTable('locations', (table) => {
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

  // updated_at trigger
  await knex.raw(`
    CREATE TRIGGER trg_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
}

export async function down(knex) {
  await knex.raw('DROP TRIGGER IF EXISTS trg_locations_updated_at ON locations');
  await knex.schema.dropTableIfExists('locations');
}
