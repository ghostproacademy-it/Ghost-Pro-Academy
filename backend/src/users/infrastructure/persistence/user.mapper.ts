import { User } from '../../domain/entities/user';
import { UserOrmEntity } from './user.orm-entity';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return new User(
      orm.id,
      orm.email,
      orm.username,
      orm.password,
      orm.role,
      orm.createdAt,
      orm.updatedAt,
      orm.deletedAt,
    );
  }

  static toOrm(domain: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = domain.id;
    orm.email = domain.email;
    orm.username = domain.username;
    orm.password = domain.password;
    orm.role = domain.role;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    orm.deletedAt = domain.deletedAt;
    return orm;
  }
}
