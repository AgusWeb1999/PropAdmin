import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma/client';
import { AppError } from '../../middleware/error.middleware';

export async function getCompanyUsers(companyId: string) {
  return prisma.user.findMany({
    where: { companyId, deletedAt: null },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
  });
}

export async function createUser(companyId: string, data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'EMPLOYEE' | 'COMPANY_ADMIN';
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new AppError('El email ya está registrado', 409, 'EMAIL_EXISTS');

  const hashed = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: {
      companyId,
      email: data.email.toLowerCase(),
      password: hashed,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
    },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, phone: true, isActive: true, createdAt: true,
    },
  });
}

export async function updateUser(id: string, companyId: string, data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'EMPLOYEE' | 'COMPANY_ADMIN';
  isActive?: boolean;
}) {
  const user = await prisma.user.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, phone: true, isActive: true, createdAt: true,
    },
  });
}

export async function deactivateUser(id: string, companyId: string, requesterId: string) {
  if (id === requesterId) throw new AppError('No podés desactivar tu propia cuenta', 400, 'SELF_DEACTIVATE');
  const user = await prisma.user.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, isActive: true },
  });
}

export async function resetUserPassword(id: string, companyId: string, newPassword: string) {
  const user = await prisma.user.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

  const hashed = await bcrypt.hash(newPassword, 12);
  return prisma.user.update({
    where: { id },
    data: { password: hashed },
    select: { id: true },
  });
}
