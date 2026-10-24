import type { Employee, EmployeeInput } from '../domain/employee.js';

export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  create(input: EmployeeInput): Promise<Employee>;
  update(id: string, input: EmployeeInput): Promise<Employee | null>;
  delete(id: string): Promise<boolean>;
}
