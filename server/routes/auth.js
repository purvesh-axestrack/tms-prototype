import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tms-dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export default function authRouter(db) {
  const router = Router();

  // POST /api/auth/login
  router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db('users').where({ email: email.toLowerCase() }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await db('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt.toISOString(),
    });

    // Update last login
    await db('users').where({ id: user.id }).update({ last_login_at: new Date().toISOString() });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    });
  }));

  // POST /api/auth/refresh
  router.post('/refresh', asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const stored = await db('refresh_tokens').where({ token: refresh_token }).first();
    if (!stored) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (new Date(stored.expires_at) < new Date()) {
      await db('refresh_tokens').where({ id: stored.id }).del();
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const user = await db('users').where({ id: stored.user_id }).first();
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await db('refresh_tokens').where({ id: stored.id }).update({
      token: newRefreshToken,
      expires_at: expiresAt.toISOString(),
    });

    const accessToken = generateAccessToken(user);

    res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
    });
  }));

  // POST /api/auth/logout
  router.post('/logout', asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;
    if (refresh_token) {
      await db('refresh_tokens').where({ token: refresh_token }).del();
    }
    res.json({ success: true });
  }));

  // GET /api/auth/me (requires auth)
  router.get('/me', authenticate(db), asyncHandler(async (req, res) => {
    res.json({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      full_name: req.user.full_name,
    });
  }));

  return router;
}
