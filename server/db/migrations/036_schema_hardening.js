/**
 * Schema hardening: fix stale CHECKs, add missing CHECKs, add UNIQUE indexes,
 * fix ON DELETE for remaining FKs.
 *
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  // ── 1. Fix stale CHECK constraints ──────────────────────────────────

  // drivers.status — add INACTIVE to allowed values
  await knex.raw(`ALTER TABLE drivers DROP CONSTRAINT IF EXISTS chk_drivers_status`);
  await knex.raw(`ALTER TABLE drivers ADD CONSTRAINT chk_drivers_status CHECK (status IN ('AVAILABLE', 'EN_ROUTE', 'OUT_OF_SERVICE', 'INACTIVE'))`);

  // loads.equipment_type — remove DRY_VAN_REEFER (not in constants)
  await knex.raw(`ALTER TABLE loads DROP CONSTRAINT IF EXISTS chk_loads_equipment_type`);
  await knex.raw(`ALTER TABLE loads ADD CONSTRAINT chk_loads_equipment_type CHECK (equipment_type IN ('DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'LOWBOY', 'HOTSHOT', 'CONTAINER', 'POWER_ONLY', 'TANKER', 'STRAIGHT_TRUCK', 'SPRINTER_VAN', 'CARGO_VAN'))`);

  // ── 2. Add missing CHECK constraint ─────────────────────────────────

  await knex.raw(`ALTER TABLE stops ADD CONSTRAINT chk_stops_quantity_type CHECK (quantity_type IS NULL OR quantity_type IN ('PALLETS', 'BOXES', 'BUSHELS', 'CASES', 'CRATES', 'GALLONS', 'PIECES', 'TRAILER', 'ROLLS', 'DRUMS', 'BAG', 'BARREL', 'CARTON', 'PACKAGE', 'SKID', 'TANK', 'HAZMAT', 'POUND', 'LINEAR_FEET', 'BULK', 'MIXED', 'TON', 'HOURS', 'DAYS', 'FEET', 'METERS', 'INCHES', 'CENTIMETERS', 'YARDS', 'TOTES'))`);

  // ── 3. Add missing UNIQUE indexes (partial — WHERE NOT NULL) ────────

  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS uq_drivers_email ON drivers (email) WHERE email IS NOT NULL`);
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS uq_drivers_phone ON drivers (phone) WHERE phone IS NOT NULL`);
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_samsara_id ON vehicles (samsara_id) WHERE samsara_id IS NOT NULL`);
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS uq_gmail_settings_email ON gmail_settings (email_address) WHERE email_address IS NOT NULL`);
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS uq_carrier_insurance_policy ON carrier_insurance (carrier_id, policy_type)`);

  // ── 4. Fix FKs missing ON DELETE ────────────────────────────────────

  // drivers.carrier_id → carriers.id ON DELETE SET NULL
  await knex.raw(`ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_carrier_id_foreign`);
  await knex.raw(`ALTER TABLE drivers ADD CONSTRAINT drivers_carrier_id_foreign FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE SET NULL`);

  // drivers.team_driver_id → drivers.id ON DELETE SET NULL
  await knex.raw(`ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_team_driver_id_foreign`);
  await knex.raw(`ALTER TABLE drivers ADD CONSTRAINT drivers_team_driver_id_foreign FOREIGN KEY (team_driver_id) REFERENCES drivers(id) ON DELETE SET NULL`);

  // vehicles.carrier_id → carriers.id ON DELETE SET NULL
  await knex.raw(`ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_carrier_id_foreign`);
  await knex.raw(`ALTER TABLE vehicles ADD CONSTRAINT vehicles_carrier_id_foreign FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE SET NULL`);

  // email_imports.load_id — add proper FK (was informal ref) + ON DELETE SET NULL
  await knex.raw(`ALTER TABLE email_imports DROP CONSTRAINT IF EXISTS email_imports_load_id_foreign`);
  await knex.raw(`ALTER TABLE email_imports ADD CONSTRAINT email_imports_load_id_foreign FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE SET NULL`);
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  // Revert FKs to no ON DELETE
  await knex.raw(`ALTER TABLE email_imports DROP CONSTRAINT IF EXISTS email_imports_load_id_foreign`);
  await knex.raw(`ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_carrier_id_foreign`);
  await knex.raw(`ALTER TABLE vehicles ADD CONSTRAINT vehicles_carrier_id_foreign FOREIGN KEY (carrier_id) REFERENCES carriers(id)`);
  await knex.raw(`ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_team_driver_id_foreign`);
  await knex.raw(`ALTER TABLE drivers ADD CONSTRAINT drivers_team_driver_id_foreign FOREIGN KEY (team_driver_id) REFERENCES drivers(id)`);
  await knex.raw(`ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_carrier_id_foreign`);
  await knex.raw(`ALTER TABLE drivers ADD CONSTRAINT drivers_carrier_id_foreign FOREIGN KEY (carrier_id) REFERENCES carriers(id)`);

  // Drop UNIQUE indexes
  await knex.raw(`DROP INDEX IF EXISTS uq_carrier_insurance_policy`);
  await knex.raw(`DROP INDEX IF EXISTS uq_gmail_settings_email`);
  await knex.raw(`DROP INDEX IF EXISTS uq_vehicles_samsara_id`);
  await knex.raw(`DROP INDEX IF EXISTS uq_drivers_phone`);
  await knex.raw(`DROP INDEX IF EXISTS uq_drivers_email`);

  // Drop stops.quantity_type CHECK
  await knex.raw(`ALTER TABLE stops DROP CONSTRAINT IF EXISTS chk_stops_quantity_type`);

  // Restore old CHECK constraints
  await knex.raw(`ALTER TABLE loads DROP CONSTRAINT IF EXISTS chk_loads_equipment_type`);
  await knex.raw(`ALTER TABLE loads ADD CONSTRAINT chk_loads_equipment_type CHECK (equipment_type IN ('DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'LOWBOY', 'HOTSHOT', 'CONTAINER', 'POWER_ONLY', 'TANKER', 'STRAIGHT_TRUCK', 'SPRINTER_VAN', 'CARGO_VAN', 'DRY_VAN_REEFER'))`);

  await knex.raw(`ALTER TABLE drivers DROP CONSTRAINT IF EXISTS chk_drivers_status`);
  await knex.raw(`ALTER TABLE drivers ADD CONSTRAINT chk_drivers_status CHECK (status IN ('AVAILABLE', 'EN_ROUTE', 'OUT_OF_SERVICE'))`);
}
