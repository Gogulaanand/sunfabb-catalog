import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  care_instructions?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
