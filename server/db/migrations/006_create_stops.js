export function up(knex) {
  return knex.schema.createTable('stops', (table) => {
    table.string('id').primary();
    table.integer('load_id').unsigned().notNullable().references('id').inTable('loads').onDelete('CASCADE');
    table.integer('sequence_order').notNullable();
    table.string('stop_type').notNullable(); // PICKUP, DELIVERY
    table.string('facility_name');
    table.string('address');
    table.string('city');
    table.string('state');
    table.string('zip');
    table.timestamp('appointment_start');
    table.timestamp('appointment_end');
    table.timestamp('arrived_at');
    table.timestamp('departed_at');
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('stops');
}
