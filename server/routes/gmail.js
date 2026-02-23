import { Router } from 'express';
import { google } from 'googleapis';
import { asyncHandler } from '../middleware/errorHandler.js';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

// Public routes (OAuth callback must work without auth)
export function gmailPublicRouter(db) {
  const router = Router();

  // GET /api/gmail/callback - OAuth redirect (no auth required)
  router.get('/callback', asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: 'Authorization code required' });

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    // Use userId from state param (set during auth-url generation), or fail gracefully
    const userId = state || null;
    if (!userId) {
      return res.status(400).json({ error: 'Missing user context. Please re-authenticate.' });
    }

    const existing = await db('gmail_settings').where({ user_id: userId }).first();

    const settingsData = {
      user_id: userId,
      email_address: profile.data.emailAddress,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || existing?.refresh_token,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      history_id: profile.data.historyId,
      is_active: true,
    };

    if (existing) {
      await db('gmail_settings').where({ id: existing.id }).update(settingsData);
    } else {
      await db('gmail_settings').insert(settingsData);
    }

    res.redirect('http://localhost:5173/settings?gmail=connected');
  }));

  return router;
}

// Protected routes (require auth)
export default function gmailRouter(db) {
  const router = Router();

  // GET /api/gmail/auth-url
  router.get('/auth-url', asyncHandler(async (req, res) => {
    const oauth2Client = getOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      state: req.user.id, // Pass user ID through OAuth flow
    });
    res.json({ url });
  }));

  // GET /api/gmail/status
  router.get('/status', asyncHandler(async (req, res) => {
    const settings = await db('gmail_settings').where({ user_id: req.user.id, is_active: true }).first();

    if (!settings) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      email_address: settings.email_address,
      is_active: settings.is_active,
      last_sync_at: settings.last_sync_at,
      filter_senders: settings.filter_senders || [],
    });
  }));

  // POST /api/gmail/disconnect
  router.post('/disconnect', asyncHandler(async (req, res) => {
    const settings = await db('gmail_settings').where({ user_id: req.user.id, is_active: true }).first();

    if (settings) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ access_token: settings.access_token });
        await oauth2Client.revokeToken(settings.access_token);
      } catch (e) {
        console.warn('Token revocation failed (may already be revoked):', e.message);
      }
      await db('gmail_settings').where({ id: settings.id }).update({ is_active: false });
    }

    res.json({ disconnected: true });
  }));

  // POST /api/gmail/sync
  router.post('/sync', asyncHandler(async (req, res) => {
    const { pollOnce } = await import('../services/emailPoller.js');
    const result = await pollOnce(db, req.user.id);
    res.json(result);
  }));

  // POST /api/gmail/filter-senders
  router.post('/filter-senders', asyncHandler(async (req, res) => {
    const { senders } = req.body;
    if (!Array.isArray(senders)) {
      return res.status(400).json({ error: 'senders must be an array' });
    }

    await db('gmail_settings')
      .where({ user_id: req.user.id, is_active: true })
      .update({ filter_senders: senders });

    res.json({ updated: true, filter_senders: senders });
  }));

  return router;
}
