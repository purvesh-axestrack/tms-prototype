export async function up(knex) {
  await knex.schema.createTable('settlements', (table) => {
    table.increments('id').primary();
    table.string('settlement_number').unique().notNullable();
    table.string('driver_id').notNullable().references('id').inTable('drivers');
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.string('status').defaultTo('DRAFT'); // DRAFT, APPROVED, PAID
    table.decimal('gross_pay', 10, 2).defaultTo(0);
    table.decimal('total_deductions', 10, 2).defaultTo(0);
    table.decimal('net_pay', 10, 2).defaultTo(0);
    table.integer('total_miles').defaultTo(0);
    table.integer('total_loads').defaultTo(0);
    table.string('approved_by').references('id').inTable('users');
    table.timestamp('approved_at');
    table.timestamp('paid_at');
    table.text('notes');
    table.string('created_by').references('id').inTable('users');
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('settlements');
}
