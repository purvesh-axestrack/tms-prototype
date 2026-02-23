export async function up(knex) {
  await knex.schema.alterTable('loads', (table) => {
    table.integer('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('loads', (table) => {
    table.dropColumn('invoice_id');
  });
}
