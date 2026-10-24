import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError, type ApiResponse } from '../http/response.js';
export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, 'ROUTE_NOT_FOUND', 'Ruta no encontrada'));
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  let status = 500;
  const payload: ApiResponse<never> = { success: false, data: null, message: 'Error interno del servidor', errors: [] };
  if (error instanceof ZodError) {
    status = 400;
    payload.message = 'Datos invalidos';
    payload.errors = error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }));
  } else if (error instanceof HttpError) {
    status = error.status;
    payload.message = error.message;
  } else if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    status = 400;
    payload.message = 'El cuerpo debe ser JSON valido';
  } else if (typeof error === 'object' && error !== null && 'status' in error && error.status === 413) {
    status = 413;
    payload.message = 'El cuerpo de la solicitud es demasiado grande';
  } else { console.error('Error interno:', error); }
  res.status(status).json(payload);
};
