import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function locationsRouter(db) {
  const router = Router();

  // GET /api/locations — list all active locations, with optional search
  router.get('/', asyncHandler(async (req, res) => {
    const { q, include_inactive } = req.query;
    let query = db('locations');

    if (!include_inactive) {
      query = query.where('is_active', true);
    }

    if (q) {
      const term = `%${q}%`;
      query = query.where(function () {
        this.whereILike('facility_name', term)
          .orWhereILike('city', term)
          .orWhereILike('address', term);
      });
    }

    const locations = await query.orderBy('facility_name').limit(100);
    res.json(locations);
  }));

  // GET /api/locations/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const location = await db('locations').where({ id: req.params.id }).first();
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  }));

  // POST /api/locations
  router.post('/', asyncHandler(async (req, res) => {
    const { facility_name, address, city, state, zip, lat, lng, contact_name, contact_phone, notes } = req.body;

    if (!facility_name || !city || !state) {
      return res.status(400).json({ error: 'facility_name, city, and state are required' });
    }

    const [location] = await db('locations').insert({
      facility_name,
      address: address || null,
      city,
      state,
      zip: zip || null,
      lat: lat || null,
      lng: lng || null,
      contact_name: contact_name || null,
      contact_phone: contact_phone || null,
      notes: notes || null,
    }).returning('*');

    res.status(201).json(location);
  }));

  // PATCH /api/locations/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const location = await db('locations').where({ id: req.params.id }).first();
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const allowed = ['facility_name', 'address', 'city', 'state', 'zip', 'lat', 'lng', 'contact_name', 'contact_phone', 'notes', 'is_active'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updated_at = db.fn.now();
    await db('locations').where({ id: req.params.id }).update(updates);
    const updated = await db('locations').where({ id: req.params.id }).first();
    res.json(updated);
  }));

  // DELETE /api/locations/:id — soft delete
  router.delete('/:id', asyncHandler(async (req, res) => {
    const location = await db('locations').where({ id: req.params.id }).first();
    if (!location) return res.status(404).json({ error: 'Location not found' });

    await db('locations').where({ id: req.params.id }).update({ is_active: false, updated_at: db.fn.now() });
    res.json({ message: 'Location deactivated' });
  }));

  return router;
}
