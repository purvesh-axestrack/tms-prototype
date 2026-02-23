export function up(knex) {
  return knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('email').notNullable().unique();
    table.string('role').notNullable(); // ADMIN, DISPATCHER, ACCOUNTANT
    table.string('full_name').notNullable();
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('users');
}
