export async function up(knex) {
  await knex.schema.alterTable('loads', (table) => {
    table.decimal('fuel_surcharge_amount', 10, 2).defaultTo(0);
    table.decimal('total_amount', 10, 2);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('loads', (table) => {
    table.dropColumn('fuel_surcharge_amount');
    table.dropColumn('total_amount');
  });
}
