import { User } from '../entities/user';

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
}

export abstract class IUsersRepository {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(data: CreateUserData): Promise<User>;
}
