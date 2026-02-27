/**
 * 031 — Create load_notes table for timestamped dispatcher comments per load.
 */

export async function up(knex) {
  // Create shared trigger function if it doesn't exist
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.schema.createTable('load_notes', (t) => {
    t.increments('id').primary();
    t.integer('load_id').unsigned().notNullable()
      .references('id').inTable('loads').onDelete('CASCADE');
    t.string('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.text('note').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX ix_load_notes_load_id ON load_notes (load_id)');
  await knex.raw('CREATE INDEX ix_load_notes_user_id ON load_notes (user_id)');

  await knex.raw(`
    CREATE TRIGGER trg_load_notes_updated_at
    BEFORE UPDATE ON load_notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex) {
  await knex.raw('DROP TRIGGER IF EXISTS trg_load_notes_updated_at ON load_notes');
  await knex.schema.dropTableIfExists('load_notes');
}
