import { UserRole } from '@ghost-pro-academy/shared';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly username: string,
    public readonly password: string,
    public readonly role: UserRole,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}
}
