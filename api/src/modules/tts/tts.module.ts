import { Body, Controller, Get, Injectable, Module, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { BullModule, InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { JobKind, JobStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";

export const TTS_QUEUE = "tts";

enum TtsLocale { US = "en-US", GB = "en-GB", AU = "en-AU" }
enum TtsProviderEnum { azure = "azure", polly = "polly", google = "google", piper = "piper" }

class TtsBatchDto {
  @IsArray() @IsString({ each: true }) wordIds!: string[];
  @IsArray() @IsEnum(TtsLocale, { each: true }) locales!: TtsLocale[];
  @IsOptional() @IsEnum(TtsProviderEnum) provider?: TtsProviderEnum;
}

class ListJobsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

@Injectable()
class TtsService {
  constructor(
    @InjectQueue(TTS_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async enqueueBatch(dto: TtsBatchDto, requestedBy: string) {
    const provider = dto.provider ?? "azure";
    // Durable record of the batch (the BullMQ jobs are ephemeral); the admin
    // console reads these rows back via GET /tts/jobs.
    const job = await this.prisma.job.create({
      data: {
        kind: JobKind.tts_batch,
        status: JobStatus.queued,
        payload: { wordIds: dto.wordIds, locales: dto.locales, provider, requestedBy },
      },
    });
    const enqueued = await Promise.all(
      dto.wordIds.flatMap((wordId) =>
        dto.locales.map((locale) =>
          this.queue.add(
            "tts.generate",
            { wordId, locale, provider, requestedBy, jobId: job.id },
            { attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
          ),
        ),
      ),
    );
    return { jobId: job.id, enqueued: enqueued.length };
  }

  /** Recent batch records + live BullMQ queue counts for the admin console. */
  async jobs(q: ListJobsQuery) {
    const take = Math.min(q.limit ?? 20, 100);
    const items = await this.prisma.job.findMany({
      where: { kind: JobKind.tts_batch },
      orderBy: { createdAt: "desc" },
      take,
    });
    const counts = await this.queue.getJobCounts(
      "waiting", "active", "completed", "failed", "delayed",
    );
    return { items, counts };
  }
}

@ApiBearerAuth()
@ApiTags("tts")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("tts")
class TtsController {
  constructor(private readonly svc: TtsService) {}

  @Roles("admin", "editor")
  @Post("batch")
  batch(@Body() dto: TtsBatchDto) {
    return this.svc.enqueueBatch(dto, "admin");
  }

  @Roles("admin", "editor")
  @Get("jobs")
  jobs(@Query() q: ListJobsQuery) {
    return this.svc.jobs(q);
  }
}

@Module({
  imports: [BullModule.registerQueue({ name: TTS_QUEUE })],
  controllers: [TtsController],
  providers: [TtsService],
})
export class TtsModule {}
