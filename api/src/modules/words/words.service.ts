import { Injectable, NotFoundException } from "@nestjs/common";
import { Part, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateWordDto, ListWordsQuery, UpdateWordDto } from "./dto/word.dto";

const PART_MAP: Record<number, Part> = {
  1: Part.P1, 2: Part.P2, 3: Part.P3, 4: Part.P4, 5: Part.P5, 6: Part.P6, 7: Part.P7,
};

@Injectable()
export class WordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListWordsQuery) {
    const take = Math.min(q.limit ?? 20, 100);
    const skip = q.cursor ? 1 : 0;
    const where: Prisma.WordWhereInput = {
      deletedAt: null,
      ...(q.part ? { part: PART_MAP[q.part] } : {}),
      ...(q.search
        ? { OR: [{ word: { contains: q.search, mode: "insensitive" } }, { meaningKo: { contains: q.search } }] }
        : {}),
      ...(q.tier ? { frequencyTier: q.tier } : {}),
    };
    const items = await this.prisma.word.findMany({
      where,
      orderBy: { id: "asc" },
      take,
      skip,
      cursor: q.cursor ? { id: q.cursor } : undefined,
      include: { audio: true },
    });
    return { items, nextCursor: items.length === take ? items[items.length - 1].id : null };
  }

  /** Totals for the admin dashboard: overall + per-part word counts. */
  async stats() {
    const total = await this.prisma.word.count({ where: { deletedAt: null } });
    const groups = await this.prisma.word.groupBy({
      by: ["part"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const byPart: Record<string, number> = {};
    for (const g of groups) byPart[g.part] = g._count._all;
    return { total, byPart };
  }

  async get(id: string) {
    const w = await this.prisma.word.findUnique({ where: { id }, include: { audio: true } });
    if (!w || w.deletedAt) throw new NotFoundException("word not found");
    return w;
  }

  create(dto: CreateWordDto) {
    return this.prisma.word.create({
      data: { ...dto, part: PART_MAP[dto.part] },
    });
  }

  async update(id: string, dto: UpdateWordDto) {
    await this.get(id);
    const { part, ...rest } = dto;
    return this.prisma.word.update({
      where: { id },
      data: { ...rest, ...(part ? { part: PART_MAP[part] } : {}) },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.word.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
