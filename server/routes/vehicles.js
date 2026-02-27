import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function vehiclesRouter(db) {
  const router = Router();

  // GET /api/vehicles
  router.get('/', asyncHandler(async (req, res) => {
    const { type, status, include_inactive } = req.query;
    let query = db('vehicles')
      .leftJoin('drivers as d1', 'vehicles.current_driver_id', 'd1.id')
      .leftJoin('drivers as d2', 'vehicles.current_driver2_id', 'd2.id')
      .select('vehicles.*', 'd1.full_name as driver_name', 'd2.full_name as driver2_name')
      .orderBy('vehicles.unit_number');

    if (!include_inactive) query = query.whereNot('vehicles.status', 'INACTIVE');
    if (type) query = query.where('vehicles.type', type);
    if (status) query = query.where('vehicles.status', status);

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

    res.json({ truck: truck || null, suggested_trailer });
  }));

  // GET /api/vehicles/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const vehicle = await db('vehicles')
      .leftJoin('drivers as d1', 'vehicles.current_driver_id', 'd1.id')
      .leftJoin('drivers as d2', 'vehicles.current_driver2_id', 'd2.id')
      .select('vehicles.*', 'd1.full_name as driver_name', 'd2.full_name as driver2_name')
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
    const { unit_number, type, vin, year, make, model, license_plate, license_state, notes } = req.body;
    if (!unit_number) return res.status(400).json({ error: 'Unit number is required' });
    if (!type || !['TRACTOR', 'TRAILER'].includes(type)) {
      return res.status(400).json({ error: 'Type must be TRACTOR or TRAILER' });
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
      status: 'ACTIVE',
    });

    const vehicle = await db('vehicles').where({ id }).first();
    res.status(201).json(vehicle);
  }));

  // PATCH /api/vehicles/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const vehicle = await db('vehicles').where({ id: req.params.id }).first();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const allowed = ['unit_number', 'type', 'vin', 'year', 'make', 'model', 'license_plate', 'license_state', 'status', 'current_driver_id', 'current_driver2_id', 'odometer', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.type && !['TRACTOR', 'TRAILER'].includes(updates.type)) {
      return res.status(400).json({ error: 'Type must be TRACTOR or TRAILER' });
    }
    if (updates.status && !['ACTIVE', 'IN_SHOP', 'OUT_OF_SERVICE', 'INACTIVE'].includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status' });
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
      .whereNotIn('status', ['DELIVERED', 'CANCELLED'])
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

    if (driver_id) {
      // Unassign this driver from BOTH slots on other vehicles of the same type
      await db('vehicles')
        .where({ current_driver_id: driver_id, type: vehicle.type })
        .whereNot({ id: req.params.id })
        .update({ current_driver_id: null, updated_at: db.fn.now() });
      await db('vehicles')
        .where({ current_driver2_id: driver_id, type: vehicle.type })
        .whereNot({ id: req.params.id })
        .update({ current_driver2_id: null, updated_at: db.fn.now() });
    }

    await db('vehicles').where({ id: req.params.id }).update({
      [col]: driver_id || null,
      updated_at: db.fn.now(),
    });

    const updated = await db('vehicles')
      .leftJoin('drivers as d1', 'vehicles.current_driver_id', 'd1.id')
      .leftJoin('drivers as d2', 'vehicles.current_driver2_id', 'd2.id')
      .select('vehicles.*', 'd1.full_name as driver_name', 'd2.full_name as driver2_name')
      .where('vehicles.id', req.params.id)
      .first();
    res.json(updated);
  }));

  return router;
}
