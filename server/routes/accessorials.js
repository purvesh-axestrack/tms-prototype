import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { calculateLoadTotal } from '../lib/rateCalculator.js';

export default function accessorialsRouter(db) {
  const router = Router();

  async function recalculateLoadTotal(loadId) {
    const load = await db('loads').where({ id: loadId }).first();
    if (!load) return;

    const accessorials = await db('load_accessorials').where({ load_id: loadId });
    const accessorialsSum = accessorials.reduce((sum, a) => sum + parseFloat(a.total), 0);
    const total = calculateLoadTotal(
      parseFloat(load.rate_amount),
      parseFloat(load.fuel_surcharge_amount || 0),
      accessorialsSum
    );

    await db('loads').where({ id: loadId }).update({ total_amount: total });
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

    const load = await db('loads').where({ id: req.params.loadId }).first();
    if (!load) return res.status(404).json({ error: 'Load not found' });

    const total = Math.round(quantity * rate * 100) / 100;

    const [accessorial] = await db('load_accessorials').insert({
      load_id: parseInt(req.params.loadId),
      accessorial_type_id,
      description,
      quantity,
      rate,
      total,
    }).returning('*');

    await recalculateLoadTotal(parseInt(req.params.loadId));

    res.status(201).json(accessorial);
  }));

  // DELETE /api/accessorials/load/:loadId/:id
  router.delete('/load/:loadId/:id', asyncHandler(async (req, res) => {
    const deleted = await db('load_accessorials')
      .where({ id: req.params.id, load_id: req.params.loadId })
      .del();

    if (!deleted) return res.status(404).json({ error: 'Accessorial not found' });

    await recalculateLoadTotal(parseInt(req.params.loadId));

    res.json({ deleted: true });
  }));

  return router;
}
