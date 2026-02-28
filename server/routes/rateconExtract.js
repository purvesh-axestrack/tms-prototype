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

      // Log raw Gemini output for mismatch detection
      const d = extracted.data || {};
      console.log(`[RateCon] Gemini raw → equipment: "${d.equipment_type?.value}", rate_type: "${d.rate_type?.value}", stops: [${(d.stops||[]).map(s=>s.stop_type).join(', ')}]`);

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

    const VALID_EQUIPMENT = ['DRY_VAN','REEFER','FLATBED','STEP_DECK','LOWBOY','HOTSHOT','CONTAINER','POWER_ONLY','TANKER','STRAIGHT_TRUCK','SPRINTER_VAN','CARGO_VAN'];
    const VALID_STOP_TYPES = ['PICKUP', 'DELIVERY'];

    const normalize = (raw, validSet, fallback, aliasMap = {}) => {
      if (!raw) return fallback;
      const upper = raw.toUpperCase().replace(/[\s-]+/g, '_');
      if (validSet.includes(upper)) return upper;
      if (aliasMap[upper]) return aliasMap[upper];
      return validSet.find(e => upper.includes(e)) || fallback;
    };

    const equipmentAliases = { 'DRY': 'DRY_VAN', 'VAN': 'DRY_VAN', 'REFRIGERATED': 'REEFER', 'FLAT_BED': 'FLATBED', 'FLAT': 'FLATBED', 'STEPDECK': 'STEP_DECK', 'LOW_BOY': 'LOWBOY' };
    const stopAliases = { 'PICK_UP': 'PICKUP', 'PICK': 'PICKUP', 'DROP': 'DELIVERY', 'DROPOFF': 'DELIVERY', 'DROP_OFF': 'DELIVERY', 'DELIVER': 'DELIVERY' };

    // Log raw values for mismatch detection
    const normalized = {
      equipment_type: normalize(data.equipment_type, VALID_EQUIPMENT, 'DRY_VAN', equipmentAliases),
      rate_type: ['FLAT', 'CPM', 'PERCENTAGE'].includes(data.rate_type?.toUpperCase?.()) ? data.rate_type.toUpperCase() : 'FLAT',
    };
    if (data.equipment_type !== normalized.equipment_type) {
      console.warn(`[RateCon] equipment_type normalized: "${data.equipment_type}" → "${normalized.equipment_type}"`);
    }
    if (data.rate_type && data.rate_type !== normalized.rate_type) {
      console.warn(`[RateCon] rate_type normalized: "${data.rate_type}" → "${normalized.rate_type}"`);
    }

    // Rate con ref is the customer's ref — auto-generate our internal ref
    const [load] = await db('loads').insert({
      reference_number: `RC-${Date.now().toString(36).toUpperCase()}`,
      customer_ref_number: data.customer_ref_number || null,
      customer_id: data.customer_id || null,
      dispatcher_id: userId,
      status: 'OPEN',
      confidence_score: data.confidence || null,
      rate_amount: data.rate_amount || 0,
      rate_type: normalized.rate_type,
      loaded_miles: data.loaded_miles || 0,
      empty_miles: 0,
      commodity: data.commodity || '',
      weight: data.weight || 0,
      equipment_type: normalized.equipment_type,
      special_instructions: data.special_instructions || null,
    }).returning('*');

    // Insert stops
    const stops = data.stops || [];
    if (stops.length > 0) {
      const stopRows = stops.map((stop, i) => {
        const rawType = stop.stop_type;
        const normalizedType = normalize(rawType, VALID_STOP_TYPES, i === 0 ? 'PICKUP' : 'DELIVERY', stopAliases);
        if (rawType && rawType !== normalizedType) {
          console.warn(`[RateCon] stop[${i}].stop_type normalized: "${rawType}" → "${normalizedType}"`);
        }
        return {
        id: `s${Date.now()}-${i}`,
        load_id: load.id,
        sequence_order: i + 1,
        stop_type: normalizedType,
        facility_name: stop.facility_name || '',
        address: stop.address || '',
        city: stop.city || '',
        state: stop.state || '',
        zip: stop.zip || '',
        appointment_start: stop.appointment_start || null,
        appointment_end: stop.appointment_end || null,
        };
      });
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
