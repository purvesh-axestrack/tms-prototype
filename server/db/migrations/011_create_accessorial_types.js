export async function up(knex) {
  await knex.schema.createTable('accessorial_types', (table) => {
    table.increments('id').primary();
    table.string('code').unique().notNullable();
    table.string('name').notNullable();
    table.text('description');
    table.decimal('default_amount', 10, 2).defaultTo(0);
    table.string('unit').defaultTo('FLAT'); // FLAT, PER_HOUR, PER_DAY
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('accessorial_types');
}
