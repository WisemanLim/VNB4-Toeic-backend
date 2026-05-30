import { Module } from "@nestjs/common";
import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { Injectable, NotFoundException } from "@nestjs/common";
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { Part } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";

const PART_MAP: Record<number, Part> = {
  1: Part.P1, 2: Part.P2, 3: Part.P3, 4: Part.P4, 5: Part.P5, 6: Part.P6, 7: Part.P7,
};

class CreateLessonDto {
  @IsInt() @Min(1) @Max(7) part!: number;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() orderIndex?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) wordIds?: string[];
}

class ListLessonsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(7) part?: number;
}

@Injectable()
class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  list(q: ListLessonsQuery) {
    return this.prisma.lesson.findMany({
      where: q.part ? { part: PART_MAP[q.part] } : undefined,
      orderBy: [{ part: "asc" }, { orderIndex: "asc" }],
      include: { words: { include: { word: true }, orderBy: { position: "asc" } } },
    });
  }

  async get(id: string) {
    const l = await this.prisma.lesson.findUnique({
      where: { id },
      include: { words: { include: { word: { include: { audio: true } } }, orderBy: { position: "asc" } } },
    });
    if (!l) throw new NotFoundException("lesson not found");
    return l;
  }

  async create(dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: {
        part: PART_MAP[dto.part],
        title: dto.title,
        description: dto.description,
        orderIndex: dto.orderIndex ?? 0,
        words: dto.wordIds
          ? { create: dto.wordIds.map((wid, i) => ({ wordId: wid, position: i })) }
          : undefined,
      },
    });
  }
}

@ApiTags("lessons")
@Controller("lessons")
class LessonsController {
  constructor(private readonly svc: LessonsService) {}

  @Get() list(@Query() q: ListLessonsQuery) { return this.svc.list(q); }
  @Get(":id") get(@Param("id") id: string) { return this.svc.get(id); }

  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "editor")
  @Post()
  create(@Body() dto: CreateLessonDto) { return this.svc.create(dto); }
}

@Module({
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
