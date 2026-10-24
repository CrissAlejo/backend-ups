import { z } from 'zod';

export const loginDto = z.object({
  email: z.string().trim().toLowerCase().email('El correo electronico no es valido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
    .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña admite hasta 72 bytes'),
}).strict();
