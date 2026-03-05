import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';
import { checkDriverConflicts, calculateDriverStats } from '../lib/conflictDetection.js';
import { pickAllowedFields } from '../lib/helpers.js';
import { TERMINAL_STATUSES, PAY_MODELS, DRIVER_STATUSES, ACTIVE_LOAD_STATUSES, COMPLETED_LOAD_STATUSES } from '../lib/constants.js';

export default function driversRouter(db) {
  const router = Router();

  // GET /api/drivers
  router.get('/', asyncHandler(async (req, res) => {
    const { include_inactive, carrier_id } = req.query;
    const query = db('drivers')
      .leftJoin('carriers as c', 'drivers.carrier_id', 'c.id')
      .leftJoin('drivers as td', 'drivers.team_driver_id', 'td.id')
      .select('drivers.*', 'c.company_name as carrier_name', 'td.full_name as team_driver_name')
      .orderBy('drivers.full_name');
    if (include_inactive) {
      // return all
    } else {
      query.whereNot('drivers.status', 'INACTIVE');
    }
    if (carrier_id) query.where('drivers.carrier_id', carrier_id);
    const drivers = await query;

    // Batch driver stats — single aggregate query instead of N+1
    const driverIds = drivers.map(d => d.id);
    const statsRows = driverIds.length > 0 ? await db('loads')
      .whereIn('driver_id', driverIds)
      .select('driver_id')
      .select(db.raw(`COUNT(*) FILTER (WHERE status IN (${ACTIVE_LOAD_STATUSES.map(s => `'${s}'`).join(',')})) as active_loads`))
      .select(db.raw(`COUNT(*) FILTER (WHERE status IN (${COMPLETED_LOAD_STATUSES.map(s => `'${s}'`).join(',')})) as completed_loads`))
      .select(db.raw(`COALESCE(SUM(loaded_miles) FILTER (WHERE status IN (${COMPLETED_LOAD_STATUSES.map(s => `'${s}'`).join(',')})), 0) as total_miles`))
      .groupBy('driver_id') : [];

    const statsMap = Object.fromEntries(statsRows.map(s => [s.driver_id, {
      active_loads: parseInt(s.active_loads),
      completed_loads: parseInt(s.completed_loads),
      total_miles: parseInt(s.total_miles),
    }]));

    const enriched = drivers.map(driver => ({
      ...driver,
      stats: statsMap[driver.id] || { active_loads: 0, completed_loads: 0, total_miles: 0 },
    }));

    res.json(enriched);
  }));

  // GET /api/drivers/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const driver = await db('drivers')
      .leftJoin('carriers as c', 'drivers.carrier_id', 'c.id')
      .leftJoin('drivers as td', 'drivers.team_driver_id', 'td.id')
      .select('drivers.*', 'c.company_name as carrier_name', 'td.full_name as team_driver_name')
      .where('drivers.id', req.params.id)
      .first();
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const driverLoads = await db('loads').where({ driver_id: driver.id }).orderBy('created_at', 'desc');
    const stats = calculateDriverStats(driverLoads);

    const settlements = await db('settlements').where({ driver_id: driver.id }).orderBy('created_at', 'desc').limit(10);
    const deductions = await db('driver_deductions')
      .join('deduction_types', 'driver_deductions.deduction_type_id', 'deduction_types.id')
      .where({ 'driver_deductions.driver_id': req.params.id })
      .select('driver_deductions.*', 'deduction_types.name as type_name');

    const totalEarnings = Math.round(settlements.reduce((sum, s) => sum + parseFloat(s.net_pay ?? 0), 0) * 100) / 100;

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
    const { full_name, phone, email, license_number, license_state, pay_model, minimum_per_mile, driver_type, tax_type, route_type, hire_date, carrier_id, team_driver_id } = req.body;
    const pay_rate = parseFloat(req.body.pay_rate);
    if (!full_name) return res.status(400).json({ error: 'Full name is required' });
    if (!pay_model || !PAY_MODELS.includes(pay_model)) {
      return res.status(400).json({ error: `Pay model must be one of: ${PAY_MODELS.join(', ')}` });
    }
    if (isNaN(pay_rate) || pay_rate < 0) return res.status(400).json({ error: 'Pay rate must be a valid non-negative number' });

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
      carrier_id: carrier_id || null,
      team_driver_id: team_driver_id || null,
    });

    const driver = await db('drivers').where({ id }).first();
    res.status(201).json(driver);
  }));

  // PATCH /api/drivers/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const driver = await db('drivers').where({ id: req.params.id }).first();
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const updates = pickAllowedFields(req.body, ['full_name', 'phone', 'email', 'license_number', 'license_state', 'status', 'pay_model', 'pay_rate', 'minimum_per_mile', 'driver_type', 'tax_type', 'route_type', 'hire_date', 'carrier_id', 'team_driver_id']);

    if (updates.pay_model && !PAY_MODELS.includes(updates.pay_model)) {
      return res.status(400).json({ error: `Pay model must be one of: ${PAY_MODELS.join(', ')}` });
    }

    if (updates.status && !DRIVER_STATUSES.includes(updates.status)) {
      return res.status(400).json({ error: `Status must be one of: ${DRIVER_STATUSES.join(', ')}` });
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    updates.updated_at = db.fn.now();

    await db.transaction(async (trx) => {
      // Bidirectional team driver sync
      if ('team_driver_id' in updates) {
        const newTeamId = updates.team_driver_id || null;
        const oldTeamId = driver.team_driver_id || null;

        // Clear old partner's back-link
        if (oldTeamId && oldTeamId !== newTeamId) {
          await trx('drivers').where({ id: oldTeamId }).update({ team_driver_id: null, updated_at: db.fn.now() });
        }
        // Set new partner's back-link
        if (newTeamId) {
          // Clear any existing team link the new partner had
          const newPartner = await trx('drivers').where({ id: newTeamId }).first();
          if (newPartner?.team_driver_id && newPartner.team_driver_id !== req.params.id) {
            await trx('drivers').where({ id: newPartner.team_driver_id }).update({ team_driver_id: null, updated_at: db.fn.now() });
          }
          await trx('drivers').where({ id: newTeamId }).update({ team_driver_id: req.params.id, updated_at: db.fn.now() });
        }

        // Sync to vehicles — update current_driver2_id on shared vehicle
        const driverVehicle = await trx('vehicles')
          .where({ current_driver_id: req.params.id })
          .first();
        if (driverVehicle) {
          // This driver is primary on a vehicle — update its team slot
          await trx('vehicles').where({ id: driverVehicle.id }).update({
            current_driver2_id: newTeamId,
            updated_at: db.fn.now(),
          });
        } else if (newTeamId) {
          // Check if this driver is team on a vehicle — update that vehicle's team slot too
          const teamVehicle = await trx('vehicles')
            .where({ current_driver_id: newTeamId })
            .first();
          if (teamVehicle) {
            await trx('vehicles').where({ id: teamVehicle.id }).update({
              current_driver2_id: req.params.id,
              updated_at: db.fn.now(),
            });
          }
        }
      }

      await trx('drivers').where({ id: req.params.id }).update(updates);
    });

    const updated = await db('drivers').where({ id: req.params.id }).first();
    res.json(updated);
  }));

  // DELETE /api/drivers/:id (soft delete — set status to INACTIVE)
  router.delete('/:id', asyncHandler(async (req, res) => {
    const driver = await db('drivers').where({ id: req.params.id }).first();
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const activeLoads = await db('loads')
      .where({ driver_id: req.params.id })
      .whereNotIn('status', TERMINAL_STATUSES)
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
      .whereIn('status', ACTIVE_LOAD_STATUSES);

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
