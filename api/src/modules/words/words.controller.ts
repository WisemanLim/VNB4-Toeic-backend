import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { WordsService } from "./words.service";
import { CreateWordDto, ListWordsQuery, UpdateWordDto } from "./dto/word.dto";
import { Roles } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";

@ApiTags("words")
@Controller("words")
export class WordsController {
  constructor(private readonly svc: WordsService) {}

  @Get()
  list(@Query() q: ListWordsQuery) {
    return this.svc.list(q);
  }

  // Declared before ":id" so "/words/stats" isn't captured as an id param.
  @Get("stats")
  stats() {
    return this.svc.stats();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "editor")
  @Post()
  create(@Body() dto: CreateWordDto) {
    return this.svc.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "editor")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateWordDto) {
    return this.svc.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
