import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { WordsModule } from "./modules/words/words.module";
import { LessonsModule } from "./modules/lessons/lessons.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { SentencesModule } from "./modules/sentences/sentences.module";
import { TtsModule } from "./modules/tts/tts.module";
import { MeModule } from "./modules/me/me.module";
import { HealthController } from "./common/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", ".env.local"] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WordsModule,
    LessonsModule,
    ProgressModule,
    SentencesModule,
    TtsModule,
    MeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
