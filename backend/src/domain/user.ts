export interface User {
  _id: string;
  email: string;
  password: string;
  rol: string;
}
export interface IAuthRepository {
  findByEmail(email: string): Promise<User | null>;
  createUser(data: Omit<User, '_id'>): Promise<User>;
}
