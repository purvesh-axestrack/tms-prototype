export function up(knex) {
  return knex.schema.createTable('vehicles', (table) => {
    table.string('id').primary();
    table.string('unit_number').notNullable();
    table.string('type').notNullable().defaultTo('TRACTOR'); // TRACTOR, TRAILER
    table.string('vin').nullable();
    table.integer('year').nullable();
    table.string('make').nullable();
    table.string('model').nullable();
    table.string('license_plate').nullable();
    table.string('license_state').nullable();
    table.string('status').notNullable().defaultTo('ACTIVE'); // ACTIVE, IN_SHOP, OUT_OF_SERVICE, INACTIVE
    table.string('current_driver_id').nullable().references('id').inTable('drivers').onDelete('SET NULL');
    table.string('samsara_id').nullable();
    table.decimal('current_lat', 10, 6).nullable();
    table.decimal('current_lng', 10, 6).nullable();
    table.timestamp('last_location_update').nullable();
    table.integer('odometer').defaultTo(0);
    table.text('notes').nullable();
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('vehicles');
}
