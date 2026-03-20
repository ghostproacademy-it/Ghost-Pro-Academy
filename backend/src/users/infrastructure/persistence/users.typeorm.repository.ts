import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user';
import {
  CreateUserData,
  IUsersRepository,
} from '../../domain/repositories/users.repository.interface';
import { UserMapper } from './user.mapper';
import { UserOrmEntity } from './user.orm-entity';

@Injectable()
export class UsersTypeOrmRepository implements IUsersRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const orm = await this.repo.findOne({ where: { email } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async findById(id: string): Promise<User | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const orm = this.repo.create(data);
    const saved = await this.repo.save(orm);
    return UserMapper.toDomain(saved);
  }
}
