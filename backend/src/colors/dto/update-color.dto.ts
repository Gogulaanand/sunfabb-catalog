import { IsOptional, IsString } from 'class-validator';

export class UpdateColorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  hex_code?: string;
}
