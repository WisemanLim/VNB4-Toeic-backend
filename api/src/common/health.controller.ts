import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db = "down";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = "up";
    } catch {}
    return { status: "ok", db, version: process.env.APP_VERSION ?? "0.1.0", ts: Date.now() };
  }
}
