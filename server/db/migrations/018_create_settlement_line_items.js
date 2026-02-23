export async function up(knex) {
  await knex.schema.createTable('settlement_line_items', (table) => {
    table.increments('id').primary();
    table.integer('settlement_id').notNullable().references('id').inTable('settlements').onDelete('CASCADE');
    table.integer('load_id').references('id').inTable('loads');
    table.text('description').notNullable();
    table.string('line_type').defaultTo('LOAD_PAY'); // LOAD_PAY, BONUS, FUEL_ADVANCE, DEDUCTION
    table.decimal('amount', 10, 2).notNullable();
    table.integer('miles').defaultTo(0);
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('settlement_line_items');
}
