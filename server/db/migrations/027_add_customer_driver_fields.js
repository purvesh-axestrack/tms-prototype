/**
 * 027 — Add missing domain fields to customers and drivers tables.
 *
 * Customers: customer_type, dot_number, phone, contact_name, address fields, credit_limit
 * Drivers:   email, driver_type, tax_type, route_type, hire_date
 */

export async function up(knex) {
  // ── Customers ────────────────────────────────────────────────────────
  await knex.schema.alterTable('customers', (t) => {
    t.string('customer_type').defaultTo(null);
    t.string('dot_number').defaultTo(null);
    t.string('phone').defaultTo(null);
    t.string('contact_name').defaultTo(null);
    t.string('address').defaultTo(null);
    t.string('city').defaultTo(null);
    t.string('state', 2).defaultTo(null);
    t.string('zip', 10).defaultTo(null);
    t.decimal('credit_limit', 10, 2).defaultTo(null);
  });

  // CHECK on customer_type
  await knex.raw(`
    ALTER TABLE customers
      ADD CONSTRAINT chk_customers_customer_type
      CHECK (customer_type IN ('BROKER', 'SHIPPER', 'PARTNER'))
  `);

  // Partial unique on dot_number (allow NULLs)
  await knex.raw(`
    CREATE UNIQUE INDEX uq_customers_dot_number
    ON customers (dot_number) WHERE dot_number IS NOT NULL
  `);

  // ── Drivers ──────────────────────────────────────────────────────────
  await knex.schema.alterTable('drivers', (t) => {
    t.string('email').defaultTo(null);
    t.string('driver_type').defaultTo(null);
    t.string('tax_type').defaultTo(null);
    t.string('route_type').defaultTo(null);
    t.date('hire_date').defaultTo(null);
  });

  // CHECK on driver_type
  await knex.raw(`
    ALTER TABLE drivers
      ADD CONSTRAINT chk_drivers_driver_type
      CHECK (driver_type IN ('COMPANY_DRIVER', 'OWNER_OPERATOR'))
  `);

  // CHECK on tax_type
  await knex.raw(`
    ALTER TABLE drivers
      ADD CONSTRAINT chk_drivers_tax_type
      CHECK (tax_type IN ('W2', '1099'))
  `);

  // CHECK on route_type
  await knex.raw(`
    ALTER TABLE drivers
      ADD CONSTRAINT chk_drivers_route_type
      CHECK (route_type IN ('LOCAL', 'REGIONAL', 'OTR'))
  `);
}

export async function down(knex) {
  // Drop driver constraints and columns
  await knex.raw('ALTER TABLE drivers DROP CONSTRAINT IF EXISTS chk_drivers_route_type');
  await knex.raw('ALTER TABLE drivers DROP CONSTRAINT IF EXISTS chk_drivers_tax_type');
  await knex.raw('ALTER TABLE drivers DROP CONSTRAINT IF EXISTS chk_drivers_driver_type');
  await knex.schema.alterTable('drivers', (t) => {
    t.dropColumn('email');
    t.dropColumn('driver_type');
    t.dropColumn('tax_type');
    t.dropColumn('route_type');
    t.dropColumn('hire_date');
  });

  // Drop customer constraints and columns
  await knex.raw('DROP INDEX IF EXISTS uq_customers_dot_number');
  await knex.raw('ALTER TABLE customers DROP CONSTRAINT IF EXISTS chk_customers_customer_type');
  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('customer_type');
    t.dropColumn('dot_number');
    t.dropColumn('phone');
    t.dropColumn('contact_name');
    t.dropColumn('address');
    t.dropColumn('city');
    t.dropColumn('state');
    t.dropColumn('zip');
    t.dropColumn('credit_limit');
  });
}
