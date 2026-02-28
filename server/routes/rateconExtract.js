/**
 * Rate Con extraction route — standalone endpoint for drag-and-drop PDF upload.
 *
 * POST /api/ratecon/extract
 *   Accepts a PDF upload, runs Gemini extraction, returns structured data.
 *   Does NOT create a load — frontend reviews via LoadCreateModal with prefill,
 *   then submits through the standard POST /api/loads endpoint.
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

  return router;
}
