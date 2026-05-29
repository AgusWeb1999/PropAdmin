import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';

export interface JWTPayload {
  userId: string;
  companyId: string;
  role: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      companyId?: string;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token requerido',
      code: 'UNAUTHORIZED',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.user = payload;
    req.companyId = payload.companyId;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado',
      code: 'INVALID_TOKEN',
    });
  }
};

// Optional auth — no error if no token
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET) as JWTPayload;
      req.user = payload;
      req.companyId = payload.companyId;
    } catch {
      // ignore
    }
  }
  next();
};
