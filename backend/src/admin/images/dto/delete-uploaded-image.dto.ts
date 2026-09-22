import { IsString, Matches, MaxLength } from 'class-validator';

export class DeleteUploadedImageDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^sunfabb\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/, {
    message: 'public_id must identify an image in the sunfabb folder',
  })
  public_id: string;
}
