import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function emailImportsRouter(db) {
  const router = Router();

  // GET /api/email-imports
  router.get('/', asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('email_imports');
    if (status) query = query.where({ processing_status: status });

    const total = await query.clone().count('id as count').first();
    const imports = await query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(offset);

    // Batch enrich instead of N+1
    const importIds = imports.map(i => i.id);
    const loadIds = [...new Set(imports.map(i => i.load_id).filter(Boolean))];

    const [loadsArr, allDocs] = await Promise.all([
      loadIds.length ? db('loads').whereIn('id', loadIds) : [],
      importIds.length ? db('documents').whereIn('email_import_id', importIds) : [],
    ]);

    const loadsMap = Object.fromEntries(loadsArr.map(l => [l.id, l]));
    const docsByImport = {};
    for (const doc of allDocs) {
      if (!docsByImport[doc.email_import_id]) docsByImport[doc.email_import_id] = [];
      docsByImport[doc.email_import_id].push(doc);
    }

    const enriched = imports.map(imp => ({
      ...imp,
      load: imp.load_id ? (loadsMap[imp.load_id] || null) : null,
      documents: docsByImport[imp.id] || [],
    }));

    res.json({
      data: enriched,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.count),
        pages: Math.ceil(parseInt(total.count) / parseInt(limit)),
      }
    });
  }));

  // GET /api/email-imports/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const imp = await db('email_imports').where({ id: req.params.id }).first();
    if (!imp) return res.status(404).json({ error: 'Email import not found' });

    let load = null;
    if (imp.load_id) {
      load = await db('loads').where({ id: imp.load_id }).first();
      if (load) {
        const stops = await db('stops').where({ load_id: load.id }).orderBy('sequence_order');
        const customer = load.customer_id ? await db('customers').where({ id: load.customer_id }).first() : null;
        load = { ...load, stops, customer_name: customer?.company_name };
      }
    }

    const documents = await db('documents').where({ email_import_id: imp.id });

    res.json({ ...imp, load, documents });
  }));

  // POST /api/email-imports/:id/approve
  router.post('/:id/approve', asyncHandler(async (req, res) => {
    const imp = await db('email_imports').where({ id: req.params.id }).first();
    if (!imp) return res.status(404).json({ error: 'Email import not found' });

    if (imp.processing_status !== 'DRAFT_CREATED') {
      return res.status(400).json({ error: `Cannot approve import in ${imp.processing_status} status` });
    }

    if (!imp.load_id) {
      return res.status(400).json({ error: 'No draft load linked to this import' });
    }

    // Apply any field overrides from the request body
    const updates = req.body.updates || {};
    const allowedFields = [
      'reference_number', 'customer_id', 'rate_amount', 'loaded_miles',
      'empty_miles', 'commodity', 'weight', 'equipment_type', 'special_instructions'
    ];

    const loadUpdates = { status: 'OPEN' };
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) loadUpdates[field] = updates[field];
    });

    await db.transaction(async (trx) => {
      await trx('loads').where({ id: imp.load_id }).update(loadUpdates);

      // Update stops if provided
      if (updates.stops) {
        await trx('stops').where({ load_id: imp.load_id }).del();
        const stopRows = updates.stops.map((stop, index) => ({
          id: stop.id || `s${Date.now()}-${index}`,
          load_id: imp.load_id,
          sequence_order: index + 1,
          stop_type: stop.stop_type,
          facility_name: stop.facility_name || '',
          address: stop.address || '',
          city: stop.city || '',
          state: stop.state || '',
          zip: stop.zip || '',
          appointment_start: stop.appointment_start || null,
          appointment_end: stop.appointment_end || null,
        }));
        await trx('stops').insert(stopRows);
      }

      // Update import status
      await trx('email_imports').where({ id: imp.id }).update({ processing_status: 'APPROVED' });
    });

    const updatedLoad = await db('loads').where({ id: imp.load_id }).first();
    const stops = await db('stops').where({ load_id: updatedLoad.id }).orderBy('sequence_order');

    res.json({ ...imp, processing_status: 'APPROVED', load: { ...updatedLoad, stops } });
  }));

  // POST /api/email-imports/:id/reject
  router.post('/:id/reject', asyncHandler(async (req, res) => {
    const imp = await db('email_imports').where({ id: req.params.id }).first();
    if (!imp) return res.status(404).json({ error: 'Email import not found' });

    if (!['DRAFT_CREATED', 'EXTRACTED'].includes(imp.processing_status)) {
      return res.status(400).json({ error: `Cannot reject import in ${imp.processing_status} status` });
    }

    await db.transaction(async (trx) => {
      if (imp.load_id) {
        await trx('loads').where({ id: imp.load_id }).update({ status: 'CANCELLED' });
      }
      await trx('email_imports').where({ id: imp.id }).update({ processing_status: 'REJECTED' });
    });

    res.json({ ...imp, processing_status: 'REJECTED' });
  }));

  // POST /api/email-imports/:id/retry
  router.post('/:id/retry', asyncHandler(async (req, res) => {
    const imp = await db('email_imports').where({ id: req.params.id }).first();
    if (!imp) return res.status(404).json({ error: 'Email import not found' });

    if (!['FAILED', 'SKIPPED'].includes(imp.processing_status)) {
      return res.status(400).json({ error: `Cannot retry import in ${imp.processing_status} status` });
    }

    // Re-run extraction
    const { processEmailImport } = await import('../services/geminiExtractor.js');
    const documents = await db('documents').where({ email_import_id: imp.id });

    if (documents.length === 0) {
      return res.status(400).json({ error: 'No documents found for this import' });
    }

    await db('email_imports').where({ id: imp.id }).update({
      processing_status: 'PROCESSING',
      error_message: null,
    });

    try {
      const result = await processEmailImport(db, imp.id, documents[0].storage_path, req.user.id);
      res.json(result);
    } catch (error) {
      await db('email_imports').where({ id: imp.id }).update({
        processing_status: 'FAILED',
        error_message: error.message,
      });
      res.status(500).json({ error: error.message });
    }
  }));

  return router;
}
