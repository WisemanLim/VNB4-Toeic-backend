import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { EmailLoginDto, EmailSignupDto } from "./dto/email.dto";
import { Provider } from "@prisma/client";
import { Request } from "express";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("signup/email")
  signup(@Body() dto: EmailSignupDto) {
    return this.auth.signupEmail(dto.email, dto.password, dto.name);
  }

  @Post("login/email")
  login(@Body() dto: EmailLoginDto) {
    return this.auth.loginEmail(dto.email, dto.password);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  google() {
    // passport-google-oauth20 redirects
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  googleCallback(@Req() req: Request & { user: any }) {
    const u = req.user;
    return this.auth.oauthUpsert({
      provider: Provider.google,
      providerId: u.id,
      email: u.email,
      name: u.displayName,
      avatarUrl: u.photo,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"))
  @Get("me")
  me(@Req() req: Request & { user: { sub: string; role: string } }) {
    return { id: req.user.sub, role: req.user.role };
  }
}
