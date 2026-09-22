import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  care_instructions?: string | null;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  measured_width_cm?: number | null;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  measured_length_cm?: number | null;

  @IsOptional()
  @IsString()
  set_contents?: string | null;

  @IsOptional()
  @IsString()
  category_id?: string;
}
