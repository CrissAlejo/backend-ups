import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import jwt from 'jsonwebtoken';
import type { Employee, EmployeeInput } from '../src/domain/employee.js';
import type { IEmployeeRepository } from '../src/repositories/employee.repository.js';

class MemoryRepository implements IEmployeeRepository {
  employees: Employee[] = [];
  fail = false;
  async findAll() {
    if (this.fail) throw new Error('private database connection details');
    return [...this.employees];
  }
  async create(input: EmployeeInput) {
    const employee = { ...input, _id: '0123456789abcdef01234567' };
    this.employees = [...this.employees, employee];
    return employee;
  }
  async update(id: string, input: EmployeeInput) {
    if (!this.employees.some(employee => employee._id === id)) return null;
    const updated = { ...input, _id: id };
    this.employees = this.employees.map(employee => employee._id === id ? updated : employee);
    return updated;
  }
  async delete(id: string) {
    const found = this.employees.find(employee => employee._id === id) ?? null;
    this.employees = this.employees.filter(employee => employee._id !== id);
    return found !== null;
  }
}
const repository = new MemoryRepository();
process.env['JWT_SECRET'] = 'test-only-secret-with-at-least-32-characters';
const token = jwt.sign({ id: 'test-user', rol: 'alumno' }, process.env['JWT_SECRET'], { expiresIn: '2h' });
let server: Server;
let base: string;
const input = { nombre: 'Ana', cargo: 'Ingeniera', departamento: 'TI', sueldo: 1000 };
before(async () => {
  server = createApp(repository).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}/api/empleados`;
});
after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
const send = (method: string, path = '', body?: unknown) => fetch(base + path, {
  method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('CRUD HTTP funciona con repositorio en memoria, sin MongoDB', async () => {
  const created = await send('POST', '', input);
  assert.equal(created.status, 201);
  const payload = await created.json();
  assert.equal(payload.success, true);
  assert.deepEqual(payload.errors, []);
  const id = payload.data._id;
  assert.equal((await (await send('GET')).json()).data.length, 1);
  const updated = await send('PUT', `/${id}`, { ...input, sueldo: 1500 });
  assert.equal((await updated.json()).data.sueldo, 1500);
  assert.equal((await send('DELETE', `/${id}`)).status, 200);
  assert.equal((await send('DELETE', `/${id}`)).status, 404);
});
test('DTO rechaza tipos, campos extra, espacios, sueldos negativos e IDs inválidos', async () => {
  for (const body of [{ ...input, sueldo: '100' }, { ...input, sueldo: -1 }, { ...input, nombre: '  ' }, { ...input, admin: true }, {}]) {
    const response = await send('POST', '', body);
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.data, null);
    assert(payload.errors.length > 0);
  }
  assert.equal((await send('DELETE', '/invalid')).status, 400);
  assert.equal((await send('PUT', '/invalid', input)).status, 400);
});
test('JSON inválido y rutas inexistentes usan el mismo wrapper', async () => {
  const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
  const missing = await fetch(base + '/no/existe');
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).success, false);
});
test('fallos internos no exponen detalles del repositorio', async () => {
  repository.fail = true;
  try {
    const response = await send('GET');
    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(payload.message, 'Error interno del servidor');
    assert(!JSON.stringify(payload).includes('private database'));
  } finally { repository.fail = false; }
});
