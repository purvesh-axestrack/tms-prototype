export function up(knex) {
  return knex.schema.createTable('gmail_settings', (table) => {
    table.increments('id').primary();
    table.string('user_id').references('id').inTable('users');
    table.string('email_address');
    table.text('access_token');
    table.text('refresh_token');
    table.timestamp('token_expiry');
    table.string('history_id');
    table.specificType('filter_senders', 'text[]');
    table.boolean('is_active').defaultTo(false);
    table.timestamp('last_sync_at');
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('gmail_settings');
}
