import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler.js';
import { DOC_TYPES } from '../lib/constants.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

// Ensure uploads dir exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.doc', '.docx', '.xls', '.xlsx', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

export default function documentsRouter(db) {
  const router = Router();

  // GET /api/documents/:id/view — serve the file
  router.get('/:id/view', asyncHandler(async (req, res) => {
    const doc = await db('documents').where({ id: req.params.id }).first();
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.resolve(__dirname, '..', doc.storage_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    res.sendFile(filePath);
  }));

  // GET /api/documents/by-import/:importId
  router.get('/by-import/:importId', asyncHandler(async (req, res) => {
    const docs = await db('documents').where({ email_import_id: req.params.importId });
    res.json(docs);
  }));

  // GET /api/documents/by-load/:loadId
  router.get('/by-load/:loadId', asyncHandler(async (req, res) => {
    const docs = await db('documents').where({ load_id: req.params.loadId }).orderBy('created_at', 'desc');
    res.json(docs);
  }));

  // POST /api/documents/upload — upload a file and attach to a load
  router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { load_id, doc_type = 'OTHER' } = req.body;

    if (!load_id) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'load_id is required' });
    }

    if (!DOC_TYPES.includes(doc_type)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `doc_type must be one of: ${DOC_TYPES.join(', ')}` });
    }

    const load = await db('loads').where({ id: load_id }).first();
    if (!load) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Load not found' });
    }

    const storagePath = path.relative(path.resolve(__dirname, '..'), req.file.path);

    const [doc] = await db('documents').insert({
      load_id: parseInt(load_id),
      doc_type,
      filename: req.file.originalname,
      storage_path: storagePath,
      storage_type: 'LOCAL',
      file_size: req.file.size,
    }).returning('*');

    res.status(201).json(doc);
  }));

  // DELETE /api/documents/:id
  router.delete('/:id', asyncHandler(async (req, res) => {
    const doc = await db('documents').where({ id: req.params.id }).first();
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Remove file from disk
    const filePath = path.resolve(__dirname, '..', doc.storage_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db('documents').where({ id: req.params.id }).delete();
    res.json({ message: 'Document deleted' });
  }));

  return router;
}
