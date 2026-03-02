import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isValidInvoiceTransition, getAvailableInvoiceTransitions } from '../lib/invoiceStateMachine.js';
import { exportInvoiceCSV, exportAgingCSV } from '../lib/csvExporter.js';

export default function invoicesRouter(db) {
  const router = Router();

  function generateInvoiceNumber() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `INV-${date}-${seq}`;
  }

  async function enrichInvoice(invoice) {
    const customer = await db('customers').where({ id: invoice.customer_id }).first();
    const lineItems = await db('invoice_line_items').where({ invoice_id: invoice.id }).orderBy('id');
    const loads = await db('loads').where({ invoice_id: invoice.id });
    return {
      ...invoice,
      customer_name: customer?.company_name,
      customer,
      line_items: lineItems,
      loads,
      available_transitions: getAvailableInvoiceTransitions(invoice.status),
    };
  }

  // GET /api/invoices
  router.get('/', asyncHandler(async (req, res) => {
    const { status, customer_id, from_date, to_date } = req.query;
    let query = db('invoices');

    if (status) query = query.where({ status });
    if (customer_id) query = query.where({ customer_id });
    if (from_date) query = query.where('issue_date', '>=', from_date);
    if (to_date) query = query.where('issue_date', '<=', to_date);

    const invoices = await query.orderBy('id', 'desc');

    // Auto-transition SENT invoices past due_date to OVERDUE
    const today = new Date().toISOString().slice(0, 10);
    const overdueIds = invoices
      .filter(inv => inv.status === 'SENT' && inv.due_date && inv.due_date < today)
      .map(inv => inv.id);

    if (overdueIds.length > 0) {
      await db('invoices').whereIn('id', overdueIds).update({ status: 'OVERDUE' });
      // Update local objects
      for (const inv of invoices) {
        if (overdueIds.includes(inv.id)) inv.status = 'OVERDUE';
      }
    }

    // Batch enrich instead of N+1
    const invoiceIds = invoices.map(i => i.id);
    const customerIds = [...new Set(invoices.map(i => i.customer_id).filter(Boolean))];

    const [customersArr, allLineItems, allLoads] = await Promise.all([
      customerIds.length ? db('customers').whereIn('id', customerIds).select('id', 'company_name') : [],
      invoiceIds.length ? db('invoice_line_items').whereIn('invoice_id', invoiceIds).orderBy('id') : [],
      invoiceIds.length ? db('loads').whereIn('invoice_id', invoiceIds) : [],
    ]);

    const customersMap = Object.fromEntries(customersArr.map(c => [c.id, c]));
    const lineItemsByInvoice = {};
    for (const li of allLineItems) {
      if (!lineItemsByInvoice[li.invoice_id]) lineItemsByInvoice[li.invoice_id] = [];
      lineItemsByInvoice[li.invoice_id].push(li);
    }
    const loadsByInvoice = {};
    for (const l of allLoads) {
      if (!loadsByInvoice[l.invoice_id]) loadsByInvoice[l.invoice_id] = [];
      loadsByInvoice[l.invoice_id].push(l);
    }

    const enriched = invoices.map(invoice => ({
      ...invoice,
      customer_name: customersMap[invoice.customer_id]?.company_name || null,
      customer: customersMap[invoice.customer_id] || null,
      line_items: lineItemsByInvoice[invoice.id] || [],
      loads: loadsByInvoice[invoice.id] || [],
      available_transitions: getAvailableInvoiceTransitions(invoice.status),
    }));

    res.json(enriched);
  }));

  // GET /api/invoices/uninvoiced-loads
  router.get('/uninvoiced-loads', asyncHandler(async (req, res) => {
    const { customer_id } = req.query;
    let query = db('loads')
      .where({ status: 'COMPLETED' })
      .whereNull('invoice_id')
      .whereNull('parent_load_id'); // Only parent/standalone loads can be invoiced

    if (customer_id) query = query.where({ customer_id });

    const loads = await query.orderBy('delivered_at', 'desc');

    // Batch enrich
    const loadIds = loads.map(l => l.id);
    const custIds = [...new Set(loads.map(l => l.customer_id).filter(Boolean))];
    const [custsArr, allStops] = await Promise.all([
      custIds.length ? db('customers').whereIn('id', custIds).select('id', 'company_name') : [],
      loadIds.length ? db('stops').whereIn('load_id', loadIds).orderBy(['load_id', 'sequence_order']) : [],
    ]);
    const custMap = Object.fromEntries(custsArr.map(c => [c.id, c.company_name]));
    const stopsByLoad = {};
    for (const s of allStops) {
      if (!stopsByLoad[s.load_id]) stopsByLoad[s.load_id] = [];
      stopsByLoad[s.load_id].push(s);
    }
    const enriched = loads.map(load => {
      const stops = stopsByLoad[load.id] || [];
      return {
        ...load,
        customer_name: custMap[load.customer_id] || null,
        pickup_city: stops[0]?.city, pickup_state: stops[0]?.state,
        delivery_city: stops[stops.length - 1]?.city, delivery_state: stops[stops.length - 1]?.state,
      };
    });

    res.json(enriched);
  }));

  // GET /api/invoices/aging
  router.get('/aging', asyncHandler(async (req, res) => {
    const { format } = req.query;
    const invoices = await db('invoices')
      .whereIn('status', ['SENT', 'OVERDUE'])
      .where('balance_due', '>', 0);

    const now = new Date();

    // Batch customer lookup
    const agingCustIds = [...new Set(invoices.map(i => i.customer_id).filter(Boolean))];
    const agingCusts = agingCustIds.length ? await db('customers').whereIn('id', agingCustIds).select('id', 'company_name') : [];
    const agingCustMap = Object.fromEntries(agingCusts.map(c => [c.id, c.company_name]));

    const customerMap = {};

    for (const inv of invoices) {
      const customerName = agingCustMap[inv.customer_id] || inv.customer_id;

      if (!customerMap[customerName]) {
        customerMap[customerName] = { customer_name: customerName, current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0 };
      }

      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      const balance = parseFloat(inv.balance_due);

      if (daysOverdue <= 0) {
        customerMap[customerName].current = Math.round((customerMap[customerName].current + balance) * 100) / 100;
      } else if (daysOverdue <= 30) {
        customerMap[customerName].days_1_30 = Math.round((customerMap[customerName].days_1_30 + balance) * 100) / 100;
      } else if (daysOverdue <= 60) {
        customerMap[customerName].days_31_60 = Math.round((customerMap[customerName].days_31_60 + balance) * 100) / 100;
      } else if (daysOverdue <= 90) {
        customerMap[customerName].days_61_90 = Math.round((customerMap[customerName].days_61_90 + balance) * 100) / 100;
      } else {
        customerMap[customerName].days_90_plus = Math.round((customerMap[customerName].days_90_plus + balance) * 100) / 100;
      }
      customerMap[customerName].total = Math.round((customerMap[customerName].total + balance) * 100) / 100;
    }

    const agingData = Object.values(customerMap);

    if (format === 'csv') {
      const csv = exportAgingCSV(agingData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="aging-report.csv"');
      return res.send(csv);
    }

    res.json(agingData);
  }));

  // GET /api/invoices/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const invoice = await db('invoices').where({ id: req.params.id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Auto-transition if past due
    const today = new Date().toISOString().slice(0, 10);
    if (invoice.status === 'SENT' && invoice.due_date && invoice.due_date < today) {
      await db('invoices').where({ id: invoice.id }).update({ status: 'OVERDUE' });
      invoice.status = 'OVERDUE';
    }

    const enriched = await enrichInvoice(invoice);
    res.json(enriched);
  }));

  // POST /api/invoices
  router.post('/', asyncHandler(async (req, res) => {
    const { customer_id, load_ids, notes } = req.body;

    if (!customer_id || !load_ids || load_ids.length === 0) {
      return res.status(400).json({ error: 'customer_id and load_ids are required' });
    }

    const customer = await db('customers').where({ id: customer_id }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const invoice = await db.transaction(async (trx) => {
      // Lock loads with FOR UPDATE to prevent double-invoicing
      const loads = await trx('loads')
        .whereIn('id', load_ids)
        .where({ customer_id, status: 'COMPLETED' })
        .whereNull('invoice_id')
        .forUpdate();

      if (loads.length === 0) {
        throw Object.assign(new Error('No eligible loads found — they may already be invoiced'), { status: 400 });
      }

      // Reject child loads — only parent/standalone loads can be invoiced
      const childLoad = loads.find(l => l.parent_load_id != null);
      if (childLoad) {
        throw Object.assign(new Error(`Load #${childLoad.id} is a split leg and cannot be invoiced directly. Invoice the parent load instead.`), { status: 400 });
      }

      // Build line items and calculate totals
      const lineItems = [];
      let subtotal = 0;
      let fuelSurchargeTotal = 0;
      let accessorialTotal = 0;

      for (const load of loads) {
        const stops = await trx('stops').where({ load_id: load.id }).orderBy('sequence_order');
        const pickup = stops[0];
        const delivery = stops[stops.length - 1];
        const desc = `Load #${load.id} - ${load.reference_number} (${pickup?.city}, ${pickup?.state} to ${delivery?.city}, ${delivery?.state})`;

        lineItems.push({
          load_id: load.id,
          description: desc,
          quantity: 1,
          unit_price: parseFloat(load.rate_amount),
          amount: parseFloat(load.rate_amount),
          line_type: 'LOAD_CHARGE',
        });
        subtotal += parseFloat(load.rate_amount);

        // Fuel surcharge
        const fsc = parseFloat(load.fuel_surcharge_amount || 0);
        if (fsc > 0) {
          lineItems.push({
            load_id: load.id,
            description: `Fuel Surcharge - Load #${load.id}`,
            quantity: 1,
            unit_price: fsc,
            amount: fsc,
            line_type: 'FUEL_SURCHARGE',
          });
          fuelSurchargeTotal += fsc;
        }

        // Accessorials
        const accessorials = await trx('load_accessorials')
          .join('accessorial_types', 'load_accessorials.accessorial_type_id', 'accessorial_types.id')
          .where({ 'load_accessorials.load_id': load.id })
          .select('load_accessorials.*', 'accessorial_types.name as type_name');

        for (const acc of accessorials) {
          lineItems.push({
            load_id: load.id,
            description: `${acc.type_name} - Load #${load.id}`,
            quantity: parseFloat(acc.quantity),
            unit_price: parseFloat(acc.rate),
            amount: parseFloat(acc.total),
            line_type: 'ACCESSORIAL',
          });
          accessorialTotal += parseFloat(acc.total);
        }
      }

      const totalAmount = subtotal + fuelSurchargeTotal + accessorialTotal;
      const issueDate = new Date().toISOString().slice(0, 10);
      const dueDate = new Date(Date.now() + (customer.payment_terms || 30) * 86400000).toISOString().slice(0, 10);

      const [inv] = await trx('invoices').insert({
        invoice_number: generateInvoiceNumber(),
        customer_id,
        status: 'DRAFT',
        issue_date: issueDate,
        due_date: dueDate,
        subtotal,
        fuel_surcharge_total: fuelSurchargeTotal,
        accessorial_total: accessorialTotal,
        total_amount: totalAmount,
        amount_paid: 0,
        balance_due: totalAmount,
        notes: notes || null,
        created_by: req.user.id,
      }).returning('*');

      // Insert line items
      const itemRows = lineItems.map(item => ({
        ...item,
        invoice_id: inv.id,
      }));
      await trx('invoice_line_items').insert(itemRows);

      // Link loads to invoice
      await trx('loads').whereIn('id', loads.map(l => l.id)).update({ invoice_id: inv.id });

      return inv;
    });

    const enriched = await enrichInvoice(invoice);
    res.status(201).json(enriched);
  }));

  // PATCH /api/invoices/:id/status
  router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { status } = req.body;

    await db.transaction(async (trx) => {
      const invoice = await trx('invoices').where({ id: req.params.id }).forUpdate().first();
      if (!invoice) {
        throw Object.assign(new Error('Invoice not found'), { status: 404 });
      }

      if (!isValidInvoiceTransition(invoice.status, status)) {
        throw Object.assign(new Error(`Cannot transition from ${invoice.status} to ${status}`), { status: 400 });
      }

      const updates = { status };
      if (status === 'SENT' && !invoice.sent_at) {
        updates.sent_at = db.fn.now();
      }

      await trx('invoices').where({ id: invoice.id }).update(updates);
    });

    const updated = await db('invoices').where({ id: req.params.id }).first();
    const enriched = await enrichInvoice(updated);
    res.json(enriched);
  }));

  // POST /api/invoices/:id/payment
  router.post('/:id/payment', asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const updated = await db.transaction(async (trx) => {
      // Lock the invoice row to prevent concurrent payment races
      const invoice = await trx('invoices').where({ id: req.params.id }).forUpdate().first();
      if (!invoice) {
        throw Object.assign(new Error('Invoice not found'), { status: 404 });
      }

      const currentBalance = parseFloat(invoice.balance_due);
      if (parseFloat(amount) > currentBalance) {
        throw Object.assign(
          new Error(`Payment amount $${amount} exceeds balance due $${currentBalance.toFixed(2)}`),
          { status: 400 }
        );
      }

      const newAmountPaid = parseFloat(invoice.amount_paid) + parseFloat(amount);
      const newBalance = parseFloat(invoice.total_amount) - newAmountPaid;

      const updates = {
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalance),
      };

      if (newBalance <= 0) {
        updates.status = 'PAID';
        updates.paid_at = db.fn.now();
      }

      await trx('invoices').where({ id: invoice.id }).update(updates);
      return trx('invoices').where({ id: invoice.id }).first();
    });

    const enriched = await enrichInvoice(updated);
    res.json(enriched);
  }));

  // GET /api/invoices/:id/export
  router.get('/:id/export', asyncHandler(async (req, res) => {
    const invoice = await db('invoices').where({ id: req.params.id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const lineItems = await db('invoice_line_items').where({ invoice_id: invoice.id }).orderBy('id');
    const csv = exportInvoiceCSV(invoice, lineItems);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.csv"`);
    res.send(csv);
  }));

  // PATCH /api/invoices/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const allowed = ['notes', 'due_date', 'issue_date'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await db.transaction(async (trx) => {
      const invoice = await trx('invoices').where({ id: req.params.id }).forUpdate().first();
      if (!invoice) {
        throw Object.assign(new Error('Invoice not found'), { status: 404 });
      }

      if (invoice.status !== 'DRAFT') {
        throw Object.assign(new Error('Only DRAFT invoices can be edited'), { status: 400 });
      }

      await trx('invoices').where({ id: invoice.id }).update(updates);
    });

    const updated = await db('invoices').where({ id: req.params.id }).first();
    const enriched = await enrichInvoice(updated);
    res.json(enriched);
  }));

  // DELETE /api/invoices/:id — only DRAFT invoices
  router.delete('/:id', asyncHandler(async (req, res) => {
    const invoiceNumber = await db.transaction(async (trx) => {
      const invoice = await trx('invoices').where({ id: req.params.id }).forUpdate().first();
      if (!invoice) {
        throw Object.assign(new Error('Invoice not found'), { status: 404 });
      }

      if (invoice.status !== 'DRAFT') {
        throw Object.assign(new Error(`Cannot delete invoice in ${invoice.status} status. Only DRAFT invoices can be deleted.`), { status: 400 });
      }

      // Unlink loads from this invoice
      await trx('loads').where({ invoice_id: invoice.id }).update({ invoice_id: null });
      // Delete line items
      await trx('invoice_line_items').where({ invoice_id: invoice.id }).del();
      // Delete invoice
      await trx('invoices').where({ id: invoice.id }).del();

      return invoice.invoice_number;
    });

    console.log(`Invoice ${invoiceNumber} deleted`);
    res.json({ message: 'Invoice deleted' });
  }));

  return router;
}
