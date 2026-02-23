export async function up(knex) {
  await knex.schema.createTable('deduction_types', (table) => {
    table.increments('id').primary();
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.boolean('is_recurring').defaultTo(false);
    table.decimal('default_amount', 10, 2).defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('deduction_types');
}
