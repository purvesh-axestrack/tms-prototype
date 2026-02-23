export function up(knex) {
  return knex.schema.createTable('email_imports', (table) => {
    table.increments('id').primary();
    table.string('gmail_message_id').notNullable().unique();
    table.string('from_address');
    table.string('subject');
    table.timestamp('received_at');
    table.string('processing_status').notNullable().defaultTo('PENDING');
    // PENDING, PROCESSING, EXTRACTED, DRAFT_CREATED, APPROVED, REJECTED, FAILED, SKIPPED
    table.jsonb('extracted_data');
    table.decimal('confidence_score', 3, 2);
    table.integer('load_id').unsigned();
    table.text('error_message');
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('email_imports');
}
