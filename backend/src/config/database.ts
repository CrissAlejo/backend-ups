// src/config/database.ts
import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  const MONGO_URI = process.env['MONGO_URI'];
  if (!MONGO_URI?.trim()) {
    throw new Error('La variable de entorno MONGO_URI es obligatoria');
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔄 [Database]: Conexión exitosa a MongoDB');
  } catch (error) {
    console.error('❌ Error crítico al conectar a la base de datos:', error);
    process.exit(1);
  }
};
    