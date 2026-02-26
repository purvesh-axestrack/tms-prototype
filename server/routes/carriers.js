import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const CARRIER_STATUSES = ['PROSPECT', 'ACTIVE', 'SUSPENDED', 'INACTIVE'];
const INSURANCE_TYPES = ['AUTO_LIABILITY', 'CARGO', 'GENERAL'];

export default function carriersRouter(db) {
  const router = Router();

  // GET /api/carriers
  router.get('/', asyncHandler(async (req, res) => {
    const { status, include_inactive } = req.query;
    let query = db('carriers')
      .select('carriers.*')
      .orderBy('carriers.company_name');

    if (!include_inactive) query = query.whereNot('carriers.status', 'INACTIVE');
    if (status) query = query.where('carriers.status', status);

    const carriers = await query;

    // Attach insurance + load counts
    const carrierIds = carriers.map(c => c.id);
    if (carrierIds.length > 0) {
      const insuranceCounts = await db('carrier_insurance')
        .whereIn('carrier_id', carrierIds)
        .where('is_active', true)
        .groupBy('carrier_id')
        .select('carrier_id')
        .count('id as insurance_count');

      const loadCounts = await db('loads')
        .whereIn('carrier_id', carrierIds)
        .groupBy('carrier_id')
        .select('carrier_id')
        .count('id as load_count');

      const insMap = Object.fromEntries(insuranceCounts.map(r => [r.carrier_id, parseInt(r.insurance_count)]));
      const loadMap = Object.fromEntries(loadCounts.map(r => [r.carrier_id, parseInt(r.load_count)]));

      for (const c of carriers) {
        c.insurance_count = insMap[c.id] || 0;
        c.load_count = loadMap[c.id] || 0;
      }
    }

    res.json(carriers);
  }));

  // GET /api/carriers/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const carrier = await db('carriers')
      .where('carriers.id', req.params.id)
      .first();
    if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

    // Get insurance policies
    const insurance = await db('carrier_insurance')
      .where('carrier_id', req.params.id)
      .orderBy('expiration_date', 'desc');

    // Get brokered loads
    const loads = await db('loads')
      .where('carrier_id', req.params.id)
      .orderBy('created_at', 'desc')
      .limit(20);

    res.json({ ...carrier, insurance, recent_loads: loads });
  }));

  // POST /api/carriers
  router.post('/', asyncHandler(async (req, res) => {
    const { company_name, mc_number, dot_number, scac_code, contact_name, contact_email, contact_phone, address, city, state, zip, status, notes } = req.body;

    if (!company_name) return res.status(400).json({ error: 'Company name is required' });

    const initialStatus = status || 'PROSPECT';
    if (!CARRIER_STATUSES.includes(initialStatus)) {
      return res.status(400).json({ error: `Status must be one of: ${CARRIER_STATUSES.join(', ')}` });
    }

    const [carrier] = await db('carriers').insert({
      company_name,
      mc_number: mc_number || null,
      dot_number: dot_number || null,
      scac_code: scac_code || null,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      status: initialStatus,
      notes: notes || null,
    }).returning('*');

    res.status(201).json(carrier);
  }));

  // PATCH /api/carriers/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const carrier = await db('carriers').where({ id: req.params.id }).first();
    if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

    const allowed = ['company_name', 'mc_number', 'dot_number', 'scac_code', 'contact_name', 'contact_email', 'contact_phone', 'address', 'city', 'state', 'zip', 'status', 'is_active', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.status && !CARRIER_STATUSES.includes(updates.status)) {
      return res.status(400).json({ error: `Status must be one of: ${CARRIER_STATUSES.join(', ')}` });
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    updates.updated_at = db.fn.now();
    await db('carriers').where({ id: req.params.id }).update(updates);
    const updated = await db('carriers').where({ id: req.params.id }).first();
    res.json(updated);
  }));

  // DELETE /api/carriers/:id (soft delete)
  router.delete('/:id', asyncHandler(async (req, res) => {
    const carrier = await db('carriers').where({ id: req.params.id }).first();
    if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

    // Check for active brokered loads
    const activeLoads = await db('loads')
      .where('carrier_id', req.params.id)
      .whereNotIn('status', ['COMPLETED', 'CANCELLED', 'INVOICED'])
      .count('id as count')
      .first();

    if (parseInt(activeLoads.count) > 0) {
      return res.status(400).json({ error: `Cannot deactivate carrier with ${activeLoads.count} active brokered loads` });
    }

    await db('carriers').where({ id: req.params.id }).update({ status: 'INACTIVE', is_active: false, updated_at: db.fn.now() });
    res.json({ message: 'Carrier deactivated' });
  }));

  // ── Insurance sub-resource ────────────────────────────────────────────

  // POST /api/carriers/:id/insurance
  router.post('/:id/insurance', asyncHandler(async (req, res) => {
    const carrier = await db('carriers').where({ id: req.params.id }).first();
    if (!carrier) return res.status(404).json({ error: 'Carrier not found' });

    const { policy_type, provider, policy_number, coverage_amount, expiration_date } = req.body;

    if (!policy_type || !INSURANCE_TYPES.includes(policy_type)) {
      return res.status(400).json({ error: `Policy type must be one of: ${INSURANCE_TYPES.join(', ')}` });
    }
    if (!provider) return res.status(400).json({ error: 'Provider is required' });

    const [policy] = await db('carrier_insurance').insert({
      carrier_id: req.params.id,
      policy_type,
      provider,
      policy_number: policy_number || null,
      coverage_amount: coverage_amount || 0,
      expiration_date: expiration_date || null,
    }).returning('*');

    res.status(201).json(policy);
  }));

  // DELETE /api/carriers/:carrierId/insurance/:insuranceId
  router.delete('/:carrierId/insurance/:insuranceId', asyncHandler(async (req, res) => {
    const policy = await db('carrier_insurance')
      .where({ id: req.params.insuranceId, carrier_id: req.params.carrierId })
      .first();
    if (!policy) return res.status(404).json({ error: 'Insurance policy not found' });

    await db('carrier_insurance').where({ id: req.params.insuranceId }).delete();
    res.json({ message: 'Insurance policy removed' });
  }));

  return router;
}
