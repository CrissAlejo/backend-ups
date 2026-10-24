import { z } from 'zod';

export const employeeDto = z.strictObject({
  nombre: z.string().trim().min(3).max(120),
  cargo: z.string().trim().min(1).max(120),
  departamento: z.string().trim().min(1).max(120),
  sueldo: z.number().nonnegative(),
});

export const employeeParamsDto = z.strictObject({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'ID de empleado invalido'),
});
