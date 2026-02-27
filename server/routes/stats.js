import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function statsRouter(db) {
  const router = Router();

  // GET /api/stats
  router.get('/', asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // All aggregate queries in parallel — no full table scans
    const [
      totalLoads, activeLoads, availableDrivers,
      todayDeliveries, pendingImports, draftLoads,
      statusCounts, outstanding, overdueInvoices, pendingSettlements,
    ] = await Promise.all([
      db('loads').count('id as count').first(),
      db('loads').whereIn('status', ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT']).count('id as count').first(),
      db('drivers').where({ status: 'AVAILABLE' }).count('id as count').first(),
      db('loads').where({ status: 'COMPLETED' }).whereNotNull('delivered_at')
        .where('delivered_at', '>=', today.toISOString()).where('delivered_at', '<', tomorrow.toISOString())
        .count('id as count').first(),
      db('email_imports').whereIn('processing_status', ['PENDING', 'PROCESSING', 'EXTRACTED', 'DRAFT_CREATED'])
        .count('id as count').first(),
      db('loads').where({ status: 'OPEN' }).count('id as count').first(),
      db('loads').select('status').count('id as count').groupBy('status'),
      db('invoices').whereIn('status', ['SENT', 'OVERDUE']).sum('balance_due as total').first(),
      db('invoices').where({ status: 'OVERDUE' }).count('id as count').first(),
      db.schema.hasTable('settlements').then(exists =>
        exists ? db('settlements').where({ status: 'DRAFT' }).count('id as count').first() : { count: 0 }
      ),
    ]);

    const loadsByStatus = {};
    statusCounts.forEach(row => { loadsByStatus[row.status] = parseInt(row.count); });

    const stats = {
      total_loads: parseInt(totalLoads?.count || 0),
      active_loads: parseInt(activeLoads?.count || 0),
      available_drivers: parseInt(availableDrivers?.count || 0),
      today_deliveries: parseInt(todayDeliveries?.count || 0),
      pending_imports: parseInt(pendingImports?.count || 0),
      draft_loads: parseInt(draftLoads?.count || 0),
      loads_by_status: loadsByStatus,
      total_outstanding: parseFloat(outstanding?.total || 0),
      overdue_count: parseInt(overdueInvoices?.count || 0),
      pending_settlements: parseInt(pendingSettlements?.count || 0),
    };

    res.json(stats);
  }));

  return router;
}
