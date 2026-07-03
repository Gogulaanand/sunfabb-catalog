import { IsNotEmpty, IsString } from 'class-validator';

// The three fields Razorpay's hosted Checkout hands back to the client success
// handler. All are opaque provider strings; class-validator rejects a malformed
// payload as 400 before the signature is even checked (D8). The signature itself
// is verified in the service (§7.1) — a bad one is 400, order stays PENDING_PAYMENT.
export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}
