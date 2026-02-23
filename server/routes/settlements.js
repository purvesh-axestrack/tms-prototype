import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateSettlement } from '../lib/settlementCalculator.js';
import { exportSettlementCSV } from '../lib/csvExporter.js';

export default function settlementsRouter(db) {
  const router = Router();

  async function enrichSettlement(settlement) {
    const driver = await db('drivers').where({ id: settlement.driver_id }).first();
    const lineItems = await db('settlement_line_items').where({ settlement_id: settlement.id }).orderBy('id');
    return {
      ...settlement,
      driver_name: driver?.full_name,
      driver,
      line_items: lineItems,
    };
  }

  // GET /api/settlements
  router.get('/', asyncHandler(async (req, res) => {
    const { driver_id, status } = req.query;
    let query = db('settlements');

    if (driver_id) query = query.where({ driver_id });
    if (status) query = query.where({ status });

    const settlements = await query.orderBy('id', 'desc');
    const enriched = await Promise.all(settlements.map(enrichSettlement));
    res.json(enriched);
  }));

  // Named routes MUST come before /:id to avoid shadowing

  // GET /api/settlements/deduction-types/list
  router.get('/deduction-types/list', asyncHandler(async (req, res) => {
    const types = await db('deduction_types').where({ is_active: true }).orderBy('name');
    res.json(types);
  }));

  // POST /api/settlements/deduction-types (admin only)
  router.post('/deduction-types', asyncHandler(async (req, res) => {
    const { code, name, description, default_amount, is_recurring } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const [type] = await db('deduction_types').insert({
      code: code.toUpperCase(),
      name,
      description: description || null,
      default_amount: default_amount || 0,
      is_recurring: is_recurring !== undefined ? is_recurring : false,
    }).returning('*');

    res.status(201).json(type);
  }));

  // GET /api/settlements/driver-deductions/:driverId
  router.get('/driver-deductions/:driverId', asyncHandler(async (req, res) => {
    const deductions = await db('driver_deductions')
      .join('deduction_types', 'driver_deductions.deduction_type_id', 'deduction_types.id')
      .where({ 'driver_deductions.driver_id': req.params.driverId })
      .select('driver_deductions.*', 'deduction_types.name as type_name', 'deduction_types.code')
      .orderBy('driver_deductions.id');

    res.json(deductions);
  }));

  // POST /api/settlements/driver-deductions/:driverId
  router.post('/driver-deductions/:driverId', asyncHandler(async (req, res) => {
    const { deduction_type_id, amount, notes, start_date, end_date } = req.body;

    if (!deduction_type_id || !amount) {
      return res.status(400).json({ error: 'deduction_type_id and amount are required' });
    }

    const [deduction] = await db('driver_deductions').insert({
      driver_id: req.params.driverId,
      deduction_type_id,
      amount,
      notes,
      start_date: start_date || null,
      end_date: end_date || null,
      is_active: true,
    }).returning('*');

    res.status(201).json(deduction);
  }));

  // DELETE /api/settlements/driver-deductions/:driverId/:id
  router.delete('/driver-deductions/:driverId/:id', asyncHandler(async (req, res) => {
    await db('driver_deductions')
      .where({ id: req.params.id, driver_id: req.params.driverId })
      .del();

    res.json({ deleted: true });
  }));

  // POST /api/settlements/generate
  router.post('/generate', asyncHandler(async (req, res) => {
    const { period_start, period_end, driver_ids } = req.body;

    if (!period_start || !period_end) {
      return res.status(400).json({ error: 'period_start and period_end are required' });
    }

    let drivers;
    if (driver_ids && driver_ids.length > 0) {
      drivers = await db('drivers').whereIn('id', driver_ids);
    } else {
      drivers = await db('drivers');
    }

    const results = [];
    const errors = [];

    for (const driver of drivers) {
      try {
        const settlement = await generateSettlement(db, driver.id, period_start, period_end, req.user.id);
        if (settlement) {
          results.push(settlement);
        }
      } catch (err) {
        errors.push({ driver_id: driver.id, driver_name: driver.full_name, error: err.message });
      }
    }

    res.json({
      generated: results.length,
      settlements: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  }));

  // GET /api/settlements/:id (parameterized - MUST be after named routes)
  router.get('/:id', asyncHandler(async (req, res) => {
    const settlement = await db('settlements').where({ id: req.params.id }).first();
    if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

    const enriched = await enrichSettlement(settlement);
    res.json(enriched);
  }));

  // POST /api/settlements/:id/approve
  router.post('/:id/approve', asyncHandler(async (req, res) => {
    const settlement = await db('settlements').where({ id: req.params.id }).first();
    if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

    if (settlement.status !== 'DRAFT') {
      return res.status(400).json({ error: `Cannot approve settlement in ${settlement.status} status` });
    }

    await db('settlements').where({ id: settlement.id }).update({
      status: 'APPROVED',
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
    });

    const updated = await db('settlements').where({ id: settlement.id }).first();
    const enriched = await enrichSettlement(updated);
    res.json(enriched);
  }));

  // POST /api/settlements/:id/pay
  router.post('/:id/pay', asyncHandler(async (req, res) => {
    const settlement = await db('settlements').where({ id: req.params.id }).first();
    if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

    if (settlement.status !== 'APPROVED') {
      return res.status(400).json({ error: `Cannot pay settlement in ${settlement.status} status` });
    }

    await db('settlements').where({ id: settlement.id }).update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
    });

    const updated = await db('settlements').where({ id: settlement.id }).first();
    const enriched = await enrichSettlement(updated);
    res.json(enriched);
  }));

  // GET /api/settlements/:id/export
  router.get('/:id/export', asyncHandler(async (req, res) => {
    const settlement = await db('settlements').where({ id: req.params.id }).first();
    if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

    const lineItems = await db('settlement_line_items').where({ settlement_id: settlement.id }).orderBy('id');
    const csv = exportSettlementCSV(settlement, lineItems);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${settlement.settlement_number}.csv"`);
    res.send(csv);
  }));

  return router;
}
