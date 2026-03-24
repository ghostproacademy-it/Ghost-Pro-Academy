import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(rawRefreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (stored && stored.revokedAt === null) {
      await this.refreshTokenRepository.revoke(stored.id);
    }
  }
}
