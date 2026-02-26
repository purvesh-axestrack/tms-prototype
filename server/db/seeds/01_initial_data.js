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
  await knex('vehicles').del();
  await knex('drivers').del();
  await knex('customers').del();
  await knex('users').del();

  // Pre-hashed password for 'password123'
  const passwordHash = '$2b$10$DFVCDu0hxrRuHLsTJv2Ioe.PTw8C54x11Ne2/eTk8YcLgEtkt6zxi';

  // ── Users ──────────────────────────────────────────────
  await knex('users').insert([
    { id: '1', email: 'admin@tms.com', role: 'ADMIN', full_name: 'Admin User', password_hash: passwordHash },
    { id: '2', email: 'dispatcher@tms.com', role: 'DISPATCHER', full_name: 'Sarah Mitchell', password_hash: passwordHash },
    { id: '3', email: 'accountant@tms.com', role: 'ACCOUNTANT', full_name: 'Mike Torres', password_hash: passwordHash },
    { id: '4', email: 'dispatch2@tms.com', role: 'DISPATCHER', full_name: 'James Park', password_hash: passwordHash },
  ]);

  // ── Customers (12) ─────────────────────────────────────
  await knex('customers').insert([
    { id: 'c_01', company_name: 'Walmart Transportation', mc_number: 'MC-123456', billing_email: 'billing@walmart.com', payment_terms: 30, is_active: true },
    { id: 'c_02', company_name: 'Target Logistics', mc_number: 'MC-234567', billing_email: 'ap@target.com', payment_terms: 45, is_active: true },
    { id: 'c_03', company_name: 'CH Robinson Worldwide', mc_number: 'MC-345678', billing_email: 'broker@chrobinson.com', payment_terms: 30, is_active: true },
    { id: 'c_04', company_name: 'Amazon Freight', mc_number: 'MC-456789', billing_email: 'freight@amazon.com', payment_terms: 60, is_active: true },
    { id: 'c_05', company_name: 'XPO Logistics', mc_number: 'MC-567890', billing_email: 'billing@xpo.com', payment_terms: 30, is_active: true },
    { id: 'c_06', company_name: 'Coyote Logistics (UPS)', mc_number: 'MC-678901', billing_email: 'pay@coyote.com', payment_terms: 30, is_active: true },
    { id: 'c_07', company_name: 'Total Quality Logistics', mc_number: 'MC-789012', billing_email: 'ap@tql.com', payment_terms: 30, is_active: true },
    { id: 'c_08', company_name: 'Echo Global Logistics', mc_number: 'MC-890123', billing_email: 'payments@echo.com', payment_terms: 45, is_active: true },
    { id: 'c_09', company_name: 'Schneider National', mc_number: 'MC-901234', billing_email: 'freight@schneider.com', payment_terms: 30, is_active: true },
    { id: 'c_10', company_name: 'Landstar System', mc_number: 'MC-012345', billing_email: 'agents@landstar.com', payment_terms: 30, is_active: true },
    { id: 'c_11', company_name: 'JB Hunt Transport', mc_number: 'MC-112233', billing_email: 'billing@jbhunt.com', payment_terms: 45, is_active: true },
    { id: 'c_12', company_name: 'GlobalTranz Enterprises', mc_number: 'MC-223344', billing_email: 'ap@globaltranz.com', payment_terms: 30, is_active: true },
  ]);

  // ── Accessorial Types ──────────────────────────────────
  await knex('accessorial_types').insert([
    { code: 'DETENTION', name: 'Detention', description: 'Waiting time at facility beyond free time', default_amount: 75.00, unit: 'PER_HOUR' },
    { code: 'LAYOVER', name: 'Layover', description: 'Overnight layover charge', default_amount: 300.00, unit: 'PER_DAY' },
    { code: 'LUMPER', name: 'Lumper', description: 'Lumper/unloading service fee', default_amount: 0, unit: 'FLAT' },
    { code: 'TONU', name: 'Truck Order Not Used', description: 'Cancellation/TONU fee', default_amount: 250.00, unit: 'FLAT' },
    { code: 'DRIVER_ASSIST', name: 'Driver Assist', description: 'Driver assist in loading/unloading', default_amount: 100.00, unit: 'FLAT' },
    { code: 'LIFTGATE', name: 'Liftgate', description: 'Liftgate service', default_amount: 75.00, unit: 'FLAT' },
    { code: 'FUEL_SURCHARGE', name: 'Fuel Surcharge', description: 'Fuel surcharge percentage', default_amount: 0, unit: 'PERCENTAGE' },
    { code: 'STOP_OFF', name: 'Stop-Off', description: 'Additional stop charge', default_amount: 150.00, unit: 'FLAT' },
  ]);

  // ── Deduction Types ────────────────────────────────────
  await knex('deduction_types').insert([
    { code: 'INSURANCE', name: 'Insurance Premium', is_recurring: true, default_amount: 150.00 },
    { code: 'ELD_LEASE', name: 'ELD Lease', is_recurring: true, default_amount: 25.00 },
    { code: 'FUEL_ADVANCE', name: 'Fuel Advance', is_recurring: false, default_amount: 0 },
    { code: 'TRAILER_LEASE', name: 'Trailer Lease', is_recurring: true, default_amount: 200.00 },
    { code: 'CASH_ADVANCE', name: 'Cash Advance', is_recurring: false, default_amount: 0 },
    { code: 'ESCROW', name: 'Escrow/Maintenance Reserve', is_recurring: true, default_amount: 50.00 },
    { code: 'PARKING', name: 'Parking Fee', is_recurring: true, default_amount: 75.00 },
    { code: 'TOLL_PASS', name: 'Toll/EZPass', is_recurring: true, default_amount: 35.00 },
  ]);

  // ── Drivers (12) ───────────────────────────────────────
  await knex('drivers').insert([
    { id: 'd_01', full_name: 'John Miller', phone: '555-0101', license_number: 'CDL-TX-123456', license_state: 'TX', status: 'EN_ROUTE', pay_model: 'CPM', pay_rate: 0.55 },
    { id: 'd_02', full_name: 'Maria Garcia', phone: '555-0102', license_number: 'CDL-CA-234567', license_state: 'CA', status: 'EN_ROUTE', pay_model: 'PERCENTAGE', pay_rate: 25.0, minimum_per_mile: 0.50 },
    { id: 'd_03', full_name: 'David Chen', phone: '555-0103', license_number: 'CDL-IL-345678', license_state: 'IL', status: 'AVAILABLE', pay_model: 'FLAT', pay_rate: 1200.0 },
    { id: 'd_04', full_name: 'Angela Brown', phone: '555-0104', license_number: 'CDL-GA-456789', license_state: 'GA', status: 'EN_ROUTE', pay_model: 'CPM', pay_rate: 0.60 },
    { id: 'd_05', full_name: 'Robert Wilson', phone: '555-0105', license_number: 'CDL-FL-567890', license_state: 'FL', status: 'OUT_OF_SERVICE', pay_model: 'PERCENTAGE', pay_rate: 28.0, minimum_per_mile: 0.55 },
    { id: 'd_06', full_name: 'Luis Hernandez', phone: '555-0106', license_number: 'CDL-TX-678901', license_state: 'TX', status: 'AVAILABLE', pay_model: 'CPM', pay_rate: 0.58 },
    { id: 'd_07', full_name: 'Patricia Johnson', phone: '555-0107', license_number: 'CDL-OH-789012', license_state: 'OH', status: 'EN_ROUTE', pay_model: 'PERCENTAGE', pay_rate: 26.0, minimum_per_mile: 0.48 },
    { id: 'd_08', full_name: 'James Thompson', phone: '555-0108', license_number: 'CDL-PA-890123', license_state: 'PA', status: 'AVAILABLE', pay_model: 'CPM', pay_rate: 0.52 },
    { id: 'd_09', full_name: 'Svetlana Petrov', phone: '555-0109', license_number: 'CDL-NJ-901234', license_state: 'NJ', status: 'AVAILABLE', pay_model: 'FLAT', pay_rate: 1350.0 },
    { id: 'd_10', full_name: 'Marcus Washington', phone: '555-0110', license_number: 'CDL-TN-012345', license_state: 'TN', status: 'EN_ROUTE', pay_model: 'CPM', pay_rate: 0.57 },
    { id: 'd_11', full_name: 'Raj Patel', phone: '555-0111', license_number: 'CDL-IN-112233', license_state: 'IN', status: 'AVAILABLE', pay_model: 'PERCENTAGE', pay_rate: 24.0, minimum_per_mile: 0.45 },
    { id: 'd_12', full_name: 'Tommy Nguyen', phone: '555-0112', license_number: 'CDL-WA-223344', license_state: 'WA', status: 'AVAILABLE', pay_model: 'CPM', pay_rate: 0.62 },
  ]);

  // ── Vehicles (16: 10 tractors, 6 trailers) ─────────────
  await knex('vehicles').insert([
    { id: 'v_01', unit_number: 'T-101', type: 'TRACTOR', make: 'Freightliner', model: 'Cascadia', year: 2022, vin: '3AKJHHDR5NSLA0001', license_plate: 'TX-TRK-1234', license_state: 'TX', status: 'ACTIVE', current_driver_id: 'd_01' },
    { id: 'v_02', unit_number: 'T-102', type: 'TRACTOR', make: 'Kenworth', model: 'T680', year: 2023, vin: '1XKYD49X0NJ100002', license_plate: 'CA-TRK-5678', license_state: 'CA', status: 'ACTIVE', current_driver_id: 'd_02' },
    { id: 'v_03', unit_number: 'T-103', type: 'TRACTOR', make: 'Peterbilt', model: '579', year: 2021, vin: '1XPBD49X1ND300003', license_plate: 'IL-TRK-9012', license_state: 'IL', status: 'ACTIVE', current_driver_id: 'd_03' },
    { id: 'v_04', unit_number: 'T-104', type: 'TRACTOR', make: 'Volvo', model: 'VNL 860', year: 2023, vin: '4V4NC9EH5PN200004', license_plate: 'GA-TRK-3456', license_state: 'GA', status: 'ACTIVE', current_driver_id: 'd_04' },
    { id: 'v_05', unit_number: 'T-105', type: 'TRACTOR', make: 'International', model: 'LT', year: 2020, vin: '3HSDJAPR1LN600005', license_plate: 'FL-TRK-7890', license_state: 'FL', status: 'IN_SHOP', current_driver_id: 'd_05' },
    { id: 'v_06', unit_number: 'T-106', type: 'TRACTOR', make: 'Freightliner', model: 'Cascadia', year: 2024, vin: '3AKJHHDR7PSLA0006', license_plate: 'TX-TRK-2345', license_state: 'TX', status: 'ACTIVE', current_driver_id: 'd_06' },
    { id: 'v_07', unit_number: 'T-107', type: 'TRACTOR', make: 'Kenworth', model: 'W990', year: 2022, vin: '1XKYD49X2NJ100007', license_plate: 'OH-TRK-6789', license_state: 'OH', status: 'ACTIVE', current_driver_id: 'd_07' },
    { id: 'v_08', unit_number: 'T-108', type: 'TRACTOR', make: 'Mack', model: 'Anthem', year: 2023, vin: '1M1AN07Y5PM000008', license_plate: 'PA-TRK-0123', license_state: 'PA', status: 'ACTIVE', current_driver_id: 'd_08' },
    { id: 'v_09', unit_number: 'T-109', type: 'TRACTOR', make: 'Peterbilt', model: '389', year: 2021, vin: '1XPBD49X3ND300009', license_plate: 'NJ-TRK-4567', license_state: 'NJ', status: 'ACTIVE', current_driver_id: 'd_09' },
    { id: 'v_10', unit_number: 'T-110', type: 'TRACTOR', make: 'Volvo', model: 'VNR 640', year: 2024, vin: '4V4NC9EH7PN200010', license_plate: 'TN-TRK-8901', license_state: 'TN', status: 'ACTIVE', current_driver_id: 'd_10' },
    { id: 'v_11', unit_number: 'TR-201', type: 'TRAILER', make: 'Great Dane', model: 'Champion SE', year: 2022, vin: '1GRAA0622NB700011', license_plate: 'TX-TRL-1111', license_state: 'TX', status: 'ACTIVE' },
    { id: 'v_12', unit_number: 'TR-202', type: 'TRAILER', make: 'Utility', model: '4000D-X', year: 2023, vin: '1UYVS2532NU200012', license_plate: 'CA-TRL-2222', license_state: 'CA', status: 'ACTIVE' },
    { id: 'v_13', unit_number: 'TR-203', type: 'TRAILER', make: 'Wabash', model: 'DuraPlate', year: 2021, vin: '1JJV532D3NL300013', license_plate: 'IL-TRL-3333', license_state: 'IL', status: 'ACTIVE' },
    { id: 'v_14', unit_number: 'TR-204', type: 'TRAILER', make: 'Hyundai', model: 'Translead', year: 2022, vin: '3H3V532T5NL400014', license_plate: 'GA-TRL-4444', license_state: 'GA', status: 'IN_SHOP' },
    { id: 'v_15', unit_number: 'TR-205', type: 'TRAILER', make: 'Carrier', model: 'Reefer 53', year: 2023, vin: '1UYVS2536NU500015', license_plate: 'FL-TRL-5555', license_state: 'FL', status: 'ACTIVE' },
    { id: 'v_16', unit_number: 'TR-206', type: 'TRAILER', make: 'Great Dane', model: 'Freedom SE', year: 2024, vin: '1GRAA0628PB600016', license_plate: 'OH-TRL-6666', license_state: 'OH', status: 'ACTIVE' },
  ]);

  // ── Loads (28 total: 4 OPEN, 5 SCHEDULED, 2 IN_PICKUP_YARD, 4 IN_TRANSIT, 7 COMPLETED, 2 TONU, 1 CANCELLED, 2 INVOICED, 1 BROKERED) ──
  await knex('loads').insert([
    { id: 1001, reference_number: 'WMT-2025-001', customer_id: 'c_01', status: 'OPEN', dispatcher_id: '2', rate_amount: 2150.00, rate_type: 'FLAT', loaded_miles: 720, empty_miles: 35, commodity: 'General Merchandise', weight: 42000, equipment_type: 'DRY_VAN', confidence_score: 0.92 },
    { id: 1002, reference_number: 'TQL-2025-188', customer_id: 'c_07', status: 'OPEN', dispatcher_id: '2', rate_amount: 1875.00, rate_type: 'FLAT', loaded_miles: 580, empty_miles: 20, commodity: 'Paper Products', weight: 38000, equipment_type: 'DRY_VAN', confidence_score: 0.78 },
    { id: 1003, reference_number: 'ECH-2025-044', customer_id: 'c_08', status: 'OPEN', dispatcher_id: '4', rate_amount: 3400.00, rate_type: 'FLAT', loaded_miles: 1380, empty_miles: 65, commodity: 'Consumer Electronics', weight: 34000, equipment_type: 'DRY_VAN', confidence_score: 0.65 },
    { id: 1004, reference_number: 'AMZ-2025-112', customer_id: 'c_04', status: 'OPEN', dispatcher_id: '2', rate_amount: 2100.00, rate_type: 'FLAT', loaded_miles: 780, empty_miles: 0, commodity: 'Amazon Packages', weight: 40000, equipment_type: 'DRY_VAN' },

    { id: 1005, reference_number: 'WMT-2025-015', customer_id: 'c_01', driver_id: 'd_03', status: 'SCHEDULED', dispatcher_id: '2', assigned_at: '2025-02-22T11:30:00Z', rate_amount: 1950.00, rate_type: 'FLAT', loaded_miles: 650, empty_miles: 0, commodity: 'Groceries', weight: 44000, equipment_type: 'REEFER' },
    { id: 1006, reference_number: 'XPO-2025-331', customer_id: 'c_05', driver_id: 'd_06', status: 'SCHEDULED', dispatcher_id: '4', assigned_at: '2025-02-22T14:00:00Z', rate_amount: 2750.00, rate_type: 'FLAT', loaded_miles: 1020, empty_miles: 40, commodity: 'Building Materials', weight: 43000, equipment_type: 'FLATBED' },
    { id: 1007, reference_number: 'COY-2025-099', customer_id: 'c_06', driver_id: 'd_09', status: 'SCHEDULED', dispatcher_id: '2', assigned_at: '2025-02-22T16:15:00Z', rate_amount: 1680.00, rate_type: 'FLAT', loaded_miles: 490, empty_miles: 25, commodity: 'Canned Goods', weight: 41000, equipment_type: 'DRY_VAN' },
    { id: 1008, reference_number: 'CHR-2025-789', customer_id: 'c_03', driver_id: 'd_08', status: 'SCHEDULED', dispatcher_id: '2', assigned_at: '2025-02-21T09:00:00Z', rate_amount: 3200.00, rate_type: 'FLAT', loaded_miles: 1450, empty_miles: 80, commodity: 'Electronics', weight: 35000, equipment_type: 'DRY_VAN' },
    { id: 1009, reference_number: 'TGT-2025-045', customer_id: 'c_02', driver_id: 'd_11', status: 'SCHEDULED', dispatcher_id: '4', assigned_at: '2025-02-21T11:30:00Z', rate_amount: 1800.00, rate_type: 'FLAT', loaded_miles: 620, empty_miles: 30, commodity: 'Retail Goods', weight: 38000, equipment_type: 'DRY_VAN' },

    { id: 1010, reference_number: 'LND-2025-205', customer_id: 'c_10', driver_id: 'd_04', status: 'IN_PICKUP_YARD', dispatcher_id: '2', assigned_at: '2025-02-20T10:00:00Z', picked_up_at: '2025-02-21T09:30:00Z', rate_amount: 2400.00, rate_type: 'FLAT', loaded_miles: 920, empty_miles: 55, commodity: 'Machinery Parts', weight: 39000, equipment_type: 'FLATBED' },
    { id: 1011, reference_number: 'SNI-2025-413', customer_id: 'c_09', driver_id: 'd_12', status: 'IN_PICKUP_YARD', dispatcher_id: '4', assigned_at: '2025-02-20T08:00:00Z', picked_up_at: '2025-02-21T06:45:00Z', rate_amount: 3650.00, rate_type: 'FLAT', loaded_miles: 1560, empty_miles: 70, commodity: 'Frozen Foods', weight: 43000, equipment_type: 'REEFER' },

    { id: 1012, reference_number: 'WMT-2025-023', customer_id: 'c_01', driver_id: 'd_01', status: 'IN_TRANSIT', dispatcher_id: '2', assigned_at: '2025-02-19T08:00:00Z', picked_up_at: '2025-02-20T14:30:00Z', rate_amount: 2500.00, rate_type: 'FLAT', loaded_miles: 850, empty_miles: 50, commodity: 'General Freight', weight: 42000, equipment_type: 'DRY_VAN' },
    { id: 1013, reference_number: 'AMZ-2025-145', customer_id: 'c_04', driver_id: 'd_02', status: 'IN_TRANSIT', dispatcher_id: '2', assigned_at: '2025-02-19T07:00:00Z', picked_up_at: '2025-02-20T08:15:00Z', rate_amount: 2650.00, rate_type: 'FLAT', loaded_miles: 1100, empty_miles: 70, commodity: 'E-commerce Packages', weight: 38500, equipment_type: 'DRY_VAN' },
    { id: 1014, reference_number: 'GTZ-2025-077', customer_id: 'c_12', driver_id: 'd_07', status: 'IN_TRANSIT', dispatcher_id: '4', assigned_at: '2025-02-18T12:00:00Z', picked_up_at: '2025-02-19T10:20:00Z', rate_amount: 1980.00, rate_type: 'FLAT', loaded_miles: 710, empty_miles: 35, commodity: 'Office Supplies', weight: 28000, equipment_type: 'DRY_VAN' },
    { id: 1015, reference_number: 'XPO-2025-344', customer_id: 'c_05', driver_id: 'd_10', status: 'IN_TRANSIT', dispatcher_id: '2', assigned_at: '2025-02-18T06:00:00Z', picked_up_at: '2025-02-19T07:00:00Z', rate_amount: 4200.00, rate_type: 'FLAT', loaded_miles: 1800, empty_miles: 90, commodity: 'Steel Coils', weight: 45000, equipment_type: 'FLATBED' },

    { id: 1016, reference_number: 'TGT-2025-039', customer_id: 'c_02', driver_id: 'd_01', status: 'COMPLETED', dispatcher_id: '2', assigned_at: '2025-02-15T08:00:00Z', picked_up_at: '2025-02-16T10:00:00Z', delivered_at: '2025-02-17T14:30:00Z', rate_amount: 2200.00, rate_type: 'FLAT', loaded_miles: 920, empty_miles: 60, commodity: 'Furniture', weight: 41000, equipment_type: 'DRY_VAN' },
    { id: 1017, reference_number: 'AMZ-2025-098', customer_id: 'c_04', driver_id: 'd_02', status: 'COMPLETED', dispatcher_id: '2', assigned_at: '2025-02-14T07:00:00Z', picked_up_at: '2025-02-15T08:15:00Z', delivered_at: '2025-02-16T16:00:00Z', rate_amount: 2650.00, rate_type: 'FLAT', loaded_miles: 1100, empty_miles: 70, commodity: 'E-commerce Packages', weight: 38500, equipment_type: 'DRY_VAN' },
    { id: 1018, reference_number: 'COY-2025-061', customer_id: 'c_06', driver_id: 'd_03', status: 'COMPLETED', dispatcher_id: '4', assigned_at: '2025-02-13T09:00:00Z', picked_up_at: '2025-02-14T08:00:00Z', delivered_at: '2025-02-15T15:30:00Z', rate_amount: 1750.00, rate_type: 'FLAT', loaded_miles: 540, empty_miles: 25, commodity: 'Beverages', weight: 43000, equipment_type: 'DRY_VAN' },
    { id: 1019, reference_number: 'CHR-2025-755', customer_id: 'c_03', driver_id: 'd_04', status: 'COMPLETED', dispatcher_id: '2', assigned_at: '2025-02-12T10:00:00Z', picked_up_at: '2025-02-13T11:00:00Z', delivered_at: '2025-02-14T18:00:00Z', rate_amount: 3100.00, rate_type: 'FLAT', loaded_miles: 1340, empty_miles: 60, commodity: 'Auto Parts', weight: 37000, equipment_type: 'DRY_VAN' },
    { id: 1020, reference_number: 'TQL-2025-155', customer_id: 'c_07', driver_id: 'd_06', status: 'COMPLETED', dispatcher_id: '2', assigned_at: '2025-02-11T08:30:00Z', picked_up_at: '2025-02-12T07:45:00Z', delivered_at: '2025-02-13T12:00:00Z', rate_amount: 1920.00, rate_type: 'FLAT', loaded_miles: 680, empty_miles: 40, commodity: 'Plastics', weight: 35000, equipment_type: 'DRY_VAN' },
    { id: 1021, reference_number: 'LND-2025-178', customer_id: 'c_10', driver_id: 'd_07', status: 'COMPLETED', dispatcher_id: '4', assigned_at: '2025-02-10T06:00:00Z', picked_up_at: '2025-02-11T09:00:00Z', delivered_at: '2025-02-12T17:30:00Z', rate_amount: 2850.00, rate_type: 'FLAT', loaded_miles: 1150, empty_miles: 55, commodity: 'Lumber', weight: 44000, equipment_type: 'FLATBED' },
    { id: 1022, reference_number: 'SNI-2025-390', customer_id: 'c_09', driver_id: 'd_08', status: 'COMPLETED', dispatcher_id: '2', assigned_at: '2025-02-09T07:00:00Z', picked_up_at: '2025-02-10T08:30:00Z', delivered_at: '2025-02-11T14:00:00Z', rate_amount: 2050.00, rate_type: 'FLAT', loaded_miles: 760, empty_miles: 30, commodity: 'Dairy Products', weight: 40000, equipment_type: 'REEFER' },

    { id: 1023, reference_number: 'JBH-2025-740', customer_id: 'c_11', driver_id: 'd_09', status: 'INVOICED', dispatcher_id: '4', assigned_at: '2025-02-08T10:00:00Z', picked_up_at: '2025-02-09T11:30:00Z', delivered_at: '2025-02-10T16:45:00Z', rate_amount: 2380.00, rate_type: 'FLAT', loaded_miles: 890, empty_miles: 45, commodity: 'Textiles', weight: 33000, equipment_type: 'DRY_VAN' },
    { id: 1024, reference_number: 'WMT-2025-008', customer_id: 'c_01', driver_id: 'd_10', status: 'INVOICED', dispatcher_id: '2', assigned_at: '2025-02-07T05:00:00Z', picked_up_at: '2025-02-08T06:15:00Z', delivered_at: '2025-02-09T13:00:00Z', rate_amount: 3500.00, rate_type: 'FLAT', loaded_miles: 1420, empty_miles: 80, commodity: 'Seasonal Goods', weight: 41000, equipment_type: 'DRY_VAN' },

    { id: 1025, reference_number: 'GTZ-2025-055', customer_id: 'c_12', driver_id: 'd_11', status: 'TONU', dispatcher_id: '2', assigned_at: '2025-02-06T08:00:00Z', rate_amount: 1580.00, rate_type: 'FLAT', loaded_miles: 430, empty_miles: 20, commodity: 'Medical Supplies', weight: 26000, equipment_type: 'DRY_VAN' },
    { id: 1026, reference_number: 'ECH-2025-100', customer_id: 'c_08', driver_id: 'd_08', status: 'TONU', dispatcher_id: '4', assigned_at: '2025-02-05T10:00:00Z', rate_amount: 1200.00, rate_type: 'FLAT', loaded_miles: 350, empty_miles: 15, commodity: 'Appliances', weight: 30000, equipment_type: 'DRY_VAN' },

    { id: 1027, reference_number: 'COY-2025-120', customer_id: 'c_06', status: 'CANCELLED', dispatcher_id: '2', rate_amount: 1400.00, rate_type: 'FLAT', loaded_miles: 400, empty_miles: 10, commodity: 'Produce', weight: 35000, equipment_type: 'REEFER' },

    { id: 1028, reference_number: 'TQL-2025-200', customer_id: 'c_07', status: 'BROKERED', dispatcher_id: '4', rate_amount: 2900.00, rate_type: 'FLAT', loaded_miles: 1100, empty_miles: 50, commodity: 'Household Goods', weight: 38000, equipment_type: 'DRY_VAN' },
  ]);

  await knex.raw("SELECT setval('loads_id_seq', (SELECT MAX(id) FROM loads))");

  // ── Stops (2 per load = 56 stops) ──────────────────────
  const stopRows = [];
  const stopData = [
    [1001, 'Walmart DC 6012', '2500 Industrial Blvd', 'Dallas', 'TX', '75201', 'Walmart Store 4532', '789 Main St', 'Phoenix', 'AZ', '85001'],
    [1002, 'Georgia Pacific Mill', '1500 Paper Mill Rd', 'Savannah', 'GA', '31401', 'TQL Warehouse', '300 Commerce Pkwy', 'Charlotte', 'NC', '28201'],
    [1003, 'Samsung Distribution', '8500 Tech Center Dr', 'San Jose', 'CA', '95110', 'Best Buy DC', '2200 Logistics Rd', 'Denver', 'CO', '80201'],
    [1004, 'Amazon Fulfillment Center', '1000 Amazon Way', 'Memphis', 'TN', '38101', 'Amazon Delivery Station', '3400 Warehouse Blvd', 'Indianapolis', 'IN', '46201'],
    [1005, 'Food Distribution Center', '800 Cold Storage Dr', 'Kansas City', 'MO', '64101', 'Walmart Supercenter', '2100 Retail Pkwy', 'Oklahoma City', 'OK', '73101'],
    [1006, 'Home Depot DC', '4600 Materials Way', 'Atlanta', 'GA', '30301', 'Construction Site', '900 Build Pkwy', 'Nashville', 'TN', '37201'],
    [1007, 'Del Monte Foods', '1200 Cannery Row', 'Modesto', 'CA', '95350', 'Costco Regional DC', '7800 Wholesale Dr', 'Sacramento', 'CA', '95814'],
    [1008, 'Electronics Warehouse', '5600 Tech Center Dr', 'San Jose', 'CA', '95110', 'Micro Center DC', '2200 Logistics Rd', 'Denver', 'CO', '80201'],
    [1009, 'Target DC Southeast', '1200 Distribution Way', 'Atlanta', 'GA', '30301', 'Target Store 5501', '450 Commerce Pkwy', 'Charlotte', 'NC', '28201'],
    [1010, 'Caterpillar Plant', '100 NE Adams St', 'Peoria', 'IL', '61602', 'Equipment Dealer', '5500 Industrial Blvd', 'Houston', 'TX', '77001'],
    [1011, 'Target DC Northeast', '800 Logistics Ave', 'Wilton', 'CT', '06897', 'Target Store 1290', '2300 Retail Rd', 'Richmond', 'VA', '23219'],
    [1012, 'McKesson DC', '6500 Pharma Way', 'Memphis', 'TN', '38118', 'CVS Regional Hub', '1100 Health Dr', 'Louisville', 'KY', '40201'],
    [1013, 'AutoZone Warehouse', '4500 Parts Ave', 'Detroit', 'MI', '48201', 'AutoZone DC South', '1800 Distribution Center', 'Nashville', 'TN', '37201'],
    [1014, 'Tyson Foods Plant', '2200 Don Tyson Pkwy', 'Springdale', 'AR', '72762', 'Kroger Cold Storage', '1400 Vine St', 'Cincinnati', 'OH', '45202'],
    [1015, 'Walmart DC 6012', '2500 Industrial Blvd', 'Dallas', 'TX', '75201', 'Walmart Store 4532', '789 Main St', 'Phoenix', 'AZ', '85001'],
    [1016, 'Amazon FC LAX9', '16900 Valley View Ave', 'Los Angeles', 'CA', '90001', 'Amazon Delivery Station', '7800 E Commerce Way', 'Las Vegas', 'NV', '89101'],
    [1017, 'Staples DC', '500 Staples Dr', 'Framingham', 'MA', '01702', 'Office Depot Hub', '6600 N Military Trail', 'Boca Raton', 'FL', '33496'],
    [1018, 'US Steel Mill', '1 Ben Fairless Dr', 'Fairless Hills', 'PA', '19030', 'Steel Service Center', '3200 Metal Pkwy', 'Houston', 'TX', '77001'],
    [1019, 'Ashley Furniture', '3000 Factory Rd', 'High Point', 'NC', '27260', 'Target DC Northeast', '5500 Logistics Way', 'Boston', 'MA', '02101'],
    [1020, 'Amazon FC PHX6', '4750 W Mohave St', 'Phoenix', 'AZ', '85043', 'Amazon Sort Center', '2100 E Centennial', 'Little Rock', 'AR', '72201'],
    [1021, 'Coca-Cola Bottling', '711 Concord Pkwy S', 'Concord', 'NC', '28025', 'Publix DC', '3300 Publix Corporate Pkwy', 'Lakeland', 'FL', '33811'],
    [1022, 'Ford Parts DC', '20000 Rotunda Dr', 'Dearborn', 'MI', '48121', 'Ford Dealer Network', '5000 Auto Mall Pkwy', 'Fremont', 'CA', '94538'],
    [1023, 'Dow Chemical Plant', '2211 H.H. Dow Way', 'Midland', 'MI', '48674', 'Plastics Mfg Inc', '1800 Industry Blvd', 'Dallas', 'TX', '75201'],
    [1024, 'Weyerhaeuser Mill', '220 Occidental Ave S', 'Seattle', 'WA', '98104', 'Lowes DC Southeast', '1000 Lowes Blvd', 'Mooresville', 'NC', '28117'],
    [1025, 'Dean Foods Plant', '2711 N Haskell Ave', 'Dallas', 'TX', '75204', 'HEB Grocery DC', '646 S Main Ave', 'San Antonio', 'TX', '78204'],
    [1026, 'Gildan Textiles', '600 Red Line Dr', 'Mocksville', 'NC', '27028', 'Nordstrom DC', '7700 Polo Club Dr', 'Newark', 'CA', '94560'],
    [1027, 'Walmart DC 7040', '555 Distribution Way', 'Bentonville', 'AR', '72712', 'Walmart Supercenter 2190', '3200 Retail Way', 'Miami', 'FL', '33101'],
    [1028, 'Medline Industries', '3 Lakes Dr', 'Northfield', 'IL', '60093', 'Memorial Hermann', '6411 Fannin St', 'Houston', 'TX', '77030'],
  ];

  let sid = 1;
  for (const [loadId, pName, pAddr, pCity, pState, pZip, dName, dAddr, dCity, dState, dZip] of stopData) {
    stopRows.push({
      id: `s${sid++}`, load_id: loadId, sequence_order: 1, stop_type: 'PICKUP',
      facility_name: pName, address: pAddr, city: pCity, state: pState, zip: pZip,
      appointment_start: '2025-02-20T08:00:00Z', appointment_end: '2025-02-20T12:00:00Z',
    });
    stopRows.push({
      id: `s${sid++}`, load_id: loadId, sequence_order: 2, stop_type: 'DELIVERY',
      facility_name: dName, address: dAddr, city: dCity, state: dState, zip: dZip,
      appointment_start: '2025-02-22T08:00:00Z', appointment_end: '2025-02-22T14:00:00Z',
    });
  }
  await knex('stops').insert(stopRows);

  // ── Load Accessorials ──────────────────────────────────
  // Look up accessorial type IDs by code
  const accTypes = await knex('accessorial_types').select('id', 'code');
  const accMap = Object.fromEntries(accTypes.map(a => [a.code, a.id]));

  await knex('load_accessorials').insert([
    { load_id: 1016, accessorial_type_id: accMap['DETENTION'], quantity: 2, rate: 75.00, total: 150.00, description: '2 hours detention at pickup' },
    { load_id: 1019, accessorial_type_id: accMap['LUMPER'], quantity: 1, rate: 175.00, total: 175.00, description: 'Lumper fee at delivery' },
    { load_id: 1021, accessorial_type_id: accMap['DRIVER_ASSIST'], quantity: 1, rate: 100.00, total: 100.00, description: 'Driver assist loading' },
    { load_id: 1022, accessorial_type_id: accMap['LAYOVER'], quantity: 1, rate: 300.00, total: 300.00, description: 'Overnight layover - appointment delay' },
    { load_id: 1024, accessorial_type_id: accMap['DETENTION'], quantity: 3, rate: 75.00, total: 225.00, description: '3 hours at Walmart DC' },
    { load_id: 1013, accessorial_type_id: accMap['STOP_OFF'], quantity: 1, rate: 150.00, total: 150.00, description: 'Extra stop added' },
  ]);

  // ── Driver Deductions ──────────────────────────────────
  // Look up deduction type IDs by code
  const dedTypes = await knex('deduction_types').select('id', 'code');
  const dedMap = Object.fromEntries(dedTypes.map(d => [d.code, d.id]));

  await knex('driver_deductions').insert([
    { driver_id: 'd_01', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_01', deduction_type_id: dedMap['ELD_LEASE'], amount: 25.00, is_active: true },
    { driver_id: 'd_01', deduction_type_id: dedMap['ESCROW'], amount: 50.00, is_active: true },
    { driver_id: 'd_02', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_02', deduction_type_id: dedMap['TRAILER_LEASE'], amount: 200.00, is_active: true },
    { driver_id: 'd_03', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_03', deduction_type_id: dedMap['ELD_LEASE'], amount: 25.00, is_active: true },
    { driver_id: 'd_04', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_04', deduction_type_id: dedMap['PARKING'], amount: 75.00, is_active: true },
    { driver_id: 'd_06', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_06', deduction_type_id: dedMap['ESCROW'], amount: 50.00, is_active: true },
    { driver_id: 'd_07', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_07', deduction_type_id: dedMap['ELD_LEASE'], amount: 25.00, is_active: true },
    { driver_id: 'd_08', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_09', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_09', deduction_type_id: dedMap['TOLL_PASS'], amount: 35.00, is_active: true },
    { driver_id: 'd_10', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_10', deduction_type_id: dedMap['ELD_LEASE'], amount: 25.00, is_active: true },
    { driver_id: 'd_11', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_12', deduction_type_id: dedMap['INSURANCE'], amount: 150.00, is_active: true },
    { driver_id: 'd_12', deduction_type_id: dedMap['ESCROW'], amount: 50.00, is_active: true },
  ]);
}
