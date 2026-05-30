import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class EmailSignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class EmailLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
