import { Controller, Get, Injectable, Module, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { SrsState } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

// TOEIC: LC = Part 1–4 (듣기), RC = Part 5–7 (독해).
const isLc = (part: string) => ["P1", "P2", "P3", "P4"].includes(part);

@Injectable()
class MeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 취약유형(LC/RC) 분석 — 사용자 progress 를 파트별로 집계해 정답률/약점 비중을 계산.
   * 미학습(progress 0) 이면 tested=false → 앱은 "테스트 후 확인" 안내를 표시.
   */
  async analysis(userId: string) {
    const rows = await this.prisma.progress.findMany({
      where: { userId },
      select: {
        state: true,
        correctCount: true,
        wrongCount: true,
        word: { select: { part: true } },
      },
    });

    const acc = {
      lc: { correct: 0, wrong: 0 },
      rc: { correct: 0, wrong: 0 },
      mastered: 0,
      total: rows.length,
    };
    for (const r of rows) {
      const bucket = isLc(r.word.part) ? acc.lc : acc.rc;
      bucket.correct += r.correctCount;
      bucket.wrong += r.wrongCount;
      if (r.state === SrsState.mastered) acc.mastered += 1;
    }

    const tested = acc.total > 0;
    const masteredFraction = acc.total ? acc.mastered / acc.total : 0;
    const avgScore = tested ? Math.round(990 * masteredFraction) : 0;

    const target = await this.prisma.curriculum.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { dailyTarget: true },
    });

    // LC/RC 정답·오답 4분할 — 한 영역만 학습해도 도넛이 여러 색으로 의미있게 표시됨.
    // (이전엔 오답 비중만 → 한 영역만 틀리면 단색 풀링으로 보임)
    const segments = [
      { label: "LC 오답", value: acc.lc.wrong, color: "#ec7d7d" },
      { label: "LC 정답", value: acc.lc.correct, color: "#6fc18e" },
      { label: "RC 오답", value: acc.rc.wrong, color: "#e0a13c" },
      { label: "RC 정답", value: acc.rc.correct, color: "#6e9bd6" },
    ].filter((s) => s.value > 0);

    return {
      avgScore,
      targetScore: 900,
      tested,
      segments,
      // 추가 통계 — 앱이 동기화해 복습/분석 결과 공유에 사용.
      detail: {
        total: acc.total,
        mastered: acc.mastered,
        lc: acc.lc,
        rc: acc.rc,
        lcAccuracy: pct(acc.lc),
        rcAccuracy: pct(acc.rc),
      },
    };
  }
}

function pct(b: { correct: number; wrong: number }) {
  const t = b.correct + b.wrong;
  return t ? Math.round((100 * b.correct) / t) : 0;
}

@ApiBearerAuth()
@ApiTags("me")
@UseGuards(AuthGuard("jwt"))
@Controller("me")
class MeController {
  constructor(private readonly svc: MeService) {}

  @Get("analysis")
  analysis(@Req() req: any) {
    return this.svc.analysis(req.user.sub);
  }
}

@Module({
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
