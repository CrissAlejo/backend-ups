import { Router, type RequestHandler } from 'express';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';
import { createEmployeeController } from '../controllers/empleados.controllers.js';

export function createEmployeeRouter(repository: IEmployeeRepository, authenticateJWT: RequestHandler) {
  const router = Router();
  const controller = createEmployeeController(repository);
  router.get('/empleados', controller.getEmpleado);
  router.post('/empleados', authenticateJWT, controller.addEmpleado);
  router.put('/empleados/:id', authenticateJWT, controller.updateEmpleado);
  router.delete('/empleados/:id', authenticateJWT, controller.deleteEmpleado);
  return router;
}
