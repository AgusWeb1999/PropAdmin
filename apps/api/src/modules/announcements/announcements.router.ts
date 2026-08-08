import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';
import { sendAnnouncementEmail } from '../../utils/email';

const router = Router();
router.use(authenticate);

// GET /announcements/building/:buildingId
router.get('/building/:buildingId', asyncHandler(async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    where: {
      buildingId: req.params.buildingId,
      building: { companyId: req.companyId! },
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ isImportant: 'desc' }, { publishedAt: 'desc' }],
  });
  res.json({ success: true, data: announcements });
}));

// POST /announcements
router.post('/', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  const data = z.object({
    buildingId: z.string(),
    title: z.string().min(2),
    content: z.string().min(5),
    isImportant: z.boolean().optional(),
    expiresAt: z.string().datetime().optional(),
    notifyByEmail: z.boolean().optional(),
  }).parse(req.body);

  const building = await prisma.building.findFirst({
    where: { id: data.buildingId, companyId: req.companyId!, deletedAt: null },
    include: { company: { select: { name: true } } },
  });
  if (!building) throw new AppError('Edificio no encontrado', 404, 'NOT_FOUND');

  const { notifyByEmail, ...announcementData } = data;

  const announcement = await prisma.announcement.create({
    data: {
      ...announcementData,
      expiresAt: announcementData.expiresAt ? new Date(announcementData.expiresAt) : undefined,
    },
  });

  // Enviar emails a residentes del edificio
  let emailsSent = 0, emailsSkipped = 0;
  if (notifyByEmail) {
    const residents = await prisma.resident.findMany({
      where: {
        apartment: { buildingId: data.buildingId, deletedAt: null },
        isActive: true,
        deletedAt: null,
        email: { not: null },
      },
      select: { firstName: true, lastName: true, email: true },
    });

    const results = await Promise.allSettled(
      residents.map(r =>
        sendAnnouncementEmail({
          to: r.email!,
          residentName: `${r.firstName} ${r.lastName}`,
          buildingName: building.name,
          companyName: building.company.name,
          title: data.title,
          content: data.content,
          isImportant: data.isImportant ?? false,
          expiresAt: announcementData.expiresAt ? new Date(announcementData.expiresAt) : null,
        })
      )
    );

    emailsSent = results.filter(r => r.status === 'fulfilled').length;
    emailsSkipped = results.filter(r => r.status === 'rejected').length;
    console.log(`[announcements] emails: sent=${emailsSent} failed=${emailsSkipped}`);
  }

  res.status(201).json({ success: true, data: { announcement, emailsSent, emailsSkipped } });
}));

// DELETE /announcements/:id
router.delete('/:id', requireRole('EMPLOYEE'), asyncHandler(async (req, res) => {
  await prisma.announcement.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });
  res.json({ success: true, message: 'Anuncio eliminado' });
}));

export default router;
