import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";

@Module({
  imports: [
    PassportModule,
    // registerAsync so the factory runs at DI time — AFTER ConfigModule.forRoot
    // has loaded .env/.env.local into process.env. With the sync register(),
    // `process.env.JWT_SECRET` was read at import time (still undefined) and fell
    // back to the dev secret, while JwtStrategy (constructed later) read the real
    // secret → every token failed verification (401). Both sides now agree.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "1h" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
