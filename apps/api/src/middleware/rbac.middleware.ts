import { Request, Response, NextFunction } from 'express';

type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE' | 'RESIDENT';

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN:   4,
  COMPANY_ADMIN: 3,
  EMPLOYEE:      2,
  RESIDENT:      1,
};

// Require minimum role
export const requireRole = (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as Role;

    if (!userRole) {
      return res.status(401).json({ success: false, error: 'No autenticado' });
    }

    const hasPermission = roles.some(
      (role) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Sin permisos para esta acción',
        code: 'FORBIDDEN',
      });
    }

    next();
  };

// Shortcuts
export const adminOnly = requireRole('COMPANY_ADMIN');
export const staffOnly = requireRole('EMPLOYEE');
export const residentOnly = requireRole('RESIDENT');
