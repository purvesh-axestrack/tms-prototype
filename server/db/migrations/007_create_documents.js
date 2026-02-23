export function up(knex) {
  return knex.schema.createTable('documents', (table) => {
    table.increments('id').primary();
    table.integer('load_id').unsigned().references('id').inTable('loads').onDelete('SET NULL');
    table.integer('email_import_id').unsigned().references('id').inTable('email_imports').onDelete('SET NULL');
    table.string('doc_type').notNullable().defaultTo('OTHER'); // RATE_CON, BOL, POD, INVOICE, OTHER
    table.string('filename').notNullable();
    table.string('storage_path').notNullable();
    table.string('storage_type').defaultTo('local'); // local, s3
    table.integer('file_size');
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('documents');
}
