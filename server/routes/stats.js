import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function statsRouter(db) {
  const router = Router();

  // GET /api/stats
  router.get('/', asyncHandler(async (req, res) => {
    const loads = await db('loads');
    const drivers = await db('drivers');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayDeliveries = await db('loads')
      .where({ status: 'COMPLETED' })
      .whereNotNull('delivered_at')
      .where('delivered_at', '>=', today.toISOString())
      .where('delivered_at', '<', tomorrow.toISOString())
      .count('id as count')
      .first();

    const pendingImports = await db('email_imports')
      .whereIn('processing_status', ['PENDING', 'PROCESSING', 'EXTRACTED', 'DRAFT_CREATED'])
      .count('id as count')
      .first();

    const draftLoads = await db('loads')
      .where({ status: 'OPEN' })
      .count('id as count')
      .first();

    const loadsByStatus = {};
    const statusCounts = await db('loads').select('status').count('id as count').groupBy('status');
    statusCounts.forEach(row => {
      loadsByStatus[row.status] = parseInt(row.count);
    });

    // Invoice stats
    const outstanding = await db('invoices')
      .whereIn('status', ['SENT', 'OVERDUE'])
      .sum('balance_due as total')
      .first();

    const overdueInvoices = await db('invoices')
      .where({ status: 'OVERDUE' })
      .count('id as count')
      .first();

    const pendingSettlements = await db.schema.hasTable('settlements').then(async (exists) => {
      if (!exists) return { count: 0 };
      return db('settlements').where({ status: 'DRAFT' }).count('id as count').first();
    });

    const stats = {
      total_loads: loads.length,
      active_loads: loads.filter(l =>
        ['SCHEDULED', 'IN_PICKUP_YARD', 'IN_TRANSIT'].includes(l.status)
      ).length,
      available_drivers: drivers.filter(d => d.status === 'AVAILABLE').length,
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
