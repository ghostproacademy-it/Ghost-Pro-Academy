import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../../users/application/users.service';
import { RegisterDto } from '../../presentation/dto/register.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class RegisterUseCase {
  constructor(private readonly usersService: UsersService) {}

  async execute(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      password: passwordHash,
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
  }
}
