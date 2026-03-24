import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { UsersService } from '../../../users/application/users.service';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class RefreshUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(rawRefreshToken: string) {
    const tokenHash = createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt !== null) {
      await this.refreshTokenRepository.revokeAllForUser(stored.userId);
      throw new UnauthorizedException('Refresh token already used');
    }

    if (stored.expiresAt < new Date()) {
      await this.refreshTokenRepository.revoke(stored.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.refreshTokenRepository.revoke(stored.id);

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new UnauthorizedException();

    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });

    const newRawRefreshToken = randomUUID();
    const newTokenHash = createHash('sha256')
      .update(newRawRefreshToken)
      .digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken: newRawRefreshToken };
  }
}
