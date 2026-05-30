import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListSentencesQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(4)
  part?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  day?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number;

  @IsOptional() @IsString()
  cursor?: string;
}
