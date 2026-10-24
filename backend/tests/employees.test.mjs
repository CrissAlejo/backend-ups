import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../dist/app.js';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
const token = jwt.sign({ id: 'test-user', rol: 'alumno' }, process.env.JWT_SECRET, { expiresIn: '2h' });

const id = '507f1f77bcf86cd799439011';
const input = { nombre: 'Ana Perez', cargo: 'Desarrollo', departamento: 'TI', sueldo: 1000 };
let rows = [];
let writes = 0;
let fail = false;
const repository = {
  async findAll() {
    if (fail) throw new Error('secreto de persistencia');
    return rows;
  },
  async create(data) {
    writes++;
    const employee = { ...data, _id: id };
    rows = [...rows, employee];
    return employee;
  },
  async update(key, data) {
    writes++;
    if (!rows.some(row => row._id === key)) return null;
    const employee = { ...data, _id: key };
    rows = rows.map(row => row._id === key ? employee : row);
    return employee;
  },
  async delete(key) {
    writes++;
    const exists = rows.some(row => row._id === key);
    rows = rows.filter(row => row._id !== key);
    return exists;
  },
};
let server;
let base;
before(async () => {
  server = createApp(repository).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

test('Swagger sirve interfaz, recursos y contrato con DTO actuales', async () => {
  const previous = writes;
  const ui = await fetch(base + '/api/docs/');
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /swagger-ui/);
  const asset = await fetch(base + '/api/docs/swagger-ui.css');
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /css/);
  const spec = await request('/api/docs.json');
  assert.equal(spec.status, 200);
  assert.equal(spec.body.openapi, '3.1.0');
  assert.equal(spec.body.servers[0].url, '/api');
  assert.ok(spec.body.paths['/empleados'].post.responses['201']);
  assert.ok(spec.body.paths['/empleados/{id}'].put.responses['404']);
  assert.ok(spec.body.paths['/empleados/{id}'].delete.responses['200']);
  const schema = spec.body.components.schemas.EmployeeInput;
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.nombre.minLength, 3);
  assert.equal(schema.properties.nombre.maxLength, 150);
  assert.equal(schema.properties.sueldo.minimum, 0);
  assert.equal(writes, previous);
});

test('CRUD funciona con un repositorio inyectado sin MongoDB', async () => {
  const created = await request('/api/empleados', 'POST', input);
  assert.equal(created.status, 201);
  assert.equal(created.body.success, true);
  assert.deepEqual(created.body.errors, []);
  assert.equal(created.body.data._id, id);
  assert.equal((await request('/api/empleados')).body.data.length, 1);
  const updated = await request(`/api/empleados/${id}`, 'PUT', { ...input, sueldo: 2000 });
  assert.equal(updated.body.data.sueldo, 2000);
  assert.equal((await request(`/api/empleados/${id}`, 'DELETE')).status, 200);
  assert.deepEqual((await request('/api/empleados')).body.data, []);
});

test('DTO rechaza datos invalidos antes de llamar al repositorio', async () => {
  const previous = writes;
  for (const data of [ {}, { ...input, nombre: 'An' }, { ...input, sueldo: -1 },
    { ...input, sueldo: '1000' }, { ...input, administrador: true } ]) {
    const result = await request('/api/empleados', 'POST', data);
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    assert.equal(result.body.data, null);
    assert.ok(result.body.errors.length);
  }
  assert.equal(writes, previous);
});

test('DTO valida params y cuerpo de actualizacion antes de persistir', async () => {
  const previous = writes;
  assert.equal((await request('/api/empleados/invalido', 'PUT', input)).status, 400);
  assert.equal((await request('/api/empleados/invalido', 'DELETE')).status, 400);
  assert.equal((await request(`/api/empleados/${id}`, 'PUT', { ...input, sueldo: -1 })).status, 400);
  assert.equal(writes, previous);
});

test('empleado inexistente devuelve 404 uniforme', async () => {
  assert.equal((await request(`/api/empleados/${id}`, 'PUT', input)).status, 404);
  const result = await request(`/api/empleados/${id}`, 'DELETE');
  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
});

test('errores internos no exponen detalles del repositorio', async () => {
  fail = true;
  try {
    const result = await request('/api/empleados');
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, {
      success: false, data: null, message: 'Error interno del servidor', errors: [],
    });
  } finally { fail = false; }
});

test('JSON malformado y rutas desconocidas usan el mismo wrapper', async () => {
  const response = await fetch(base + '/api/empleados', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
  const result = await request('/no-existe');
  assert.equal(result.status, 404);
  assert.equal(result.body.success, false);
});
