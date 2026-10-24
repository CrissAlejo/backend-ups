import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../http/response.js';

export interface IAuthRequest extends Request {
  user?: { id: string; rol: string };
}

export function createAuthenticateJWT(secret: string): RequestHandler {
  return (req: IAuthRequest, _res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
    if (!match?.[1]) {
      next(new HttpError(401, 'UNAUTHORIZED', 'Acceso denegado: se requiere un token Bearer'));
      return;
    }
    try {
      const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || typeof payload['id'] !== 'string' || !payload['id'] ||
          typeof payload['rol'] !== 'string' || !payload['rol'] || typeof payload.exp !== 'number') {
        throw new Error('Payload invalido');
      }
      req.user = { id: payload['id'], rol: payload['rol'] };
      next();
    } catch {
      next(new HttpError(403, 'FORBIDDEN', 'El token ha expirado o es invalido'));
    }
  };
}
