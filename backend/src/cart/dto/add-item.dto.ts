import { IsInt, IsUUID, Min } from 'class-validator';

export class AddItemDto {
  @IsUUID()
  variantId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
