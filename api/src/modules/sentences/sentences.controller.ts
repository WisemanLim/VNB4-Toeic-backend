import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SentencesService } from "./sentences.service";
import { ListSentencesQuery } from "./dto/sentence.dto";

@ApiTags("sentences")
@Controller("sentences")
export class SentencesController {
  constructor(private readonly svc: SentencesService) {}

  @Get()
  list(@Query() q: ListSentencesQuery) {
    return this.svc.list(q);
  }

  // Declared before ":id" so "/sentences/stats" isn't captured as an id param.
  @Get("stats")
  stats() {
    return this.svc.stats();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.get(id);
  }
}
