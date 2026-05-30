import { Injectable, Logger, OnApplicationBootstrap, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Provider, Role, User } from "@prisma/client";

interface OAuthProfile {
  provider: Provider;
  providerId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Ensure the default admin account exists (config-driven via ops/env:
   * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME).
   * Create-if-absent; never overwrites an existing password (so an operator's
   * later password change survives reboots). Promotes role to admin if needed.
   * No-op when SEED_ADMIN_PASSWORD is unset.
   */
  async onApplicationBootstrap() {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) return;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== Role.admin) {
        await this.prisma.user.update({ where: { email }, data: { role: Role.admin } });
        this.logger.log(`default admin promoted to admin: ${email}`);
      }
      return;
    }
    await this.prisma.user.create({
      data: {
        email,
        name: process.env.SEED_ADMIN_NAME ?? "Administrator",
        role: Role.admin,
        passwordHash: await argon2.hash(password),
        emailVerified: new Date(),
      },
    });
    this.logger.log(`default admin created: ${email}`);
  }

  async signupEmail(email: string, password: string, name?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException("email already registered");
    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    });
    return this.issueTokens(user);
  }

  async loginEmail(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) throw new UnauthorizedException("invalid credentials");
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException("invalid credentials");
    return this.issueTokens(user);
  }

  async oauthUpsert(profile: OAuthProfile) {
    let identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } },
      include: { user: true },
    });
    if (identity) return this.issueTokens(identity.user);

    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          emailVerified: new Date(),
        },
      });
    }
    await this.prisma.authIdentity.create({
      data: { userId: user.id, provider: profile.provider, providerId: profile.providerId },
    });
    return this.issueTokens(user);
  }

  private async issueTokens(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, type: "refresh" },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d" },
    );
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, name: user.name } };
  }
}
