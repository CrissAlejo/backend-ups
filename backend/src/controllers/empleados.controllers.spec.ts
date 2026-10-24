import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import type { Employee, EmployeeInput } from '../domain/employee.js';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';
import { createEmployeeController } from './empleados.controllers.js';

describe('EmployeeController: mantenibilidad y modularidad', () => {
  let controller: ReturnType<typeof createEmployeeController>;
  let repository: jest.Mocked<IEmployeeRepository>;
  let response: Response;
  let statusMock: ReturnType<typeof jest.fn<Response['status']>>;
  let jsonMock: ReturnType<typeof jest.fn<Response['json']>>;
  let nextMock: ReturnType<typeof jest.fn<(error?: unknown) => void>>;

  const input: EmployeeInput = {
    nombre: 'Christian Alejandro', cargo: 'Arquitecto', departamento: 'TI', sueldo: 4000,
  };
  const employee: Employee = { ...input, _id: '507f1f77bcf86cd799439011' };

  beforeEach(() => {
    // Solo se simula el contrato del repositorio: no se carga ningún adaptador.
    repository = {
      findAll: jest.fn<IEmployeeRepository['findAll']>(),
      create: jest.fn<IEmployeeRepository['create']>(),
      update: jest.fn<IEmployeeRepository['update']>(),
      delete: jest.fn<IEmployeeRepository['delete']>(),
    };
    controller = createEmployeeController(repository);
    statusMock = jest.fn<Response['status']>();
    jsonMock = jest.fn<Response['json']>();
    nextMock = jest.fn<(error?: unknown) => void>();
    response = { status: statusMock, json: jsonMock } as unknown as Response;
    statusMock.mockReturnValue(response);
    jsonMock.mockReturnValue(response);
  });

  it('Listar - exitoso 1: devuelve la lista entregada por la abstracción', async () => {
    repository.findAll.mockResolvedValue([employee]);

    await controller.getEmpleado({} as Request, response, nextMock);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true, data: [employee], message: 'Operacion exitosa', errors: [],
    });
    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('Crear - exitoso 1: crea un empleado y responde con estado 201', async () => {
    repository.create.mockResolvedValue(employee);

    await controller.addEmpleado({ body: input } as Request, response, nextMock);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(input);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true, data: employee, message: 'Operacion exitosa', errors: [],
    });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it('Listar - error 1: delega al middleware el fallo del repositorio', async () => {
    const error = new Error('Repositorio no disponible');
    repository.findAll.mockRejectedValue(error);

    await controller.getEmpleado({} as Request, response, nextMock);

    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(nextMock).toHaveBeenCalledWith(error);
    expect(jsonMock).not.toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('Actualizar - error 1: delega un error 404 si el empleado no existe', async () => {
    repository.update.mockResolvedValue(null);
    const request = { params: { id: employee._id }, body: input } as unknown as Request;

    await controller.updateEmpleado(request, response, nextMock);

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(employee._id, input);
    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(nextMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Empleado no encontrado',
    }));
    expect(jsonMock).not.toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });
  describe('Listar: casos adicionales', () => {
    it('Exitoso 2: devuelve una lista vacía con estado 200', async () => {
      repository.findAll.mockResolvedValue([]);
      await controller.getEmpleado({} as Request, response, nextMock);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true, data: [], message: 'Operacion exitosa', errors: [],
      });
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('Error 2: propaga un tiempo de espera agotado', async () => {
      const error = new Error('Tiempo de espera agotado');
      repository.findAll.mockRejectedValue(error);
      await controller.getEmpleado({} as Request, response, nextMock);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(error);
      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });

  describe('Crear: casos adicionales', () => {
    it('Exitoso 2: acepta sueldo cero', async () => {
      const body = { ...input, sueldo: 0 };
      const created = { ...body, _id: employee._id };
      repository.create.mockResolvedValue(created);
      await controller.addEmpleado({ body } as Request, response, nextMock);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(body);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true, data: created, message: 'Operacion exitosa', errors: [],
      });
      expect(nextMock).not.toHaveBeenCalled();
    });

    it.each([
      { caso: 'sueldo negativo', body: { ...input, sueldo: -1 }, path: ['sueldo'] },
      { caso: 'sueldo como texto', body: { ...input, sueldo: '4000' }, path: ['sueldo'] },
      { caso: 'nombre de un carácter', body: { ...input, nombre: 'A' }, path: ['nombre'] },
      { caso: 'nombre de dos caracteres', body: { ...input, nombre: 'An' }, path: ['nombre'] },
      { caso: 'nombre corto rodeado de espacios', body: { ...input, nombre: ' An ' }, path: ['nombre'] },
      { caso: 'nombre vacío', body: { ...input, nombre: '' }, path: ['nombre'] },
      { caso: 'nombre con solo espacios', body: { ...input, nombre: '   ' }, path: ['nombre'] },
      { caso: 'nombre con tipo incorrecto', body: { ...input, nombre: 123 }, path: ['nombre'] },
      { caso: 'cargo vacío', body: { ...input, cargo: '' }, path: ['cargo'] },
      { caso: 'departamento vacío', body: { ...input, departamento: '' }, path: ['departamento'] },
      ...(['nombre', 'cargo', 'departamento', 'sueldo'] as const).map((field) => {
        const body: Partial<EmployeeInput> = { ...input };
        delete body[field];
        return { caso: `falta el atributo ${field}`, body, path: [field] };
      }),
      { caso: 'atributo mal escrito: salario en lugar de sueldo', body: {
        nombre: input.nombre, cargo: input.cargo, departamento: input.departamento, salario: 4000,
      }, path: ['sueldo'] },
      { caso: 'atributo adicional no permitido', body: { ...input, administrador: true }, path: [] },
      { caso: 'cuerpo vacío', body: {}, path: ['nombre'] },
      { caso: 'cuerpo no enviado', body: undefined, path: [] },
      { caso: 'cuerpo nulo', body: null, path: [] },
    ])('Validación al crear: rechaza $caso antes de persistir', async ({ body, path }) => {
      await controller.addEmpleado({ body } as Request, response, nextMock);
      expect(repository.create).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(expect.objectContaining({
        issues: expect.arrayContaining([expect.objectContaining({ path })]),
      }));
      expect(jsonMock).not.toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('Acepta un nombre de exactamente tres caracteres y elimina espacios externos', async () => {
      const body = { ...input, nombre: ' Ana ' };
      const normalized = { ...input, nombre: 'Ana' };
      const created = { ...normalized, _id: employee._id };
      repository.create.mockResolvedValue(created);

      await controller.addEmpleado({ body } as Request, response, nextMock);

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(normalized);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true, data: created, message: 'Operacion exitosa', errors: [],
      });
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('Error 2: propaga el fallo al crear', async () => {
      const error = new Error('No se pudo crear el empleado');
      repository.create.mockRejectedValue(error);
      await controller.addEmpleado({ body: input } as Request, response, nextMock);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(input);
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(error);
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });

  describe('Actualizar: casos adicionales', () => {
    it.each([
      { caso: 'Exitoso 1: cambia el cargo', body: { ...input, cargo: 'Gerente' } },
      { caso: 'Exitoso 2: cambia el sueldo', body: { ...input, sueldo: 5000 } },
    ])('$caso', async ({ body }) => {
      const updated = { ...body, _id: employee._id };
      repository.update.mockResolvedValue(updated);
      const request = { params: { id: employee._id }, body } as unknown as Request;
      await controller.updateEmpleado(request, response, nextMock);
      expect(repository.update).toHaveBeenCalledTimes(1);
      expect(repository.update).toHaveBeenCalledWith(employee._id, body);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true, data: updated, message: 'Operacion exitosa', errors: [],
      });
      expect(nextMock).not.toHaveBeenCalled();
    });

    it('Error 2: rechaza nombre vacío antes de persistir', async () => {
      const request = {
        params: { id: employee._id }, body: { ...input, nombre: ' ' },
      } as unknown as Request;
      await controller.updateEmpleado(request, response, nextMock);
      expect(repository.update).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(expect.objectContaining({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['nombre'] })]),
      }));
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });

  describe('Eliminar: 2 exitosos y 2 de error', () => {
    it.each([employee._id, '0123456789abcdef01234567'])(
      'Exitoso: elimina el empleado con ID %s', async (id) => {
        repository.delete.mockResolvedValue(true);
        await controller.deleteEmpleado({ params: { id } } as unknown as Request, response, nextMock);
        expect(repository.delete).toHaveBeenCalledTimes(1);
        expect(repository.delete).toHaveBeenCalledWith(id);
        expect(jsonMock).toHaveBeenCalledWith({
          success: true, data: true, message: 'Operacion exitosa', errors: [],
        });
        expect(nextMock).not.toHaveBeenCalled();
      },
    );

    it('Error 1: empleado inexistente', async () => {
      repository.delete.mockResolvedValue(false);
      const request = { params: { id: employee._id } } as unknown as Request;
      await controller.deleteEmpleado(request, response, nextMock);
      expect(repository.delete).toHaveBeenCalledTimes(1);
      expect(repository.delete).toHaveBeenCalledWith(employee._id);
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Empleado no encontrado',
      }));
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it('Error 2: propaga el fallo al eliminar', async () => {
      const error = new Error('No se pudo eliminar el empleado');
      repository.delete.mockRejectedValue(error);
      const request = { params: { id: employee._id } } as unknown as Request;
      await controller.deleteEmpleado(request, response, nextMock);
      expect(repository.delete).toHaveBeenCalledTimes(1);
      expect(repository.delete).toHaveBeenCalledWith(employee._id);
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(nextMock).toHaveBeenCalledWith(error);
      expect(jsonMock).not.toHaveBeenCalled();
    });
  });
});
