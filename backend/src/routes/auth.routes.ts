import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { IAuthRepository } from '../domain/user.js';
import { loginDto } from '../dtos/auth.dto.js';
import { HttpError, success } from '../http/response.js';

export function createAuthRouter(repository: IAuthRepository, secret: string) {
  const router = Router();
  router.post('/login', async (req, res) => {
    const { email, password } = loginDto.parse(req.body);
    const user = await repository.findByEmail(email);
    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new HttpError(401, 'AUTH_FAILED', 'Credenciales invalidas');
    }
    const token = jwt.sign({ id: user._id, rol: user.rol }, secret, { algorithm: 'HS256', expiresIn: '2h' });
    res.set('Cache-Control', 'no-store');
    res.json(success({ token, user: { email: user.email, rol: user.rol } }));
  });
  return router;
}
