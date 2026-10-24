import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { loginDto } from '../dtos/auth.dto.js';
import { MongooseAuthRepository } from '../repositories/mongoose-auth.repository.js';

// La contraseña se recibe por entorno para evitar guardarla en el historial del comando.
try {
  const credentials = loginDto.parse({ email: process.argv[2], password: process.env['USER_PASSWORD'] });
  await connectDatabase();
  const repository = new MongooseAuthRepository();
  if (await repository.findByEmail(credentials.email)) throw new Error('El correo ya esta registrado');
  await repository.createUser({
    email: credentials.email, password: await bcrypt.hash(credentials.password, 12), rol: 'alumno',
  });
  console.log('Usuario creado');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo crear el usuario');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
