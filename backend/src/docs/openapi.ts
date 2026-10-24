import { z } from 'zod';
import { employeeDto, employeeParamsDto } from '../dtos/employee.dto.js';
import { loginDto } from '../dtos/auth.dto.js';

// Los limites del cuerpo se generan desde el mismo DTO que valida Express.
const { $schema: _schema, ...employeeInput } = z.toJSONSchema(employeeDto);
const employee = {
  ...employeeInput,
  required: ['_id', 'nombre', 'cargo', 'departamento', 'sueldo'],
  properties: {
    ...employeeInput.properties,
    _id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$', example: '507f1f77bcf86cd799439011' },
    createdAt: { type: 'string', format: 'date-time', readOnly: true },
    updatedAt: { type: 'string', format: 'date-time', readOnly: true },
  },
};
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const wrapper = (data: object, ok: boolean) => ({
  type: 'object', required: ['success', 'data', 'message', 'errors'],
  properties: {
    success: { type: 'boolean', const: ok }, data,
    message: { type: 'string', example: ok ? 'Operacion exitosa' : 'Datos invalidos' },
    errors: { type: 'array', ...(ok ? { maxItems: 0 } : {}), items: {
      type: 'object', required: ['path', 'message'], properties: {
        path: { type: 'string', example: 'sueldo' },
        message: { type: 'string', example: 'El sueldo no puede ser negativo' },
      },
    } },
  },
});
const response = (description: string, schema: object) => ({ description, content: json(schema) });
const errors = {
  '401': response('Token Bearer ausente.', ref('ErrorResponse')),
  '403': response('Token vencido o invalido.', ref('ErrorResponse')),
  '400': response('Cuerpo o identificador invalido; incluye JSON malformado.', ref('ErrorResponse')),
  '413': response('Cuerpo demasiado grande.', ref('ErrorResponse')),
  '500': response('Error interno sin detalles de persistencia.', ref('ErrorResponse')),
};
const notFound = response('Empleado no encontrado.', ref('ErrorResponse'));
const requestBody = {
  required: true,
  description: 'Todos los campos son obligatorios. Los textos se recortan; no se admiten campos adicionales.',
  content: { 'application/json': { schema: ref('EmployeeInput'), example: {
    nombre: 'Ana Perez', cargo: 'Desarrolladora', departamento: 'TI', sueldo: 1500,
  } } },
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'API de empleados', version: '1.0.0',
    description: 'CRUD de empleados con Repository, validacion Zod y respuestas uniformes.',
  },
  servers: [{ url: '/api', description: 'Backend actual' }],
  tags: [{ name: 'Empleados', description: 'Gestion de empleados' }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Autenticacion'], summary: 'Iniciar sesion (JWT valido por 2 horas)',
        requestBody: { required: true, content: json(z.toJSONSchema(loginDto)) },
        responses: {
          '200': response('Sesion iniciada.', wrapper({ type: 'object', properties: {
            token: { type: 'string' },
            user: { type: 'object', properties: { email: { type: 'string' }, rol: { type: 'string' } } },
          } }, true)),
          '400': errors['400'],
          '401': response('Credenciales invalidas.', ref('ErrorResponse')),
          '500': errors['500'],
        },
      },
    },
    '/empleados': {
      get: {
        tags: ['Empleados'], operationId: 'listEmployees', summary: 'Listar empleados',
        responses: {
          '200': response('Lista de empleados.', wrapper({ type: 'array', items: ref('Employee') }, true)),
          '500': errors['500'],
        },
      },
      post: {
        security: [{ bearerAuth: [] }],
        tags: ['Empleados'], operationId: 'createEmployee', summary: 'Crear empleado', requestBody,
        responses: { '201': response('Empleado creado.', ref('EmployeeResponse')), ...errors },
      },
    },
    '/empleados/{id}': {
      parameters: [{
        name: 'id', in: 'path', required: true, description: 'Identificador MongoDB de 24 caracteres hexadecimales.',
        schema: z.toJSONSchema(employeeParamsDto.shape.id), example: '507f1f77bcf86cd799439011',
      }],
      put: {
        security: [{ bearerAuth: [] }],
        tags: ['Empleados'], operationId: 'updateEmployee', summary: 'Actualizar empleado',
        description: 'Requiere los cuatro campos editables; no es una actualizacion parcial.', requestBody,
        responses: { '200': response('Empleado actualizado.', ref('EmployeeResponse')), ...errors, '404': notFound },
      },
      delete: {
        security: [{ bearerAuth: [] }],
        tags: ['Empleados'], operationId: 'deleteEmployee', summary: 'Eliminar empleado',
        responses: {
          '200': response('Empleado eliminado; data es true.', wrapper({ type: 'boolean', const: true }, true)),
          '400': errors['400'], '401': errors['401'], '403': errors['403'], '404': notFound, '500': errors['500'],
        },
      },
    },
  },
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas: {
    EmployeeInput: employeeInput, Employee: employee,
    EmployeeResponse: wrapper(ref('Employee'), true),
    ErrorResponse: wrapper({ type: 'null' }, false),
  } },
};
