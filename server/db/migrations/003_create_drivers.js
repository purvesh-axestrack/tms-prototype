export function up(knex) {
  return knex.schema.createTable('drivers', (table) => {
    table.string('id').primary();
    table.string('full_name').notNullable();
    table.string('phone');
    table.string('license_number');
    table.string('license_state');
    table.string('status').notNullable().defaultTo('AVAILABLE'); // AVAILABLE, EN_ROUTE, OUT_OF_SERVICE
    table.string('pay_model').notNullable(); // CPM, PERCENTAGE, FLAT
    table.decimal('pay_rate', 10, 2).notNullable();
    table.decimal('minimum_per_mile', 10, 2);
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('drivers');
}
