import { IsString, IsOptional, IsInt } from 'class-validator';

export class GetSignedUrlDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsInt()
  expiresInSeconds?: number;

  @IsOptional()
  @IsString()
  bucket?: string;
}
