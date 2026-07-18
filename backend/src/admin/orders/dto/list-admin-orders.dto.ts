import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { OrderStatus } from '../../../../generated/prisma/enums.js';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ListAdminOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDateString()
  @Matches(DATE_ONLY_PATTERN, { message: 'date_from must be YYYY-MM-DD' })
  date_from?: string;

  @IsOptional()
  @IsDateString()
  @Matches(DATE_ONLY_PATTERN, { message: 'date_to must be YYYY-MM-DD' })
  date_to?: string;
}
