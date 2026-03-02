import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { calculateLoadTotal } from '../lib/rateCalculator.js';

export default function accessorialsRouter(db) {
  const router = Router();

  async function recalculateLoadTotal(trx, loadId) {
    const load = await trx('loads').where({ id: loadId }).first();
    if (!load) return;

    const accessorials = await trx('load_accessorials').where({ load_id: loadId });
    const accessorialsSum = accessorials.reduce((sum, a) => sum + parseFloat(a.total), 0);
    const total = calculateLoadTotal(
      parseFloat(load.rate_amount),
      parseFloat(load.fuel_surcharge_amount || 0),
      accessorialsSum
    );

    await trx('loads').where({ id: loadId }).update({ total_amount: total });
  }

  // GET /api/accessorial-types
  router.get('/types', asyncHandler(async (req, res) => {
    const types = await db('accessorial_types').where({ is_active: true }).orderBy('name');
    res.json(types);
  }));

  // POST /api/accessorial-types (admin only)
  router.post('/types', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    const { code, name, description, default_amount, unit } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const [type] = await db('accessorial_types').insert({
      code: code.toUpperCase(),
      name,
      description,
      default_amount: default_amount || 0,
      unit: unit || 'FLAT',
    }).returning('*');

    res.status(201).json(type);
  }));

  // GET /api/accessorials/load/:loadId
  router.get('/load/:loadId', asyncHandler(async (req, res) => {
    const accessorials = await db('load_accessorials')
      .join('accessorial_types', 'load_accessorials.accessorial_type_id', 'accessorial_types.id')
      .where({ 'load_accessorials.load_id': req.params.loadId })
      .select(
        'load_accessorials.*',
        'accessorial_types.code',
        'accessorial_types.name as type_name',
        'accessorial_types.unit'
      )
      .orderBy('load_accessorials.id');

    res.json(accessorials);
  }));

  // POST /api/accessorials/load/:loadId
  router.post('/load/:loadId', asyncHandler(async (req, res) => {
    const { accessorial_type_id, description, quantity = 1, rate } = req.body;

    if (!accessorial_type_id || rate === undefined) {
      return res.status(400).json({ error: 'accessorial_type_id and rate are required' });
    }

    const loadId = parseInt(req.params.loadId);

    const accessorial = await db.transaction(async (trx) => {
      const load = await trx('loads').where({ id: loadId }).first();
      if (!load) {
        throw Object.assign(new Error('Load not found'), { status: 404 });
      }

      const total = Math.round(quantity * rate * 100) / 100;

      const [acc] = await trx('load_accessorials').insert({
        load_id: loadId,
        accessorial_type_id,
        description,
        quantity,
        rate,
        total,
      }).returning('*');

      await recalculateLoadTotal(trx, loadId);
      return acc;
    });

    res.status(201).json(accessorial);
  }));

  // DELETE /api/accessorials/load/:loadId/:id
  router.delete('/load/:loadId/:id', asyncHandler(async (req, res) => {
    const loadId = parseInt(req.params.loadId);

    await db.transaction(async (trx) => {
      const deleted = await trx('load_accessorials')
        .where({ id: req.params.id, load_id: loadId })
        .del();

      if (!deleted) {
        throw Object.assign(new Error('Accessorial not found'), { status: 404 });
      }

      await recalculateLoadTotal(trx, loadId);
    });

    res.json({ deleted: true });
  }));

  return router;
}
