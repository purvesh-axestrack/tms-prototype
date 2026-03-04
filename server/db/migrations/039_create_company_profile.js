/**
 * Company profile — single-row table for own authority, MC/DOT, insurance.
 * Replaces the pattern of using carriers table for own company identity.
 */
export async function up(knex) {
  await knex.schema.createTable('company_profile', (t) => {
    t.increments('id').primary();
    t.string('company_name').notNullable();
    t.string('dba_name');
    t.string('mc_number');
    t.string('dot_number');
    t.string('scac_code');
    t.string('ein');
    t.string('authority_type').notNullable().defaultTo('OWN_AUTHORITY');

    // Contact
    t.string('contact_name');
    t.string('phone');
    t.string('email');
    t.string('website');

    // Address
    t.string('address');
    t.string('city');
    t.string('state');
    t.string('zip');

    t.timestamps(true, true);

    // CHECK constraints
    t.check("authority_type IN ('OWN_AUTHORITY', 'BROKERAGE', 'BOTH')");
  });

  await knex.schema.createTable('company_insurance', (t) => {
    t.increments('id').primary();
    t.integer('company_profile_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('company_profile')
      .onDelete('CASCADE');
    t.string('policy_type').notNullable();
    t.string('provider').notNullable();
    t.string('policy_number');
    t.decimal('coverage_amount', 14, 2);
    t.date('expiration_date');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);

    t.check("policy_type IN ('AUTO_LIABILITY', 'CARGO', 'GENERAL', 'WORKERS_COMP', 'UMBRELLA')");
    t.index('company_profile_id');
  });

  // Apply updated_at trigger if it exists
  const hasTriggerFn = await knex.raw(`
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  `);
  if (hasTriggerFn.rows.length > 0) {
    await knex.raw(`
      CREATE TRIGGER set_updated_at BEFORE UPDATE ON company_profile
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      CREATE TRIGGER set_updated_at BEFORE UPDATE ON company_insurance
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('company_insurance');
  await knex.schema.dropTableIfExists('company_profile');
}
