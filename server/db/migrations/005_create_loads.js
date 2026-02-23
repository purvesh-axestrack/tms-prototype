export function up(knex) {
  return knex.schema.createTable('loads', (table) => {
    table.increments('id').primary();
    table.string('reference_number');
    table.string('customer_id').references('id').inTable('customers');
    table.string('driver_id').references('id').inTable('drivers');
    table.string('dispatcher_id').references('id').inTable('users');
    table.string('status').notNullable().defaultTo('CREATED');
    // DRAFT, CREATED, ASSIGNED, DISPATCHED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED
    table.integer('email_import_id').unsigned().references('id').inTable('email_imports');
    table.decimal('confidence_score', 3, 2);
    table.timestamp('assigned_at');
    table.timestamp('picked_up_at');
    table.timestamp('delivered_at');
    table.decimal('rate_amount', 10, 2);
    table.string('rate_type').defaultTo('FLAT'); // FLAT, CPM, PERCENTAGE
    table.integer('loaded_miles').defaultTo(0);
    table.integer('empty_miles').defaultTo(0);
    table.string('commodity');
    table.integer('weight').defaultTo(0);
    table.string('equipment_type').defaultTo('Dry Van');
    table.text('special_instructions');
    table.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('loads');
}
