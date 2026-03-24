import { RefreshToken } from '../../domain/entities/refresh-token';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';

export class RefreshTokenMapper {
  static toDomain(orm: RefreshTokenOrmEntity): RefreshToken {
    return new RefreshToken(
      orm.id,
      orm.userId,
      orm.tokenHash,
      orm.expiresAt,
      orm.revokedAt,
      orm.createdAt,
    );
  }

  static toOrm(domain: RefreshToken): RefreshTokenOrmEntity {
    const orm = new RefreshTokenOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.tokenHash = domain.tokenHash;
    orm.expiresAt = domain.expiresAt;
    orm.revokedAt = domain.revokedAt;
    orm.createdAt = domain.createdAt;
    return orm;
  }
}
