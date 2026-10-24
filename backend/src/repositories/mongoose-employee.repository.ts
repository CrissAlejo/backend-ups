import Empleado from '../models/empleado.js';
import type { Employee, EmployeeInput } from '../domain/employee.js';
import type { IEmployeeRepository } from './employee.repository.js';

function toEmployee(document: InstanceType<typeof Empleado>): Employee {
  return {
    _id: document._id.toString(),
    nombre: document.nombre,
    cargo: document.cargo,
    departamento: document.departamento,
    sueldo: document.sueldo,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export class MongooseEmployeeRepository implements IEmployeeRepository {
  async findAll(): Promise<Employee[]> {
    return (await Empleado.find().exec()).map(toEmployee);
  }
  async create(input: EmployeeInput): Promise<Employee> {
    return toEmployee(await Empleado.create(input));
  }
  async update(id: string, input: EmployeeInput): Promise<Employee | null> {
    const document = await Empleado.findByIdAndUpdate(id, input, { new: true, runValidators: true }).exec();
    return document ? toEmployee(document) : null;
  }
  async delete(id: string): Promise<boolean> {
    const document = await Empleado.findByIdAndDelete(id).exec();
    return document !== null;
  }
}
