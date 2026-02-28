/**
 * Rate Con extraction route — standalone endpoint for drag-and-drop PDF upload.
 *
 * POST /api/ratecon/extract
 *   Accepts a PDF upload, runs Gemini extraction, returns structured data.
 *   Does NOT create a load — frontend reviews first via DraftReviewModal.
 *
 * POST /api/ratecon/create-from-extract
 *   Accepts extracted data (from above) + user edits, creates the load + stops.
 *
 * This entire module is self-contained and can be broken off into a
 * separate microservice by giving it its own Express app + DB connection.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'ratecon');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${uniqueSuffix}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

export default function rateconRouter(db) {
  const router = Router();

  // POST /api/ratecon/extract — upload PDF, get extracted data back
  router.post('/extract', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const storagePath = path.relative(path.resolve(__dirname, '..'), req.file.path);

    try {
      const { extractOnly } = await import('../services/geminiExtractor.js');
      const extracted = await extractOnly(storagePath);

      // Save document record for later linking
      const [doc] = await db('documents').insert({
        doc_type: 'RATE_CON',
        filename: req.file.originalname,
        storage_path: storagePath,
        file_size: req.file.size,
      }).returning('*');

      res.json({
        document_id: doc.id,
        filename: req.file.originalname,
        extracted,
      });
    } catch (err) {
      // Clean up uploaded file on extraction failure
      fs.unlink(req.file.path, () => {});
      throw err;
    }
  }));

  // POST /api/ratecon/create-from-extract — create load from reviewed extraction
  router.post('/create-from-extract', asyncHandler(async (req, res) => {
    const { document_id, data, dispatcher_id } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Extracted data is required' });
    }

    const userId = dispatcher_id || req.user?.id || null;

    // Rate con ref is the customer's ref — auto-generate our internal ref
    const [load] = await db('loads').insert({
      reference_number: `RC-${Date.now().toString(36).toUpperCase()}`,
      customer_ref_number: data.customer_ref_number || null,
      customer_id: data.customer_id || null,
      dispatcher_id: userId,
      status: 'OPEN',
      confidence_score: data.confidence || null,
      rate_amount: data.rate_amount || 0,
      rate_type: data.rate_type || 'FLAT',
      loaded_miles: data.loaded_miles || 0,
      empty_miles: 0,
      commodity: data.commodity || '',
      weight: data.weight || 0,
      equipment_type: data.equipment_type || 'DRY_VAN',
      special_instructions: data.special_instructions || null,
    }).returning('*');

    // Insert stops
    const stops = data.stops || [];
    if (stops.length > 0) {
      const stopRows = stops.map((stop, i) => ({
        id: `s${Date.now()}-${i}`,
        load_id: load.id,
        sequence_order: i + 1,
        stop_type: stop.stop_type || (i === 0 ? 'PICKUP' : 'DELIVERY'),
        facility_name: stop.facility_name || '',
        address: stop.address || '',
        city: stop.city || '',
        state: stop.state || '',
        zip: stop.zip || '',
        appointment_start: stop.appointment_start || null,
        appointment_end: stop.appointment_end || null,
      }));
      await db('stops').insert(stopRows);
    }

    // Link document to load
    if (document_id) {
      await db('documents').where({ id: document_id }).update({ load_id: load.id });
    }

    res.status(201).json(load);
  }));

  return router;
}
