import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile, VerifyCallback } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || "stub-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "stub-client-secret",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/v1/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    done(null, {
      id: profile.id,
      email: profile.emails?.[0]?.value ?? "",
      displayName: profile.displayName,
      photo: profile.photos?.[0]?.value,
    });
  }
}
