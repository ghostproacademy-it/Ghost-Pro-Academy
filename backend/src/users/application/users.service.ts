import { Injectable } from '@nestjs/common';
import { User } from '../domain/entities/user';
import {
  CreateUserData,
  IUsersRepository,
} from '../domain/repositories/users.repository.interface';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async create(data: CreateUserData): Promise<User> {
    return this.usersRepository.create(data);
  }
}
