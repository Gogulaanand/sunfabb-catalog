import { IsInt, IsString, Min } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  material_id: string;

  @IsString()
  color_id: string;

  @IsString()
  size: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  stock_quantity: number;

  @IsString()
  sku: string;
}
