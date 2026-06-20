import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  material_id?: string;

  @IsOptional()
  @IsString()
  color_id?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock_quantity?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
