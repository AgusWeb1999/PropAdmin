import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../prisma/client';
import { env } from '../../config';
import { AppError } from '../../middleware/error.middleware';
import { JWTPayload } from '../../middleware/auth.middleware';

const SALT_ROUNDS = 12;

function signAccess(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

function signRefresh(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
    include: { company: { select: { id: true, name: true, plan: true, isActive: true } } },
  });

  if (!user) throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  if (!user.company.isActive) throw new AppError('Empresa inactiva', 403, 'COMPANY_INACTIVE');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');

  const payload: JWTPayload = {
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    email: user.email,
  };

  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(user.id);

  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: refreshExpiry },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      company: user.company,
    },
  };
}

export async function register(data: {
  companyName: string;
  companyEmail: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existingUser) throw new AppError('El email ya está registrado', 409, 'EMAIL_EXISTS');

  const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);

  const company = await prisma.company.create({
    data: {
      name: data.companyName,
      email: data.companyEmail.toLowerCase(),
      users: {
        create: {
          email: data.email.toLowerCase(),
          password: hashed,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: 'COMPANY_ADMIN',
        },
      },
    },
    include: { users: true },
  });

  const user = company.users[0];
  const payload: JWTPayload = {
    userId: user.id,
    companyId: company.id,
    role: user.role,
    email: user.email,
  };

  return {
    accessToken: signAccess(payload),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      company: { id: company.id, name: company.name },
    },
  };
}

export async function refresh(token: string) {
  let payload: { userId: string };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new AppError('Refresh token inválido', 401, 'INVALID_TOKEN');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token expirado', 401, 'TOKEN_EXPIRED');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { company: true },
  });
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

  const newAccess = signAccess({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    email: user.email,
  });

  return { accessToken: newAccess };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
  // Always return success to avoid email enumeration
  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  // TODO: send email with token
  console.log(`Password reset token for ${email}: ${token}`);
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
      deletedAt: null,
    },
  });
  if (!user) throw new AppError('Token inválido o expirado', 400, 'INVALID_TOKEN');

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
}

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, avatar: true, role: true, lastLoginAt: true,
      company: { select: { id: true, name: true, plan: true, logo: true } },
    },
  });
}
