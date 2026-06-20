import { IsOptional, IsString } from 'class-validator';

export class CreateColorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  hex_code?: string;
}
