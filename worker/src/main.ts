import "dotenv/config";
import { Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import { PrismaClient } from "@prisma/client";
import { handleTtsGenerate } from "./jobs/tts.job";

const logger = pino({ name: "worker" });
const connection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});
const prisma = new PrismaClient();

const ttsWorker = new Worker(
  "tts",
  async (job) => {
    logger.info({ id: job.id, name: job.name, data: job.data }, "job start");
    if (job.name === "tts.generate") {
      return handleTtsGenerate(prisma, job.data, logger);
    }
    throw new Error(`unknown job: ${job.name}`);
  },
  { connection, concurrency: Number(process.env.TTS_CONCURRENCY ?? 3) },
);

const events = new QueueEvents("tts", { connection });
events.on("failed", ({ jobId, failedReason }) => logger.error({ jobId, failedReason }, "job failed"));
events.on("completed", ({ jobId }) => logger.info({ jobId }, "job done"));

async function shutdown() {
  logger.info("shutting down");
  await ttsWorker.close();
  await events.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

logger.info("worker ready");
