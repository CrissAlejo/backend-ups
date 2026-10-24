import { z } from 'zod';

export function getJwtSecret(): string {
  return z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres').parse(process.env['JWT_SECRET']);
}
