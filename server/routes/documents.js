import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function documentsRouter(db) {
  const router = Router();

  // GET /api/documents/:id/view — serve the PDF file
  router.get('/:id/view', asyncHandler(async (req, res) => {
    const doc = await db('documents').where({ id: req.params.id }).first();
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.resolve(__dirname, '..', doc.storage_path);
    res.sendFile(filePath);
  }));

  // GET /api/documents/by-import/:importId
  router.get('/by-import/:importId', asyncHandler(async (req, res) => {
    const docs = await db('documents').where({ email_import_id: req.params.importId });
    res.json(docs);
  }));

  // GET /api/documents/by-load/:loadId
  router.get('/by-load/:loadId', asyncHandler(async (req, res) => {
    const docs = await db('documents').where({ load_id: req.params.loadId });
    res.json(docs);
  }));

  return router;
}
