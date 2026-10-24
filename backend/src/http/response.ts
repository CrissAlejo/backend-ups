export interface ValidationIssue { path: string; message: string }
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors: ValidationIssue[];
}
export const success = <T>(data: T): ApiResponse<T> => ({ success: true, data, message: 'Operacion exitosa', errors: [] });
export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
