import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';

export default function samsaraRouter(db) {
  const router = Router();

  // GET /api/samsara/status
  router.get('/status', asyncHandler(async (req, res) => {
    const settings = await db('samsara_settings').first();
    if (!settings) {
      return res.json({ connected: false });
    }
    res.json({
      connected: settings.is_active,
      org_name: settings.org_name,
      org_id: settings.org_id,
      last_vehicle_sync: settings.last_vehicle_sync,
      last_location_sync: settings.last_location_sync,
    });
  }));

  // POST /api/samsara/connect
  router.post('/connect', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    const { api_key } = req.body;
    if (!api_key) return res.status(400).json({ error: 'API key is required' });

    // Validate key by calling Samsara API
    try {
      const response = await fetch('https://api.samsara.com/fleet/drivers', {
        headers: { 'Authorization': `Bearer ${api_key}`, 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return res.status(400).json({ error: 'Invalid Samsara API key' });
      }

      // Try to get org info
      const orgResponse = await fetch('https://api.samsara.com/me', {
        headers: { 'Authorization': `Bearer ${api_key}`, 'Accept': 'application/json' },
      });
      const orgData = orgResponse.ok ? await orgResponse.json() : {};

      // Upsert settings
      const existing = await db('samsara_settings').first();
      const data = {
        api_key_encrypted: api_key, // TODO: encrypt properly
        org_id: orgData.orgId || null,
        org_name: orgData.orgName || 'Connected',
        is_active: true,
        updated_at: db.fn.now(),
      };

      if (existing) {
        await db('samsara_settings').where({ id: existing.id }).update(data);
      } else {
        await db('samsara_settings').insert(data);
      }

      res.json({ connected: true, org_name: data.org_name });
    } catch (err) {
      return res.status(400).json({ error: 'Failed to connect to Samsara: ' + err.message });
    }
  }));

  // POST /api/samsara/disconnect
  router.post('/disconnect', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    await db('samsara_settings').update({
      api_key_encrypted: null,
      is_active: false,
      org_id: null,
      org_name: null,
      updated_at: db.fn.now(),
    });
    res.json({ connected: false });
  }));

  return router;
}
