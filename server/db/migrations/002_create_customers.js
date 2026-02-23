export function up(knex) {
  return knex.schema.createTable('customers', (table) => {
    table.string('id').primary();
    table.string('company_name').notNullable();
    table.string('mc_number');
    table.string('billing_email');
    table.integer('payment_terms').defaultTo(30);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('customers');
}
