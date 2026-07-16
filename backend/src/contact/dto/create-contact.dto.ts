import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(/^[+\d][\d\s-]{7,17}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  turnstile_token: string;

  // Honeypot: bots fill it; humans leave it blank.
  // @MaxLength(0) means any non-empty value fails DTO validation with 400 — no service logic needed.
  @IsOptional()
  @IsString()
  @MaxLength(0)
  company?: string;
}
