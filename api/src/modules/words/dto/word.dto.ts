import { IsArray, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListWordsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(7)
  part?: number;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  tier?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;

  @IsOptional() @IsString()
  cursor?: string;
}

export class CreateWordDto {
  @IsString() id!: string;
  @IsInt() @Min(1) @Max(7) part!: number;
  @IsString() word!: string;
  @IsOptional() @IsString() pos?: string;
  @IsString() meaningKo!: string;
  @IsOptional() @IsString() ipa?: string;
  @IsOptional() @IsString() pronKo?: string;
  @IsOptional() @IsString() exampleEn?: string;
  @IsOptional() @IsString() exampleKo?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) topic?: string[];
  @IsOptional() @IsInt() frequencyTier?: number;
  @IsOptional() @IsString() imagePrompt?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) synonyms?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) distractors?: string[];
}

export class UpdateWordDto {
  @IsOptional() @IsInt() @Min(1) @Max(7) part?: number;
  @IsOptional() @IsString() word?: string;
  @IsOptional() @IsString() pos?: string;
  @IsOptional() @IsString() meaningKo?: string;
  @IsOptional() @IsString() ipa?: string;
  @IsOptional() @IsString() pronKo?: string;
  @IsOptional() @IsString() exampleEn?: string;
  @IsOptional() @IsString() exampleKo?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) topic?: string[];
  @IsOptional() @IsInt() frequencyTier?: number;
  @IsOptional() @IsString() imagePrompt?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) synonyms?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) distractors?: string[];
}
