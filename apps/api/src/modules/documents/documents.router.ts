import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { prisma } from '../../prisma/client';
import { env } from '../../config';

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: env.MAX_FILE_SIZE } });

// GET /documents
router.get('/', asyncHandler(async (req, res) => {
  const { buildingId } = req.query;
  const documents = await prisma.document.findMany({
    where: {
      companyId: req.companyId!,
      deletedAt: null,
      ...(buildingId ? { buildingId: buildingId as string } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: documents });
}));

// POST /documents
router.post('/', requireRole('EMPLOYEE'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Archivo requerido' });

  const data = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.enum(['REGULATION', 'MEETING_MINUTES', 'CONTRACT', 'INVOICE', 'CERTIFICATE', 'OTHER']),
    buildingId: z.string().optional(),
    isPublic: z.string().optional(),
  }).parse(req.body);

  const document = await prisma.document.create({
    data: {
      companyId: req.companyId!,
      name: data.name,
      description: data.description,
      category: data.category,
      buildingId: data.buildingId,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedById: req.user!.userId,
      isPublic: data.isPublic === 'true',
    },
  });
  res.status(201).json({ success: true, data: document });
}));

// DELETE /documents/:id
router.delete('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  await prisma.document.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  res.json({ success: true, message: 'Documento eliminado' });
}));

export default router;
