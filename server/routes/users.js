import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';

export default function usersRouter(db) {
  const router = Router();

  // All user management routes require ADMIN role
  router.use(requireRole('ADMIN'));

  // GET /api/users
  router.get('/', asyncHandler(async (req, res) => {
    const users = await db('users')
      .select('id', 'email', 'role', 'full_name', 'is_active', 'last_login_at', 'created_at')
      .orderBy('full_name');
    res.json(users);
  }));

  // GET /api/users/:id
  router.get('/:id', asyncHandler(async (req, res) => {
    const user = await db('users')
      .select('id', 'email', 'role', 'full_name', 'is_active', 'last_login_at', 'created_at')
      .where({ id: req.params.id })
      .first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  }));

  // POST /api/users
  router.post('/', asyncHandler(async (req, res) => {
    const { email, full_name, role, password } = req.body;
    if (!email || !full_name || !role) {
      return res.status(400).json({ error: 'Email, full name, and role are required' });
    }
    if (!['ADMIN', 'DISPATCHER', 'ACCOUNTANT'].includes(role)) {
      return res.status(400).json({ error: 'Role must be ADMIN, DISPATCHER, or ACCOUNTANT' });
    }

    const existing = await db('users').where({ email }).first();
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const id = crypto.randomUUID().slice(0, 8);
    const passwordHash = await bcrypt.hash(password || 'changeme123', 10);

    await db('users').insert({
      id,
      email,
      full_name,
      role,
      password_hash: passwordHash,
      is_active: true,
    });

    const user = await db('users')
      .select('id', 'email', 'role', 'full_name', 'is_active', 'created_at')
      .where({ id })
      .first();
    res.status(201).json(user);
  }));

  // PATCH /api/users/:id
  router.patch('/:id', asyncHandler(async (req, res) => {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = {};

    if (req.body.full_name !== undefined) updates.full_name = req.body.full_name;
    if (req.body.email !== undefined) {
      const existing = await db('users').where({ email: req.body.email }).whereNot({ id: req.params.id }).first();
      if (existing) return res.status(400).json({ error: 'Email already in use' });
      updates.email = req.body.email;
    }
    if (req.body.role !== undefined) {
      if (!['ADMIN', 'DISPATCHER', 'ACCOUNTANT'].includes(req.body.role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = req.body.role;
    }
    if (req.body.is_active !== undefined) {
      // Prevent deactivating yourself
      if (req.params.id === req.user.id && req.body.is_active === false) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }
      updates.is_active = req.body.is_active;
    }
    if (req.body.password) {
      updates.password_hash = await bcrypt.hash(req.body.password, 10);
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    updates.updated_at = db.fn.now();
    await db('users').where({ id: req.params.id }).update(updates);

    const updated = await db('users')
      .select('id', 'email', 'role', 'full_name', 'is_active', 'last_login_at', 'created_at')
      .where({ id: req.params.id })
      .first();
    res.json(updated);
  }));

  // DELETE /api/users/:id (soft delete)
  router.delete('/:id', asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db('users').where({ id: req.params.id }).update({ is_active: false, updated_at: db.fn.now() });
    await db('refresh_tokens').where({ user_id: req.params.id }).del();
    res.json({ message: 'User deactivated' });
  }));

  // POST /api/users/:id/reset-password
  router.post('/:id/reset-password', asyncHandler(async (req, res) => {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 10);
    await db('users').where({ id: req.params.id }).update({ password_hash: hash, updated_at: db.fn.now() });

    res.json({ temp_password: tempPassword });
  }));

  return router;
}
