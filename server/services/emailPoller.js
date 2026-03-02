import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

const RATE_CON_KEYWORDS = [
  'rate confirmation',
  'rate con',
  'load tender',
  'carrier confirmation',
  'load confirmation',
  'carrier rate',
  'freight confirmation',
  'dispatch confirmation',
  'load assignment',
  'carrier agreement',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

async function getAuthenticatedClient(db, userId = null) {
  const query = db('gmail_settings').where({ is_active: true });
  if (userId) query.where({ user_id: userId });
  const settings = await query.first();
  if (!settings) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: settings.access_token,
    refresh_token: settings.refresh_token,
    expiry_date: settings.token_expiry ? new Date(settings.token_expiry).getTime() : undefined,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    const updates = { access_token: tokens.access_token };
    if (tokens.refresh_token) updates.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) updates.token_expiry = new Date(tokens.expiry_date).toISOString();
    await db('gmail_settings').where({ id: settings.id }).update(updates);
  });

  return { oauth2Client, settings };
}

function matchesKeywords(text) {
  const lower = (text || '').toLowerCase();
  return RATE_CON_KEYWORDS.some(kw => lower.includes(kw));
}

async function processMessage(gmail, db, messageId, settings) {
  // Check if already processed
  const existing = await db('email_imports').where({ gmail_message_id: messageId }).first();
  if (existing) return null;

  // Fetch full message
  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const headers = msg.data.payload.headers || [];
  const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
  const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value;
  const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

  // Keyword check on subject + snippet — silently skip irrelevant emails
  if (!matchesKeywords(subject)) {
    const snippet = msg.data.snippet || '';
    if (!matchesKeywords(snippet)) {
      return { status: 'SKIPPED', reason: 'no keywords' };
    }
  }

  // Sender whitelist filter — silently skip non-whitelisted senders
  if (settings.filter_senders && settings.filter_senders.length > 0) {
    const fromLower = from.toLowerCase();
    const matchesSender = settings.filter_senders.some(s => fromLower.includes(s.toLowerCase()));
    if (!matchesSender) {
      return { status: 'SKIPPED', reason: 'sender not whitelisted' };
    }
  }

  // Create email import record
  const [emailImport] = await db('email_imports').insert({
    gmail_message_id: messageId,
    from_address: from,
    subject,
    received_at: receivedAt,
    processing_status: 'PENDING',
  }).returning('*');

  // Extract PDF attachments
  const attachments = findPdfAttachments(msg.data.payload);

  if (attachments.length === 0) {
    console.log(`[EmailPoller] No PDFs found in message ${messageId} (subject: "${subject}")`);
    console.log(`[EmailPoller] MIME structure:`, JSON.stringify(summarizeMime(msg.data.payload), null, 2));
    await db('email_imports').where({ id: emailImport.id }).update({
      processing_status: 'SKIPPED',
      error_message: 'No PDF attachments found',
    });
    return { status: 'SKIPPED', reason: 'no PDF attachments' };
  }

  // Download and save attachments
  const importDir = path.join(UPLOADS_DIR, String(emailImport.id));
  if (!fs.existsSync(importDir)) {
    fs.mkdirSync(importDir, { recursive: true });
  }

  for (const att of attachments) {
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: att.attachmentId,
    });

    const buffer = Buffer.from(attachment.data.data, 'base64');

    // Check 20MB limit
    if (buffer.length > 20 * 1024 * 1024) {
      console.warn(`Attachment ${att.filename} exceeds 20MB, skipping`);
      continue;
    }

    const filePath = path.join(importDir, att.filename);
    fs.writeFileSync(filePath, buffer);

    const storagePath = `uploads/${emailImport.id}/${att.filename}`;

    await db('documents').insert({
      email_import_id: emailImport.id,
      doc_type: 'RATE_CON',
      filename: att.filename,
      storage_path: storagePath,
      storage_type: 'LOCAL',
      file_size: buffer.length,
    });
  }

  // Trigger extraction
  await db('email_imports').where({ id: emailImport.id }).update({ processing_status: 'PROCESSING' });

  try {
    const { processEmailImport } = await import('./geminiExtractor.js');
    const firstDoc = await db('documents').where({ email_import_id: emailImport.id }).first();
    await processEmailImport(db, emailImport.id, firstDoc.storage_path, settings.user_id);
    return { status: 'PROCESSED', import_id: emailImport.id };
  } catch (error) {
    console.error(`Extraction failed for import ${emailImport.id}:`, error.message);
    await db('email_imports').where({ id: emailImport.id }).update({
      processing_status: 'FAILED',
      error_message: error.message,
    });
    return { status: 'FAILED', import_id: emailImport.id, error: error.message };
  }
}

function summarizeMime(part) {
  const info = { mimeType: part.mimeType, filename: part.filename || null, hasAttachmentId: !!part.body?.attachmentId, bodySize: part.body?.size || 0 };
  if (part.parts) info.parts = part.parts.map(summarizeMime);
  return info;
}

function findPdfAttachments(payload, results = []) {
  if (payload.filename && payload.filename.toLowerCase().endsWith('.pdf') && payload.body?.attachmentId) {
    results.push({
      filename: payload.filename,
      attachmentId: payload.body.attachmentId,
      mimeType: payload.mimeType,
    });
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      findPdfAttachments(part, results);
    }
  }

  return results;
}

export async function pollOnce(db, userId = null) {
  const auth = await getAuthenticatedClient(db, userId);
  if (!auth) return { status: 'not_connected' };

  const { oauth2Client, settings } = auth;
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    // Push keyword filtering to Gmail so we never fetch irrelevant messages
    const kwQuery = RATE_CON_KEYWORDS.map(kw => `"${kw}"`).join(' OR ');
    let query = `has:attachment filename:pdf (${kwQuery})`;

    // Use history-based incremental sync if we have a historyId
    let messageIds = [];
    let historyExpired = false;

    if (settings.history_id) {
      try {
        const history = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: settings.history_id,
          historyTypes: ['messageAdded'],
        });

        if (history.data.history) {
          for (const h of history.data.history) {
            if (h.messagesAdded) {
              for (const m of h.messagesAdded) {
                messageIds.push(m.message.id);
              }
            }
          }
        }

        // Update historyId
        if (history.data.historyId) {
          await db('gmail_settings').where({ id: settings.id }).update({ history_id: history.data.historyId });
        }
      } catch (e) {
        // historyId expired, fall back to full list
        if (e.response?.status === 404) {
          console.log('History ID expired, falling back to list query');
          historyExpired = true;
        } else {
          throw e;
        }
      }
    }

    // If no history, history expired, or no messages from history — do a list query
    if (messageIds.length === 0 && (!settings.history_id || historyExpired)) {
      const list = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 20,
      });

      messageIds = (list.data.messages || []).map(m => m.id);

      // Get current historyId for future incremental syncs
      const profile = await gmail.users.getProfile({ userId: 'me' });
      await db('gmail_settings').where({ id: settings.id }).update({
        history_id: profile.data.historyId,
      });
    }

    // Process each message
    const results = [];
    for (const msgId of messageIds) {
      try {
        const result = await processMessage(gmail, db, msgId, settings);
        if (result) results.push(result);
      } catch (error) {
        console.error(`Error processing message ${msgId}:`, error.message);
        results.push({ status: 'ERROR', messageId: msgId, error: error.message });
      }
    }

    await db('gmail_settings').where({ id: settings.id }).update({ last_sync_at: new Date().toISOString() });

    return { status: 'ok', processed: results.length, results };
  } catch (error) {
    console.error('Email poll error:', error.message);
    return { status: 'error', error: error.message };
  }
}

let pollInterval = null;

async function pollAllUsers(db) {
  const activeSettings = await db('gmail_settings').where({ is_active: true });
  for (const settings of activeSettings) {
    try {
      const result = await pollOnce(db, settings.user_id);
      if (result.status === 'ok' && result.processed > 0) {
        console.log(`Email poll (user ${settings.user_id}): processed ${result.processed} messages`);
      }
    } catch (error) {
      console.error(`Email poll error (user ${settings.user_id}):`, error.message);
    }
  }
}

export function startPoller(db) {
  if (pollInterval) return;

  console.log('Starting email poller (60s interval)');
  pollInterval = setInterval(() => pollAllUsers(db), 60000);

  // Do an initial poll after 5s
  setTimeout(() => pollAllUsers(db), 5000);
}

export function stopPoller() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
