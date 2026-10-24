import { z } from 'zod';

const requiredText = z.string().trim().min(1, 'El campo es obligatorio').max(150);
export const employeeDto = z.object({
  nombre: requiredText.min(3, 'El nombre debe tener al menos 3 caracteres'),
  cargo: requiredText,
  departamento: requiredText,
  sueldo: z.number().finite().nonnegative('El sueldo no puede ser negativo'),
}).strict();

export const employeeParamsDto = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Identificador inválido'),
}).strict();
