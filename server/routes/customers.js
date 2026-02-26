import { Router } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function customersRouter(db) {
  const router = Router();

  // GET /api/customers
  router.get('/', asyncHandler(async (req, res) => {
    const { include_inactive } = req.query;
    const query = db('customers').orderBy('company_name');
    if (!include_inactive) query.where({ is_active: true });
    const customers = await query;
    res.json(customers);
  }));

  // GET /api/customers/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const customer = await db('customers').where({ id: req.params.id }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const loads = await db('loads').where({ customer_id: req.params.id }).orderBy('created_at', 'desc');
    const invoices = await db('invoices').where({ customer_id: req.params.id }).orderBy('created_at', 'desc');

    const totalRevenue = loads.reduce((sum, l) => sum + parseFloat(l.total_amount || l.rate_amount || 0), 0);
    const outstandingBalance = invoices
      .filter(i => ['SENT', 'OVERDUE'].includes(i.status))
      .reduce((sum, i) => sum + parseFloat(i.balance_due || 0), 0);

    res.json({
      ...customer,
      stats: {
        total_loads: loads.length,
        active_loads: loads.filter(l => !['DELIVERED', 'CANCELLED'].includes(l.status)).length,
        total_revenue: totalRevenue,
        outstanding_balance: outstandingBalance,
        total_invoices: invoices.length,
      },
      recent_loads: loads.slice(0, 10),
      recent_invoices: invoices.slice(0, 10),
    });
  }));

  // POST /api/customers
  router.post('/', asyncHandler(async (req, res) => {
    const { company_name, mc_number, dot_number, billing_email, payment_terms, customer_type, phone, contact_name, address, city, state, zip, credit_limit } = req.body;
    if (!company_name) return res.status(400).json({ error: 'Company name is required' });

    const id = `c_${crypto.randomUUID().slice(0, 8)}`;
    await db('customers').insert({
      id,
      company_name,
      customer_type: customer_type || null,
      mc_number: mc_number || null,
      dot_number: dot_number || null,
      billing_email: billing_email || null,
      payment_terms: payment_terms || 30,
      phone: phone || null,
      contact_name: contact_name || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      credit_limit: credit_limit || null,
      is_active: true,
    });

    const customer = await db('customers').where({ id }).first();
    res.status(201).json(customer);
  }));

  // PATCH /api/customers/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const customer = await db('customers').where({ id: req.params.id }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const allowed = ['company_name', 'customer_type', 'mc_number', 'dot_number', 'billing_email', 'payment_terms', 'phone', 'contact_name', 'address', 'city', 'state', 'zip', 'credit_limit', 'is_active'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    updates.updated_at = db.fn.now();
    await db('customers').where({ id: req.params.id }).update(updates);
    const updated = await db('customers').where({ id: req.params.id }).first();
    res.json(updated);
  }));

  // DELETE /api/customers/:id (soft delete)
  router.delete('/:id', asyncHandler(async (req, res) => {
    const customer = await db('customers').where({ id: req.params.id }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const activeLoads = await db('loads')
      .where({ customer_id: req.params.id })
      .whereNotIn('status', ['DELIVERED', 'CANCELLED'])
      .count('id as count')
      .first();

    if (parseInt(activeLoads.count) > 0) {
      return res.status(400).json({ error: `Cannot deactivate customer with ${activeLoads.count} active loads` });
    }

    await db('customers').where({ id: req.params.id }).update({ is_active: false, updated_at: db.fn.now() });
    res.json({ message: 'Customer deactivated' });
  }));

  return router;
}
