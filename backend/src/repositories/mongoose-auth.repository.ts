import type { IAuthRepository, User } from '../domain/user.js';
import { UserModel } from '../models/user.model.js';

export class MongooseAuthRepository implements IAuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email }).select('+password').exec();
    return user ? { _id: user.id, email: user.email, password: user.password, rol: user.rol } : null;
  }

  async createUser(data: Omit<User, '_id'>): Promise<User> {
    const user = await UserModel.create(data);
    return { _id: user.id, email: user.email, password: user.password, rol: user.rol };
  }
}
