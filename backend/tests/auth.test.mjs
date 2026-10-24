import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/app.js';

const secret = 'auth-test-secret-with-at-least-32-characters';
process.env.JWT_SECRET = secret;
let writes = 0;
let reads = 0;
let server;
let base;
const credentials = { email: 'ana@example.com', password: 'clave-segura' };
before(async () => {
  const user = { _id: 'user-id', ...credentials, password: await bcrypt.hash(credentials.password, 4), rol: 'alumno' };
  const auth = {
    async findByEmail(email) { reads++; return email === user.email ? user : null; },
    async createUser() { throw new Error('No usado'); },
  };
  const employees = {
    async findAll() { return []; },
    async create(data) { writes++; return { ...data, _id: '507f1f77bcf86cd799439011' }; },
    async update() { writes++; return null; },
    async delete() { writes++; return false; },
  };
  server = createApp(employees, auth).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
const login = body => fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('DTO rechaza credenciales invalidas antes del repositorio', async () => {
  const previous = reads;
  for (const data of [{}, { ...credentials, email: 'invalido' }, { ...credentials, password: '123' },
    { ...credentials, password: 'ñ'.repeat(37) }, { ...credentials, rol: 'admin' }]) {
    const response = await login(data);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).errors.length);
  }
  assert.equal(reads, previous);
});
test('credenciales incorrectas usan un error uniforme sin revelar usuarios', async () => {
  const responses = [];
  for (const data of [{ ...credentials, email: 'otro@example.com' }, { ...credentials, password: 'incorrecta' }]) {
    const response = await login(data);
    assert.equal(response.status, 401);
    responses.push(await response.json());
  }
  assert.deepEqual(responses[0], responses[1]);
});
test('login firma JWT de dos horas y permite escribir sin exponer hash', async () => {
  const response = await login({ ...credentials, email: ' ANA@example.com ' });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes('password'), false);
  const payload = jwt.verify(body.data.token, secret);
  assert.equal(payload.id, 'user-id');
  assert.equal(payload.rol, 'alumno');
  assert.equal(payload.exp - payload.iat, 7200);
  const result = await fetch(base + '/api/empleados', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.data.token}` },
    body: JSON.stringify({ nombre: 'Ana Perez', cargo: 'Desarrollo', departamento: 'TI', sueldo: 1000 }),
  });
  assert.equal(result.status, 201);
});
test('todas las escrituras bloquean tokens ausentes, falsos, vencidos y payloads invalidos', async () => {
  const previous = writes;
  const cases = [
    [undefined, 401], ['Basic abc', 401], ['Bearer falso', 403],
    [`Bearer ${jwt.sign({ id: 'u', rol: 'alumno' }, 'otra-clave', { expiresIn: '2h' })}`, 403],
    [`Bearer ${jwt.sign({ id: 'u', rol: 'alumno' }, secret, { expiresIn: -1 })}`, 403],
    [`Bearer ${jwt.sign({ id: 'u' }, secret, { expiresIn: '2h' })}`, 403],
    [`Bearer ${jwt.sign({ id: 'u', rol: 'alumno' }, secret)}`, 403],
  ];
  for (const method of ['POST', 'PUT', 'DELETE']) {
    for (const [authorization, status] of cases) {
      const path = method === 'POST' ? '/api/empleados' : '/api/empleados/507f1f77bcf86cd799439011';
      const response = await fetch(base + path, { method, headers: authorization ? { Authorization: authorization } : {} });
      assert.equal(response.status, status);
      assert.equal((await response.json()).success, false);
    }
  }
  assert.equal(writes, previous);
  assert.equal((await fetch(base + '/api/empleados')).status, 200);
});
test('configuracion exige un secreto sin valor por defecto', () => {
  delete process.env.JWT_SECRET;
  try { assert.throws(() => createApp({})); }
  finally { process.env.JWT_SECRET = secret; }
});
