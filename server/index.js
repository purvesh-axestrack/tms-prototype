import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db/index.js';
import authRouter from './routes/auth.js';
import loadsRouter from './routes/loads.js';
import driversRouter from './routes/drivers.js';
import customersRouter from './routes/customers.js';
import statsRouter from './routes/stats.js';
import gmailRouter, { gmailPublicRouter } from './routes/gmail.js';
import emailImportsRouter from './routes/emailImports.js';
import documentsRouter from './routes/documents.js';
import accessorialsRouter from './routes/accessorials.js';
import invoicesRouter from './routes/invoices.js';
import settlementsRouter from './routes/settlements.js';
import vehiclesRouter from './routes/vehicles.js';
import carriersRouter from './routes/carriers.js';
import usersRouter from './routes/users.js';
import samsaraRouter from './routes/samsara.js';
import locationsRouter from './routes/locations.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { startPoller } from './services/emailPoller.js';
import { ALL_ENUMS } from './lib/constants.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve frontend in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Static data (no auth, cacheable)
app.get('/api/enums', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(ALL_ENUMS);
});

// Public routes (no auth required)
app.use('/api/auth', authRouter(db));
app.use('/api/gmail', gmailPublicRouter(db)); // Only OAuth callback is public

// Protected routes
app.use('/api', authenticate(db));
app.use('/api/gmail', gmailRouter(db)); // auth-url, status, disconnect, sync, filter-senders
app.use('/api/loads', loadsRouter(db));
app.use('/api/drivers', driversRouter(db));
app.use('/api/customers', customersRouter(db));
app.use('/api/stats', statsRouter(db));
app.use('/api/email-imports', emailImportsRouter(db));
app.use('/api/documents', documentsRouter(db));
app.use('/api/accessorials', accessorialsRouter(db));
app.use('/api/invoices', invoicesRouter(db));
app.use('/api/settlements', settlementsRouter(db));
app.use('/api/vehicles', vehiclesRouter(db));
app.use('/api/carriers', carriersRouter(db));
app.use('/api/users', usersRouter(db));
app.use('/api/samsara', samsaraRouter(db));
app.use('/api/locations', locationsRouter(db));

// SPA catch-all: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`TMS Server running on http://localhost:${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);

  // Verify database connection
  try {
    await db.raw('SELECT 1');
    console.log('Database connected');

    const loadCount = await db('loads').count('id as count').first();
    const driverCount = await db('drivers').count('id as count').first();
    const customerCount = await db('customers').count('id as count').first();

    console.log(`\nData loaded:`);
    console.log(`   - ${loadCount.count} loads`);
    console.log(`   - ${driverCount.count} drivers`);
    console.log(`   - ${customerCount.count} customers`);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.log('Run: npx knex migrate:latest && npx knex seed:run');
  }

  // Start email poller if Gmail credentials are configured
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
    startPoller(db);
  } else {
    console.log('\nGmail not configured - email poller disabled');
    console.log('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env to enable');
  }

  console.log('\nReady to accept requests!');
});
