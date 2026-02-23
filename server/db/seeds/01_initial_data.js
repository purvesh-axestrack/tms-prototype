export async function seed(knex) {
  // Clear tables in reverse FK order
  await knex('settlement_line_items').del();
  await knex('driver_deductions').del();
  await knex('stops').del();
  await knex('documents').del();
  await knex('load_accessorials').del();
  await knex('invoice_line_items').del();
  await knex('loads').del();
  await knex('settlements').del();
  await knex('invoices').del();
  await knex('email_imports').del();
  await knex('gmail_settings').del();
  await knex('refresh_tokens').del();
  await knex('deduction_types').del();
  await knex('accessorial_types').del();
  await knex('drivers').del();
  await knex('customers').del();
  await knex('users').del();

  // Pre-hashed password for 'password123'
  const passwordHash = '$2b$10$DFVCDu0hxrRuHLsTJv2Ioe.PTw8C54x11Ne2/eTk8YcLgEtkt6zxi';

  // Users
  await knex('users').insert([
    { id: '1', email: 'admin@tms.com', role: 'ADMIN', full_name: 'Admin User', password_hash: passwordHash },
    { id: '2', email: 'dispatcher@tms.com', role: 'DISPATCHER', full_name: 'Sarah Dispatcher', password_hash: passwordHash },
    { id: '3', email: 'accountant@tms.com', role: 'ACCOUNTANT', full_name: 'Mike Accountant', password_hash: passwordHash },
  ]);

  // Customers
  await knex('customers').insert([
    { id: 'c1', company_name: 'Walmart Transportation', mc_number: 'MC123456', billing_email: 'billing@walmart.com', payment_terms: 30, is_active: true },
    { id: 'c2', company_name: 'Target Logistics', mc_number: 'MC234567', billing_email: 'ap@target.com', payment_terms: 45, is_active: true },
    { id: 'c3', company_name: 'CH Robinson', mc_number: 'MC345678', billing_email: 'broker@chrobinson.com', payment_terms: 30, is_active: true },
    { id: 'c4', company_name: 'Amazon Freight', mc_number: 'MC456789', billing_email: 'freight@amazon.com', payment_terms: 60, is_active: true },
  ]);

  // Accessorial Types
  await knex('accessorial_types').insert([
    { code: 'DETENTION', name: 'Detention', description: 'Waiting time at facility', default_amount: 75.00, unit: 'PER_HOUR' },
    { code: 'LAYOVER', name: 'Layover', description: 'Overnight layover charge', default_amount: 300.00, unit: 'PER_DAY' },
    { code: 'LUMPER', name: 'Lumper', description: 'Lumper/unloading service fee', default_amount: 0, unit: 'FLAT' },
    { code: 'TONU', name: 'Truck Order Not Used', description: 'Cancellation/TONU fee', default_amount: 250.00, unit: 'FLAT' },
    { code: 'DRIVER_ASSIST', name: 'Driver Assist', description: 'Driver assist in loading/unloading', default_amount: 100.00, unit: 'FLAT' },
    { code: 'LIFTGATE', name: 'Liftgate', description: 'Liftgate service', default_amount: 75.00, unit: 'FLAT' },
  ]);

  // Deduction Types
  await knex('deduction_types').insert([
    { code: 'INSURANCE', name: 'Insurance Premium', is_recurring: true, default_amount: 150.00 },
    { code: 'ELD_LEASE', name: 'ELD Lease', is_recurring: true, default_amount: 25.00 },
    { code: 'FUEL_ADVANCE', name: 'Fuel Advance', is_recurring: false, default_amount: 0 },
    { code: 'TRAILER_LEASE', name: 'Trailer Lease', is_recurring: true, default_amount: 200.00 },
    { code: 'CASH_ADVANCE', name: 'Cash Advance', is_recurring: false, default_amount: 0 },
    { code: 'ESCROW', name: 'Escrow/Maintenance Reserve', is_recurring: true, default_amount: 50.00 },
  ]);

  // Drivers
  await knex('drivers').insert([
    { id: 'd1', full_name: 'John Miller', phone: '555-0101', license_number: 'CDL123456', license_state: 'TX', status: 'AVAILABLE', pay_model: 'CPM', pay_rate: 0.55, minimum_per_mile: null },
    { id: 'd2', full_name: 'Maria Garcia', phone: '555-0102', license_number: 'CDL234567', license_state: 'CA', status: 'EN_ROUTE', pay_model: 'PERCENTAGE', pay_rate: 25.0, minimum_per_mile: 0.50 },
    { id: 'd3', full_name: 'David Chen', phone: '555-0103', license_number: 'CDL345678', license_state: 'IL', status: 'AVAILABLE', pay_model: 'FLAT', pay_rate: 1200.0, minimum_per_mile: null },
    { id: 'd4', full_name: 'Angela Brown', phone: '555-0104', license_number: 'CDL456789', license_state: 'GA', status: 'AVAILABLE', pay_model: 'CPM', pay_rate: 0.60, minimum_per_mile: null },
    { id: 'd5', full_name: 'Robert Wilson', phone: '555-0105', license_number: 'CDL567890', license_state: 'FL', status: 'OUT_OF_SERVICE', pay_model: 'PERCENTAGE', pay_rate: 28.0, minimum_per_mile: 0.55 },
  ]);

  // Loads
  await knex('loads').insert([
    { id: 1001, reference_number: 'WMT-2024-001', customer_id: 'c1', driver_id: 'd2', dispatcher_id: '2', status: 'IN_TRANSIT', assigned_at: '2024-02-01T08:00:00Z', picked_up_at: '2024-02-01T14:30:00Z', delivered_at: null, rate_amount: 2500.00, rate_type: 'FLAT', loaded_miles: 850, empty_miles: 50, commodity: 'General Freight', weight: 42000, equipment_type: 'Dry Van' },
    { id: 1002, reference_number: 'TGT-2024-045', customer_id: 'c2', driver_id: 'd1', dispatcher_id: '2', status: 'DISPATCHED', assigned_at: '2024-02-02T09:00:00Z', picked_up_at: null, delivered_at: null, rate_amount: 1800.00, rate_type: 'FLAT', loaded_miles: 620, empty_miles: 30, commodity: 'Retail Goods', weight: 38000, equipment_type: 'Dry Van' },
    { id: 1003, reference_number: 'CHR-2024-789', customer_id: 'c3', driver_id: 'd3', dispatcher_id: '2', status: 'ASSIGNED', assigned_at: '2024-02-02T11:30:00Z', picked_up_at: null, delivered_at: null, rate_amount: 3200.00, rate_type: 'FLAT', loaded_miles: 1450, empty_miles: 80, commodity: 'Electronics', weight: 35000, equipment_type: 'Dry Van' },
    { id: 1004, reference_number: 'AMZ-2024-112', customer_id: 'c4', driver_id: null, dispatcher_id: '2', status: 'CREATED', assigned_at: null, picked_up_at: null, delivered_at: null, rate_amount: 2100.00, rate_type: 'FLAT', loaded_miles: 780, empty_miles: 0, commodity: 'Amazon Packages', weight: 40000, equipment_type: 'Dry Van' },
    { id: 1005, reference_number: 'WMT-2024-002', customer_id: 'c1', driver_id: null, dispatcher_id: '2', status: 'CREATED', assigned_at: null, picked_up_at: null, delivered_at: null, rate_amount: 1950.00, rate_type: 'FLAT', loaded_miles: 650, empty_miles: 0, commodity: 'Groceries', weight: 44000, equipment_type: 'Reefer' },
    { id: 1006, reference_number: 'CHR-2024-790', customer_id: 'c3', driver_id: 'd4', dispatcher_id: '2', status: 'PICKED_UP', assigned_at: '2024-02-01T10:00:00Z', picked_up_at: '2024-02-02T09:30:00Z', delivered_at: null, rate_amount: 2800.00, rate_type: 'FLAT', loaded_miles: 1200, empty_miles: 45, commodity: 'Automotive Parts', weight: 39000, equipment_type: 'Dry Van' },
    { id: 1007, reference_number: 'TGT-2024-046', customer_id: 'c2', driver_id: 'd1', dispatcher_id: '2', status: 'DELIVERED', assigned_at: '2024-01-28T08:00:00Z', picked_up_at: '2024-01-29T10:00:00Z', delivered_at: '2024-01-30T14:30:00Z', rate_amount: 2200.00, rate_type: 'FLAT', loaded_miles: 920, empty_miles: 60, commodity: 'Furniture', weight: 41000, equipment_type: 'Dry Van' },
    { id: 1008, reference_number: 'AMZ-2024-113', customer_id: 'c4', driver_id: 'd2', dispatcher_id: '2', status: 'DELIVERED', assigned_at: '2024-01-27T07:00:00Z', picked_up_at: '2024-01-28T08:15:00Z', delivered_at: '2024-01-29T16:00:00Z', rate_amount: 2650.00, rate_type: 'FLAT', loaded_miles: 1100, empty_miles: 70, commodity: 'E-commerce Packages', weight: 38500, equipment_type: 'Dry Van' },
  ]);

  // Reset the auto-increment sequence for loads
  await knex.raw("SELECT setval('loads_id_seq', (SELECT MAX(id) FROM loads))");

  // Stops
  await knex('stops').insert([
    { id: 's1', load_id: 1001, sequence_order: 1, stop_type: 'PICKUP', facility_name: 'Walmart DC 6012', address: '2500 Industrial Blvd', city: 'Dallas', state: 'TX', zip: '75201', appointment_start: '2024-02-01T14:00:00Z', appointment_end: '2024-02-01T16:00:00Z', arrived_at: '2024-02-01T14:30:00Z', departed_at: '2024-02-01T15:45:00Z' },
    { id: 's2', load_id: 1001, sequence_order: 2, stop_type: 'DELIVERY', facility_name: 'Walmart Store 4532', address: '789 Main St', city: 'Phoenix', state: 'AZ', zip: '85001', appointment_start: '2024-02-03T08:00:00Z', appointment_end: '2024-02-03T12:00:00Z', arrived_at: null, departed_at: null },
    { id: 's3', load_id: 1002, sequence_order: 1, stop_type: 'PICKUP', facility_name: 'Target DC', address: '1200 Distribution Way', city: 'Atlanta', state: 'GA', zip: '30301', appointment_start: '2024-02-03T10:00:00Z', appointment_end: '2024-02-03T14:00:00Z', arrived_at: null, departed_at: null },
    { id: 's4', load_id: 1002, sequence_order: 2, stop_type: 'DELIVERY', facility_name: 'Target Store', address: '450 Commerce Pkwy', city: 'Charlotte', state: 'NC', zip: '28201', appointment_start: '2024-02-04T08:00:00Z', appointment_end: '2024-02-04T12:00:00Z', arrived_at: null, departed_at: null },
    { id: 's5', load_id: 1003, sequence_order: 1, stop_type: 'PICKUP', facility_name: 'Electronics Warehouse', address: '5600 Tech Center Dr', city: 'San Jose', state: 'CA', zip: '95110', appointment_start: '2024-02-04T08:00:00Z', appointment_end: '2024-02-04T12:00:00Z', arrived_at: null, departed_at: null },
    { id: 's6', load_id: 1003, sequence_order: 2, stop_type: 'DELIVERY', facility_name: 'Best Buy DC', address: '2200 Logistics Rd', city: 'Denver', state: 'CO', zip: '80201', appointment_start: '2024-02-06T09:00:00Z', appointment_end: '2024-02-06T15:00:00Z', arrived_at: null, departed_at: null },
    { id: 's7', load_id: 1004, sequence_order: 1, stop_type: 'PICKUP', facility_name: 'Amazon Fulfillment Center', address: '1000 Amazon Way', city: 'Memphis', state: 'TN', zip: '38101', appointment_start: '2024-02-05T06:00:00Z', appointment_end: '2024-02-05T10:00:00Z', arrived_at: null, departed_at: null },
    { id: 's8', load_id: 1004, sequence_order: 2, stop_type: 'DELIVERY', facility_name: 'Amazon Delivery Station', address: '3400 Warehouse Blvd', city: 'Indianapolis', state: 'IN', zip: '46201', appointment_start: '2024-02-06T08:00:00Z', appointment_end: '2024-02-06T14:00:00Z', arrived_at: null, departed_at: null },
    { id: 's9', load_id: 1005, sequence_order: 1, stop_type: 'PICKUP', facility_name: 'Food Distribution Center', address: '800 Cold Storage Dr', city: 'Kansas City', state: 'MO', zip: '64101', appointment_start: '2024-02-05T12:00:00Z', appointment_end: '2024-02-05T16:00:00Z', arrived_at: null, departed_at: null },
    { id: 's10', load_id: 1005, sequence_order: 2, stop_type: 'DELIVERY', facility_name: 'Walmart Supercenter', address: '2100 Retail Pkwy', city: 'Oklahoma City', state: 'OK', zip: '73101', appointment_start: '2024-02-06T10:00:00Z', appointment_end: '2024-02-06T14:00:00Z', arrived_at: null, departed_at: null },
    { id: 's11', load_id: 1006, sequence_order: 1, stop_type: 'PICKUP', facility_name: 'AutoZone Warehouse', address: '4500 Parts Ave', city: 'Detroit', state: 'MI', zip: '48201', appointment_start: '2024-02-02T08:00:00Z', appointment_end: '2024-02-02T12:00:00Z', arrived_at: '2024-02-02T09:30:00Z', departed_at: '2024-02-02T10:45:00Z' },
    { id: 's12', load_id: 1006, sequence_order: 2, stop_type: 'DELIVERY', facility_name: 'AutoZone DC', address: '1800 Distribution Center', city: 'Nashville', state: 'TN', zip: '37201', appointment_start: '2024-02-04T08:00:00Z', appointment_end: '2024-02-04T14:00:00Z', arrived_at: null, departed_at: null },
    { id: 's13', load_id: 1007, sequence_order: 1, stop_type: 'PICKUP', facility_name: 'Furniture Manufacturer', address: '3000 Factory Rd', city: 'High Point', state: 'NC', zip: '27260', appointment_start: '2024-01-29T09:00:00Z', appointment_end: '2024-01-29T13:00:00Z', arrived_at: '2024-01-29T10:00:00Z', departed_at: '2024-01-29T11:30:00Z' },
    { id: 's14', load_id: 1007, sequence_order: 2, stop_type: 'DELIVERY', facility_name: 'Target DC', address: '5500 Logistics Way', city: 'Boston', state: 'MA', zip: '02101', appointment_start: '2024-01-30T13:00:00Z', appointment_end: '2024-01-30T17:00:00Z', arrived_at: '2024-01-30T14:00:00Z', departed_at: '2024-01-30T15:45:00Z' },
    { id: 's15', load_id: 1008, sequence_order: 1, stop_type: 'PICKUP', facility_name: 'Amazon FC LAX9', address: '16900 Valley View Ave', city: 'Los Angeles', state: 'CA', zip: '90001', appointment_start: '2024-01-28T07:00:00Z', appointment_end: '2024-01-28T11:00:00Z', arrived_at: '2024-01-28T08:15:00Z', departed_at: '2024-01-28T09:30:00Z' },
    { id: 's16', load_id: 1008, sequence_order: 2, stop_type: 'DELIVERY', facility_name: 'Amazon Delivery Station', address: '7800 E Commerce Way', city: 'Las Vegas', state: 'NV', zip: '89101', appointment_start: '2024-01-29T14:00:00Z', appointment_end: '2024-01-29T18:00:00Z', arrived_at: '2024-01-29T15:30:00Z', departed_at: '2024-01-29T16:45:00Z' },
  ]);
}
