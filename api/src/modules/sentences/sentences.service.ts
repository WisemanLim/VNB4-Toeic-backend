import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Part, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ListSentencesQuery } from "./dto/sentence.dto";

// 문장쓰기는 LC(Part 1–4) 전용. DTO의 @Max(4)와 범위를 일치시킨다.
const PART_MAP: Record<number, Part> = {
  1: Part.P1, 2: Part.P2, 3: Part.P3, 4: Part.P4,
};

@Injectable()
export class SentencesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListSentencesQuery) {
    const take = Math.min(q.limit ?? 50, 200);
    // Validate the cursor before handing it to Prisma — an unknown id makes
    // findMany throw a raw runtime error that would surface as a 500.
    if (q.cursor) {
      const exists = await this.prisma.sentenceItem.findUnique({
        where: { id: q.cursor },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException("invalid cursor");
    }
    const where: Prisma.SentenceItemWhereInput = {
      deletedAt: null,
      ...(q.part ? { part: PART_MAP[q.part] } : {}),
      ...(q.day ? { day: q.day } : {}),
    };
    const items = await this.prisma.sentenceItem.findMany({
      where,
      orderBy: [{ part: "asc" }, { day: "asc" }, { orderIndex: "asc" }],
      take,
      skip: q.cursor ? 1 : 0,
      cursor: q.cursor ? { id: q.cursor } : undefined,
    });
    return { items, nextCursor: items.length === take ? items[items.length - 1].id : null };
  }

  /** Totals for the admin dashboard. */
  async stats() {
    const total = await this.prisma.sentenceItem.count({ where: { deletedAt: null } });
    const groups = await this.prisma.sentenceItem.groupBy({
      by: ["part"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const byPart: Record<string, number> = {};
    for (const g of groups) byPart[g.part] = g._count._all;
    return { total, byPart };
  }

  async get(id: string) {
    const s = await this.prisma.sentenceItem.findUnique({ where: { id } });
    if (!s || s.deletedAt) throw new NotFoundException("sentence not found");
    return s;
  }
}
