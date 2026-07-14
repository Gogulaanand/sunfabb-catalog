import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';
import type { ProductImageRole } from '../../../generated/prisma/client.js';

const PRODUCT_IMAGE_ROLES = ['GALLERY', 'SWATCH'] as const;

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
  @IsUUID()
  variant_id?: string;

  @IsOptional()
  @IsEnum(PRODUCT_IMAGE_ROLES)
  image_role?: ProductImageRole;
}
