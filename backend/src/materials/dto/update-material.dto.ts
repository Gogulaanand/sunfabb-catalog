import { IsOptional, IsString } from 'class-validator';

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  name?: string;
}
