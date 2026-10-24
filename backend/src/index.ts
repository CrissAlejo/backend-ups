import 'dotenv/config';
import { getJwtSecret } from './config/auth.js';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { MongooseEmployeeRepository } from './repositories/mongoose-employee.repository.js';

getJwtSecret();
await connectDatabase();
const port = Number(process.env['PORT'] ?? 3000);
const app = createApp(new MongooseEmployeeRepository());
app.listen(port, () => console.log(`Servidor escuchando en el puerto ${port}`));
