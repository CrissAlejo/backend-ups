export interface EmployeeInput {
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
}

export interface Employee extends EmployeeInput {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}
