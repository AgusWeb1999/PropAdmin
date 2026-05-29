import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import * as usersService from './users.service';

const router = Router();
router.use(authenticate);
router.use(requireRole('COMPANY_ADMIN')); // Solo admins gestionan usuarios

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'COMPANY_ADMIN']).default('EMPLOYEE'),
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'COMPANY_ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

// GET /users
router.get('/', asyncHandler(async (req, res) => {
  const data = await usersService.getCompanyUsers(req.companyId!);
  res.json({ success: true, data });
}));

// POST /users
router.post('/', asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const user = await usersService.createUser(req.companyId!, data);
  res.status(201).json({ success: true, data: user });
}));

// PUT /users/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const user = await usersService.updateUser(req.params.id, req.companyId!, data);
  res.json({ success: true, data: user });
}));

// POST /users/:id/deactivate
router.post('/:id/deactivate', asyncHandler(async (req, res) => {
  await usersService.deactivateUser(req.params.id, req.companyId!, req.user!.userId);
  res.json({ success: true, message: 'Usuario desactivado' });
}));

// POST /users/:id/reset-password
router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const { password } = z.object({ password: z.string().min(8) }).parse(req.body);
  await usersService.resetUserPassword(req.params.id, req.companyId!, password);
  res.json({ success: true, message: 'Contraseña actualizada' });
}));

export default router;
