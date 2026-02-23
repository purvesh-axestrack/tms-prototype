export async function up(knex) {
  await knex.schema.createTable('load_accessorials', (table) => {
    table.increments('id').primary();
    table.integer('load_id').notNullable().references('id').inTable('loads').onDelete('CASCADE');
    table.integer('accessorial_type_id').notNullable().references('id').inTable('accessorial_types');
    table.text('description');
    table.decimal('quantity', 10, 2).defaultTo(1);
    table.decimal('rate', 10, 2).notNullable();
    table.decimal('total', 10, 2).notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('load_accessorials');
}
