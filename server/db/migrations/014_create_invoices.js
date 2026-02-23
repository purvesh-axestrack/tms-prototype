export async function up(knex) {
  await knex.schema.createTable('invoices', (table) => {
    table.increments('id').primary();
    table.string('invoice_number').unique().notNullable();
    table.string('customer_id').notNullable().references('id').inTable('customers');
    table.string('status').defaultTo('DRAFT'); // DRAFT, SENT, PAID, OVERDUE, VOID
    table.date('issue_date');
    table.date('due_date');
    table.decimal('subtotal', 10, 2).defaultTo(0);
    table.decimal('fuel_surcharge_total', 10, 2).defaultTo(0);
    table.decimal('accessorial_total', 10, 2).defaultTo(0);
    table.decimal('total_amount', 10, 2).defaultTo(0);
    table.decimal('amount_paid', 10, 2).defaultTo(0);
    table.decimal('balance_due', 10, 2).defaultTo(0);
    table.text('notes');
    table.timestamp('sent_at');
    table.timestamp('paid_at');
    table.string('created_by').references('id').inTable('users');
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('invoices');
}
