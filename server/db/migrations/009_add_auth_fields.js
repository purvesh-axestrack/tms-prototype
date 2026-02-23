export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.text('password_hash').notNullable().defaultTo('');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('password_hash');
    table.dropColumn('is_active');
    table.dropColumn('last_login_at');
  });
}
