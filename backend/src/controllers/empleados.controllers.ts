import type { RequestHandler } from 'express';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';
import { employeeDto, employeeParamsDto } from '../dtos/employee.dto.js';
import { HttpError, success } from '../http/response.js';

export function createEmployeeController(repository: IEmployeeRepository) {
  const getEmpleado: RequestHandler = async (_req, res, next) => {
    try {
      const employees = await repository.findAll();
      res.status(200).json(success(employees));
    } catch (error) { next(error); }
  };
  const addEmpleado: RequestHandler = async (req, res, next) => {
    try {
      const input = employeeDto.parse(req.body);
      res.status(201).json(success(await repository.create(input)));
    } catch (error) { next(error); }
  };
  const updateEmpleado: RequestHandler = async (req, res, next) => {
    try {
      const { id } = employeeParamsDto.parse(req.params);
      const input = employeeDto.parse(req.body);
      const employee = await repository.update(id, input);
      if (!employee) throw new HttpError(404, 'EMPLOYEE_NOT_FOUND', 'Empleado no encontrado');
      res.json(success(employee));
    } catch (error) { next(error); }
  };
  const deleteEmpleado: RequestHandler = async (req, res, next) => {
    try {
      const { id } = employeeParamsDto.parse(req.params);
      const employee = await repository.delete(id);
      if (!employee) throw new HttpError(404, 'EMPLOYEE_NOT_FOUND', 'Empleado no encontrado');
      res.json(success(employee));
    } catch (error) { next(error); }
  };
  return { getEmpleado, addEmpleado, updateEmpleado, deleteEmpleado };
}
