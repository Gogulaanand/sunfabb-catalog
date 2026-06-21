import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateProductImageDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  public_id?: string;

  @IsOptional()
  @IsString()
  alt_text?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @IsString()
  variant_id?: string;
}
