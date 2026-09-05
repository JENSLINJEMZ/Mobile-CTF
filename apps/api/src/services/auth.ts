import { prisma } from '@ctf/database';
import type {
  AuthResponse,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutResponse,
  RegisterRequest,
  ResetPasswordResponse,
  UserDto,
} from '@ctf/shared';
import type { Role } from '@ctf/shared';
import type { User } from '@prisma/client';

import { env } from '../config/env';
import { ApiError } from '../middleware/errors';
import { signAccessToken } from '../utils/jwt';
import {
  generateOpaqueToken,
  hashPassword,
  sha256,
  verifyPassword,
  verifyPasswordAgainstDummy,
} from '../utils/password';

const INVALID_CREDENTIALS = new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password');
const INVALID_SESSION = new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired session');
const INVALID_RESET_TOKEN = new ApiError(400, 'VALIDATION_ERROR', 'Invalid or expired reset token');

export function toUserDto(user: Pick<User, 'id' | 'email' | 'username' | 'role' | 'createdAt'>): UserDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role as Role,
    createdAt: user.createdAt.toISOString(),
  };
}

function sessionExpiryDate(): Date {
  return new Date(Date.now() + env.refreshTtlSeconds * 1000);
}

export class AuthService {
  private async createAuthenticatedSession(user: User): Promise<AuthResponse> {
    const { accessToken, expiresIn } = signAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as Role,
    });
    const refreshToken = generateOpaqueToken();
    const refreshTokenHash = sha256(refreshToken);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt: sessionExpiryDate(),
      },
    });

    return {
      user: toUserDto(user),
      tokens: { accessToken, refreshToken, expiresIn },
    };
  }

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: input.username }] },
    });
    if (existing) {
      throw new ApiError(
        409,
        'CONFLICT',
        existing.email === email ? 'Email is already registered' : 'Username is already taken',
      );
    }
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({ data: { email, username: input.username, passwordHash } });
    return this.createAuthenticatedSession(user);
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !user.isActive) {
      await verifyPasswordAgainstDummy(input.password);
      throw INVALID_CREDENTIALS;
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw INVALID_CREDENTIALS;
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.createAuthenticatedSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: sha256(refreshToken) },
    });
    if (!session || session.revoked) {
      throw INVALID_SESSION;
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw INVALID_SESSION;
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) {
      throw INVALID_SESSION;
    }

    await prisma.session.update({ where: { id: session.id }, data: { revoked: true } });
    return this.createAuthenticatedSession(user);
  }

  async logout(refreshToken: string): Promise<LogoutResponse> {
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: sha256(refreshToken) },
    });
    if (!session || session.revoked) {
      throw INVALID_SESSION;
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw INVALID_SESSION;
    }
    await prisma.session.update({ where: { id: session.id }, data: { revoked: true } });
    return { ok: true };
  }

  async logoutAll(userId: number): Promise<LogoutResponse> {
    await prisma.session.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return { ok: true };
  }

  async me(userId: number): Promise<UserDto> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw INVALID_SESSION;
    }
    return toUserDto(user);
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const token = generateOpaqueToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + env.passwordResetTtlSeconds * 1000),
        },
      });
      if (!env.isProd) {
        return { ok: true, devResetLink: `/api/auth/reset-password?token=${token}` };
      }
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record) {
      throw INVALID_RESET_TOKEN;
    }
    const newHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newHash, passwordChangedAt: new Date() },
      }),
      prisma.session.updateMany({ where: { userId: record.userId }, data: { revoked: true } }),
    ]);
    return { ok: true };
  }
}

export const authService = new AuthService();