import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './docs/openapi.js';
import type { IEmployeeRepository } from './repositories/employee.repository.js';
import { createEmployeeRouter } from './routes/empleados.routes.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { getJwtSecret } from './config/auth.js';
import type { IAuthRepository } from './domain/user.js';
import { MongooseAuthRepository } from './repositories/mongoose-auth.repository.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAuthenticateJWT } from './middleware/auth.middleware.js';

export function createApp(repository: IEmployeeRepository, authRepository: IAuthRepository = new MongooseAuthRepository()) {
  const secret = getJwtSecret();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));
  app.get('/api/docs.json', (_req, res) => { res.json(openApiDocument); });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Documentacion API de empleados',
    swaggerOptions: { validatorUrl: null },
  }));
  app.use('/api/auth', createAuthRouter(authRepository, secret));
  app.use('/api', createEmployeeRouter(repository, createAuthenticateJWT(secret)));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
