import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';
import { checkDriverConflicts, calculateDriverStats } from '../lib/conflictDetection.js';

export default function driversRouter(db) {
  const router = Router();

  // GET /api/drivers
  router.get('/', asyncHandler(async (req, res) => {
    const { include_inactive } = req.query;
    const query = db('drivers').orderBy('full_name');
    if (include_inactive) {
      // return all
    } else {
      query.whereNot({ status: 'INACTIVE' });
    }
    const drivers = await query;

    const enriched = await Promise.all(drivers.map(async (driver) => {
      const driverLoads = await db('loads').where({ driver_id: driver.id });
      const stats = calculateDriverStats(driverLoads);
      return { ...driver, stats };
    }));

    res.json(enriched);
  }));

  // GET /api/drivers/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const driver = await db('drivers').where({ id: req.params.id }).first();
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const driverLoads = await db('loads').where({ driver_id: driver.id }).orderBy('created_at', 'desc');
    const stats = calculateDriverStats(driverLoads);

    const settlements = await db('settlements').where({ driver_id: driver.id }).orderBy('created_at', 'desc').limit(10);
    const deductions = await db('driver_deductions')
      .join('deduction_types', 'driver_deductions.deduction_type_id', 'deduction_types.id')
      .where({ 'driver_deductions.driver_id': req.params.id })
      .select('driver_deductions.*', 'deduction_types.name as type_name');

    const totalEarnings = settlements.reduce((sum, s) => sum + parseFloat(s.net_pay || 0), 0);

    res.json({
      ...driver,
      stats: {
        ...stats,
        total_earnings: totalEarnings,
        total_settlements: settlements.length,
      },
      recent_loads: driverLoads.slice(0, 10),
      recent_settlements: settlements,
      deductions,
    });
  }));

  // POST /api/drivers
  router.post('/', asyncHandler(async (req, res) => {
    const { full_name, phone, email, license_number, license_state, pay_model, pay_rate, minimum_per_mile, driver_type, tax_type, route_type, hire_date } = req.body;
    if (!full_name) return res.status(400).json({ error: 'Full name is required' });
    if (!pay_model || !['CPM', 'PERCENTAGE', 'FLAT'].includes(pay_model)) {
      return res.status(400).json({ error: 'Pay model must be CPM, PERCENTAGE, or FLAT' });
    }
    if (pay_rate === undefined || pay_rate === null) return res.status(400).json({ error: 'Pay rate is required' });

    const id = `d_${crypto.randomUUID().slice(0, 8)}`;
    await db('drivers').insert({
      id,
      full_name,
      phone: phone || null,
      email: email || null,
      license_number: license_number || null,
      license_state: license_state || null,
      status: 'AVAILABLE',
      pay_model,
      pay_rate,
      minimum_per_mile: minimum_per_mile || null,
      driver_type: driver_type || null,
      tax_type: tax_type || null,
      route_type: route_type || null,
      hire_date: hire_date || null,
    });

    const driver = await db('drivers').where({ id }).first();
    res.status(201).json(driver);
  }));

  // PATCH /api/drivers/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const driver = await db('drivers').where({ id: req.params.id }).first();
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const allowed = ['full_name', 'phone', 'email', 'license_number', 'license_state', 'status', 'pay_model', 'pay_rate', 'minimum_per_mile', 'driver_type', 'tax_type', 'route_type', 'hire_date'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.pay_model && !['CPM', 'PERCENTAGE', 'FLAT'].includes(updates.pay_model)) {
      return res.status(400).json({ error: 'Pay model must be CPM, PERCENTAGE, or FLAT' });
    }

    if (updates.status && !['AVAILABLE', 'EN_ROUTE', 'OUT_OF_SERVICE', 'INACTIVE'].includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    updates.updated_at = db.fn.now();
    await db('drivers').where({ id: req.params.id }).update(updates);
    const updated = await db('drivers').where({ id: req.params.id }).first();
    res.json(updated);
  }));

  // DELETE /api/drivers/:id (soft delete — set status to INACTIVE)
  router.delete('/:id', asyncHandler(async (req, res) => {
    const driver = await db('drivers').where({ id: req.params.id }).first();
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const activeLoads = await db('loads')
      .where({ driver_id: req.params.id })
      .whereNotIn('status', ['COMPLETED', 'INVOICED', 'CANCELLED', 'TONU'])
      .count('id as count')
      .first();

    if (parseInt(activeLoads.count) > 0) {
      return res.status(400).json({ error: `Cannot deactivate driver with ${activeLoads.count} active loads` });
    }

    await db('drivers').where({ id: req.params.id }).update({ status: 'INACTIVE', updated_at: db.fn.now() });
    res.json({ message: 'Driver deactivated' });
  }));

  // GET /api/drivers/:id/availability
  router.get('/:id/availability', asyncHandler(async (req, res) => {
    const driver = await db('drivers').where({ id: req.params.id }).first();
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const { pickup_date, delivery_date } = req.query;
    if (!pickup_date || !delivery_date) {
      return res.status(400).json({ error: 'pickup_date and delivery_date query params required' });
    }

    const driverLoads = await db('loads')
      .where({ driver_id: req.params.id })
      .whereIn('status', ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT']);

    const driverLoadsWithStops = await Promise.all(driverLoads.map(async (load) => {
      const stops = await db('stops').where({ load_id: load.id }).orderBy('sequence_order');
      return {
        ...load,
        pickup_start: stops[0]?.appointment_start,
        delivery_end: stops[stops.length - 1]?.appointment_end,
        pickup_city: stops[0]?.city,
        delivery_city: stops[stops.length - 1]?.city,
      };
    }));

    const availability = checkDriverConflicts(driverLoadsWithStops, pickup_date, delivery_date);
    res.json(availability);
  }));

  return router;
}
