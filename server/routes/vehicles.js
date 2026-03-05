import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';
import { TERMINAL_STATUSES, VEHICLE_TYPES, VEHICLE_STATUSES, ACTIVE_LOAD_STATUSES } from '../lib/constants.js';
import { pickAllowedFields } from '../lib/helpers.js';

export default function vehiclesRouter(db) {
  const router = Router();

  // GET /api/vehicles
  router.get('/', asyncHandler(async (req, res) => {
    const { type, status, include_inactive, carrier_id } = req.query;
    let query = db('vehicles')
      .leftJoin('drivers as d1', 'vehicles.current_driver_id', 'd1.id')
      .leftJoin('drivers as d2', 'vehicles.current_driver2_id', 'd2.id')
      .leftJoin('carriers as c', 'vehicles.carrier_id', 'c.id')
      .select('vehicles.*', 'd1.full_name as driver_name', 'd2.full_name as driver2_name', 'c.company_name as carrier_name')
      .orderBy('vehicles.unit_number');

    if (!include_inactive) query = query.whereNot('vehicles.status', 'INACTIVE');
    if (type) query = query.where('vehicles.type', type);
    if (status) query = query.where('vehicles.status', status);
    if (carrier_id) query = query.where('vehicles.carrier_id', carrier_id);

    const vehicles = await query;
    res.json(vehicles);
  }));

  // GET /api/vehicles/by-driver/:driverId — must be before /:id
  router.get('/by-driver/:driverId', asyncHandler(async (req, res) => {
    const { driverId } = req.params;

    // Find active truck where driver is primary or team
    const truck = await db('vehicles')
      .where('type', 'TRACTOR')
      .whereNot('status', 'INACTIVE')
      .where(function () {
        this.where('current_driver_id', driverId)
          .orWhere('current_driver2_id', driverId);
      })
      .first();

    // Find suggested trailer from driver's most recent load that had a trailer_id
    const recentLoad = await db('loads')
      .where('driver_id', driverId)
      .whereNotNull('trailer_id')
      .orderBy('created_at', 'desc')
      .first();

    let suggested_trailer = null;
    if (recentLoad?.trailer_id) {
      suggested_trailer = await db('vehicles')
        .where({ id: recentLoad.trailer_id })
        .whereNot('status', 'INACTIVE')
        .first();
    }

    // Fetch team driver from the driver's team_driver_id
    const driverRow = await db('drivers').where({ id: driverId }).first();
    let team_driver = null;
    if (driverRow?.team_driver_id) {
      team_driver = await db('drivers').where({ id: driverRow.team_driver_id }).whereNot('status', 'INACTIVE').first();
    }

    res.json({ truck: truck || null, suggested_trailer, team_driver: team_driver || null });
  }));

  // GET /api/vehicles/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const vehicle = await db('vehicles')
      .leftJoin('drivers as d1', 'vehicles.current_driver_id', 'd1.id')
      .leftJoin('drivers as d2', 'vehicles.current_driver2_id', 'd2.id')
      .leftJoin('carriers as c', 'vehicles.carrier_id', 'c.id')
      .select('vehicles.*', 'd1.full_name as driver_name', 'd2.full_name as driver2_name', 'c.company_name as carrier_name')
      .where('vehicles.id', req.params.id)
      .first();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Get loads assigned to this vehicle (as truck or trailer)
    const loads = await db('loads')
      .where('truck_id', req.params.id)
      .orWhere('trailer_id', req.params.id)
      .orderBy('created_at', 'desc')
      .limit(20);

    res.json({ ...vehicle, recent_loads: loads });
  }));

  // POST /api/vehicles
  router.post('/', asyncHandler(async (req, res) => {
    const { unit_number, type, vin, year, make, model, license_plate, license_state, notes, carrier_id } = req.body;
    if (!unit_number) return res.status(400).json({ error: 'Unit number is required' });
    if (!type || !VEHICLE_TYPES.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${VEHICLE_TYPES.join(', ')}` });
    }

    const id = `v_${crypto.randomUUID().slice(0, 8)}`;
    await db('vehicles').insert({
      id,
      unit_number,
      type,
      vin: vin || null,
      year: year || null,
      make: make || null,
      model: model || null,
      license_plate: license_plate || null,
      license_state: license_state || null,
      notes: notes || null,
      carrier_id: carrier_id || null,
      status: 'ACTIVE',
    });

    const vehicle = await db('vehicles').where({ id }).first();
    res.status(201).json(vehicle);
  }));

  // PATCH /api/vehicles/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const vehicle = await db('vehicles').where({ id: req.params.id }).first();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const updates = pickAllowedFields(req.body, ['unit_number', 'type', 'vin', 'year', 'make', 'model', 'license_plate', 'license_state', 'status', 'current_driver_id', 'current_driver2_id', 'odometer', 'notes', 'carrier_id']);

    if (updates.type && !VEHICLE_TYPES.includes(updates.type)) {
      return res.status(400).json({ error: `Type must be one of: ${VEHICLE_TYPES.join(', ')}` });
    }
    if (updates.status && !VEHICLE_STATUSES.includes(updates.status)) {
      return res.status(400).json({ error: `Status must be one of: ${VEHICLE_STATUSES.join(', ')}` });
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    updates.updated_at = db.fn.now();
    await db('vehicles').where({ id: req.params.id }).update(updates);
    const updated = await db('vehicles').where({ id: req.params.id }).first();
    res.json(updated);
  }));

  // DELETE /api/vehicles/:id (soft delete)
  router.delete('/:id', asyncHandler(async (req, res) => {
    const vehicle = await db('vehicles').where({ id: req.params.id }).first();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Check for active load assignments
    const activeLoads = await db('loads')
      .where(function() {
        this.where('truck_id', req.params.id).orWhere('trailer_id', req.params.id);
      })
      .whereNotIn('status', TERMINAL_STATUSES)
      .count('id as count')
      .first();

    if (parseInt(activeLoads.count) > 0) {
      return res.status(400).json({ error: `Cannot deactivate vehicle with ${activeLoads.count} active loads` });
    }

    await db('vehicles').where({ id: req.params.id }).update({ status: 'INACTIVE', current_driver_id: null, current_driver2_id: null, updated_at: db.fn.now() });
    res.json({ message: 'Vehicle deactivated' });
  }));

  // POST /api/vehicles/:id/assign-driver
  router.post('/:id/assign-driver', asyncHandler(async (req, res) => {
    const { driver_id, role = 'PRIMARY' } = req.body;
    const vehicle = await db('vehicles').where({ id: req.params.id }).first();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const col = role === 'TEAM' ? 'current_driver2_id' : 'current_driver_id';
    let warnings = [];

    await db.transaction(async (trx) => {
      if (driver_id) {
        // Block assigning same driver to both roles on the same vehicle
        const otherCol = role === 'TEAM' ? 'current_driver_id' : 'current_driver2_id';
        if (String(vehicle[otherCol]) === String(driver_id)) {
          return res.status(400).json({ error: 'Driver is already assigned to this vehicle in a different role' });
        }

        // Find vehicles this driver is currently on (before unassigning)
        const oldVehicles = await trx('vehicles')
          .where(function () {
            this.where({ current_driver_id: driver_id })
              .orWhere({ current_driver2_id: driver_id });
          })
          .where({ type: vehicle.type })
          .whereNot({ id: req.params.id });

        // Check if those old vehicles have active loads
        for (const oldVehicle of oldVehicles) {
          const activeLoads = await trx('loads')
            .where({ truck_id: oldVehicle.id })
            .whereIn('status', ACTIVE_LOAD_STATUSES)
            .select('id', 'reference_number', 'status');
          if (activeLoads.length > 0) {
            warnings.push({
              type: 'ACTIVE_LOADS_ON_OLD_VEHICLE',
              vehicle_id: oldVehicle.id,
              unit_number: oldVehicle.unit_number,
              loads: activeLoads.map(l => ({
                id: l.id,
                reference_number: l.reference_number,
                status: l.status,
              })),
              message: `Driver removed from ${oldVehicle.unit_number} which has ${activeLoads.length} active load(s)`,
            });
          }
        }

        // Unassign this driver from BOTH slots on other vehicles of the same type
        await trx('vehicles')
          .where({ current_driver_id: driver_id, type: vehicle.type })
          .whereNot({ id: req.params.id })
          .update({ current_driver_id: null, updated_at: db.fn.now() });
        await trx('vehicles')
          .where({ current_driver2_id: driver_id, type: vehicle.type })
          .whereNot({ id: req.params.id })
          .update({ current_driver2_id: null, updated_at: db.fn.now() });
      }

      await trx('vehicles').where({ id: req.params.id }).update({
        [col]: driver_id || null,
        updated_at: db.fn.now(),
      });

      // Sync team driver relationship in drivers table
      if (role === 'TEAM') {
        const primaryDriverId = vehicle.current_driver_id;
        if (driver_id && primaryDriverId) {
          // Setting a team driver — sync drivers.team_driver_id bidirectionally
          // Clear old team links
          await trx('drivers').where({ team_driver_id: driver_id }).update({ team_driver_id: null, updated_at: db.fn.now() });
          await trx('drivers').where({ team_driver_id: primaryDriverId }).update({ team_driver_id: null, updated_at: db.fn.now() });
          // Set new bidirectional link
          await trx('drivers').where({ id: primaryDriverId }).update({ team_driver_id: driver_id, updated_at: db.fn.now() });
          await trx('drivers').where({ id: driver_id }).update({ team_driver_id: primaryDriverId, updated_at: db.fn.now() });
        } else if (!driver_id && primaryDriverId) {
          // Removing team driver — clear the link
          const oldTeamId = vehicle.current_driver2_id;
          if (oldTeamId) {
            await trx('drivers').where({ id: primaryDriverId, team_driver_id: oldTeamId }).update({ team_driver_id: null, updated_at: db.fn.now() });
            await trx('drivers').where({ id: oldTeamId, team_driver_id: primaryDriverId }).update({ team_driver_id: null, updated_at: db.fn.now() });
          }
        }
      } else if (role === 'PRIMARY') {
        const teamDriverId = vehicle.current_driver2_id;
        if (driver_id && teamDriverId) {
          // New primary driver gets linked to existing team driver
          // Clear old links first
          const oldPrimaryId = vehicle.current_driver_id;
          if (oldPrimaryId) {
            await trx('drivers').where({ id: oldPrimaryId, team_driver_id: teamDriverId }).update({ team_driver_id: null, updated_at: db.fn.now() });
            await trx('drivers').where({ id: teamDriverId, team_driver_id: oldPrimaryId }).update({ team_driver_id: null, updated_at: db.fn.now() });
          }
          // Set new bidirectional link
          await trx('drivers').where({ id: driver_id }).update({ team_driver_id: teamDriverId, updated_at: db.fn.now() });
          await trx('drivers').where({ id: teamDriverId }).update({ team_driver_id: driver_id, updated_at: db.fn.now() });
        } else if (!driver_id && teamDriverId) {
          // Removing primary driver — clear team link
          const oldPrimaryId = vehicle.current_driver_id;
          if (oldPrimaryId) {
            await trx('drivers').where({ id: oldPrimaryId, team_driver_id: teamDriverId }).update({ team_driver_id: null, updated_at: db.fn.now() });
            await trx('drivers').where({ id: teamDriverId, team_driver_id: oldPrimaryId }).update({ team_driver_id: null, updated_at: db.fn.now() });
          }
        }
      }
    });

    const updated = await db('vehicles')
      .leftJoin('drivers as d1', 'vehicles.current_driver_id', 'd1.id')
      .leftJoin('drivers as d2', 'vehicles.current_driver2_id', 'd2.id')
      .select('vehicles.*', 'd1.full_name as driver_name', 'd2.full_name as driver2_name')
      .where('vehicles.id', req.params.id)
      .first();

    if (warnings.length > 0) {
      updated.warnings = warnings;
    }
    res.json(updated);
  }));

  return router;
}
