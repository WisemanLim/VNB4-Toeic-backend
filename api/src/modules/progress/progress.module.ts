import { Body, Controller, Get, Module, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { SrsState } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * SM-2 algorithm (SuperMemo 2) — public domain.
 * grade: 0-5. <3 = lapse.
 */
function sm2(grade: number, ease: number, repetitions: number, interval: number) {
  let newEase = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (newEase < 1.3) newEase = 1.3;

  let newRep = repetitions;
  let newInterval = interval;
  if (grade < 3) {
    newRep = 0;
    newInterval = 1;
  } else {
    newRep += 1;
    if (newRep === 1) newInterval = 1;
    else if (newRep === 2) newInterval = 6;
    else newInterval = Math.round(interval * newEase);
  }
  return { ease: newEase, repetitions: newRep, intervalDays: newInterval };
}

class GradeDto {
  @IsString() wordId!: string;
  @IsInt() @Min(0) @Max(5) grade!: number;
  @IsOptional() @IsString() lessonId?: string;
}

class DueQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

@Injectable()
class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  due(userId: string, limit = 30) {
    return this.prisma.progress.findMany({
      where: { userId, dueAt: { lte: new Date() } },
      orderBy: [{ dueAt: "asc" }],
      take: limit,
      include: { word: { include: { audio: true } } },
    });
  }

  async grade(userId: string, dto: GradeDto) {
    const existing = await this.prisma.progress.findUnique({
      where: { userId_wordId: { userId, wordId: dto.wordId } },
    });
    const cur = existing ?? {
      easeFactor: 2.5,
      repetitions: 0,
      intervalDays: 0,
      lapses: 0,
      correctCount: 0,
      wrongCount: 0,
    };

    const next = sm2(dto.grade, cur.easeFactor, cur.repetitions, cur.intervalDays);
    const dueAt = new Date(Date.now() + next.intervalDays * 24 * 3600 * 1000);
    const state: SrsState =
      next.repetitions === 0 ? SrsState.learning : next.intervalDays >= 21 ? SrsState.mastered : SrsState.review;

    return this.prisma.progress.upsert({
      where: { userId_wordId: { userId, wordId: dto.wordId } },
      update: {
        state,
        easeFactor: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lastReview: new Date(),
        dueAt,
        lapses: dto.grade < 3 ? cur.lapses + 1 : cur.lapses,
        correctCount: dto.grade >= 3 ? cur.correctCount + 1 : cur.correctCount,
        wrongCount: dto.grade < 3 ? cur.wrongCount + 1 : cur.wrongCount,
        lessonId: dto.lessonId,
      },
      create: {
        userId,
        wordId: dto.wordId,
        lessonId: dto.lessonId,
        state,
        easeFactor: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lastReview: new Date(),
        dueAt,
        correctCount: dto.grade >= 3 ? 1 : 0,
        wrongCount: dto.grade < 3 ? 1 : 0,
      },
    });
  }

  stats(userId: string) {
    return this.prisma.progress.groupBy({
      by: ["state"],
      where: { userId },
      _count: { _all: true },
    });
  }
}

@ApiBearerAuth()
@ApiTags("progress")
@UseGuards(AuthGuard("jwt"))
@Controller("progress")
class ProgressController {
  constructor(private readonly svc: ProgressService) {}

  @Get("due")
  due(@Req() req: any, @Query() q: DueQuery) {
    return this.svc.due(req.user.sub, q.limit);
  }

  @Post("grade")
  grade(@Req() req: any, @Body() dto: GradeDto) {
    return this.svc.grade(req.user.sub, dto);
  }

  @Get("stats")
  stats(@Req() req: any) {
    return this.svc.stats(req.user.sub);
  }
}

@Module({
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
