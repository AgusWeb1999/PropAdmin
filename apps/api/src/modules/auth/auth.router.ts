import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/error.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import * as authService from './auth.service';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña mínimo 6 caracteres'),
});

const registerSchema = z.object({
  companyName: z.string().min(2, 'Nombre de empresa requerido'),
  companyEmail: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Contraseña mínimo 8 caracteres'),
  phone: z.string().optional(),
});

// POST /auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data.email, data.password);
  res.json({ success: true, data: result });
}));

// POST /auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json({ success: true, data: result });
}));

// POST /auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.json({ success: true, data: result });
}));

// POST /auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  await authService.forgotPassword(email);
  res.json({ success: true, message: 'Si el email existe, recibirás instrucciones' });
}));

// POST /auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = z.object({
    token: z.string(),
    password: z.string().min(8),
  }).parse(req.body);
  await authService.resetPassword(token, password);
  res.json({ success: true, message: 'Contraseña actualizada' });
}));

// GET /auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user!.userId);
  res.json({ success: true, data: user });
}));

export default router;
