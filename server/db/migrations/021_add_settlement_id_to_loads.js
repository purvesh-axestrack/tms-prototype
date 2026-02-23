export async function up(knex) {
  await knex.schema.alterTable('loads', (table) => {
    table.integer('settlement_id').references('id').inTable('settlements').onDelete('SET NULL');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('loads', (table) => {
    table.dropColumn('settlement_id');
  });
}
