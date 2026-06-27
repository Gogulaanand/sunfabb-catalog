import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  // A malformed / missing addressId is rejected here as 400. A well-formed id
  // that isn't the caller's is reported as 404 by the service (IDOR — §7.2).
  @IsUUID()
  addressId: string;

  // Reserved for 6.4 price-drift detection: a quote may be issued with a signed
  // token the order references. 6.3 always re-reads price from the cart at order
  // time (D34), so the token is accepted but not yet required or consumed.
  @IsOptional()
  @IsString()
  quoteToken?: string;
}
