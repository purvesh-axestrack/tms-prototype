export async function up(knex) {
  await knex.schema.createTable('invoice_line_items', (table) => {
    table.increments('id').primary();
    table.integer('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    table.integer('load_id').references('id').inTable('loads');
    table.text('description').notNullable();
    table.decimal('quantity', 10, 2).defaultTo(1);
    table.decimal('unit_price', 10, 2).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('line_type').defaultTo('LOAD_CHARGE'); // LOAD_CHARGE, FUEL_SURCHARGE, ACCESSORIAL, ADJUSTMENT
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('invoice_line_items');
}
