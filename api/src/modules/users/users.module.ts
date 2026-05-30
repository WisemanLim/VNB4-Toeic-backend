import { Controller, Get, Injectable, Module, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";

const USER_SELECT = {
  id: true, email: true, name: true, avatarUrl: true,
  role: true, locale: true, emailVerified: true, createdAt: true,
} as const;

class ListUsersQuery {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}

@Injectable()
class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  }

  /** Admin user list with optional search/role filter + cursor pagination. */
  async list(q: ListUsersQuery) {
    const take = Math.min(q.limit ?? 20, 100);
    const role = q.role && (q.role as Role) in Role ? (q.role as Role) : undefined;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(q.search
        ? { OR: [{ email: { contains: q.search, mode: "insensitive" } }, { name: { contains: q.search, mode: "insensitive" } }] }
        : {}),
    };
    const items = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip: q.cursor ? 1 : 0,
      cursor: q.cursor ? { id: q.cursor } : undefined,
      select: USER_SELECT,
    });
    return { items, nextCursor: items.length === take ? items[items.length - 1].id : null };
  }

  /** Totals for the admin dashboard: overall + per-role counts. */
  async stats() {
    const total = await this.prisma.user.count({ where: { deletedAt: null } });
    const groups = await this.prisma.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const byRole: Record<string, number> = {};
    for (const g of groups) byRole[g.role] = g._count._all;
    return { total, byRole };
  }
}

@ApiBearerAuth()
@ApiTags("users")
@UseGuards(AuthGuard("jwt"))
@Controller("users")
class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get("me")
  me(@Req() req: any) {
    return this.svc.me(req.user.sub);
  }

  // Declared before any ":id" route would be; admin-only listing for the console.
  @UseGuards(RolesGuard)
  @Roles("admin")
  @Get("stats")
  stats() {
    return this.svc.stats();
  }

  @UseGuards(RolesGuard)
  @Roles("admin")
  @Get()
  list(@Query() q: ListUsersQuery) {
    return this.svc.list(q);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
