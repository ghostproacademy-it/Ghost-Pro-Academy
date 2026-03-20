import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './application/users.service';
import { IUsersRepository } from './domain/repositories/users.repository.interface';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { UsersTypeOrmRepository } from './infrastructure/persistence/users.typeorm.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  providers: [
    UsersService,
    {
      provide: IUsersRepository,
      useClass: UsersTypeOrmRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
