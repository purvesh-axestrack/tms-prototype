export function up(knex) {
  return knex.schema.alterTable('loads', (table) => {
    table.string('truck_id').nullable().references('id').inTable('vehicles').onDelete('SET NULL');
    table.string('trailer_id').nullable().references('id').inTable('vehicles').onDelete('SET NULL');
  });
}

export function down(knex) {
  return knex.schema.alterTable('loads', (table) => {
    table.dropColumn('truck_id');
    table.dropColumn('trailer_id');
  });
}
