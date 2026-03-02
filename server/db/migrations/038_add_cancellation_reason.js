export function up(knex) {
  return knex.schema.alterTable('loads', (table) => {
    table.text('cancellation_reason').nullable();
  });
}

export function down(knex) {
  return knex.schema.alterTable('loads', (table) => {
    table.dropColumn('cancellation_reason');
  });
}
