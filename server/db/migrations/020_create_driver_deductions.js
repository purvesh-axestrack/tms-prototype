export async function up(knex) {
  await knex.schema.createTable('driver_deductions', (table) => {
    table.increments('id').primary();
    table.string('driver_id').notNullable().references('id').inTable('drivers');
    table.integer('deduction_type_id').notNullable().references('id').inTable('deduction_types');
    table.decimal('amount', 10, 2).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.date('start_date');
    table.date('end_date');
    table.text('notes');
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('driver_deductions');
}
