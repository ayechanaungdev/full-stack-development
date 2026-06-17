import { IsString, IsOptional } from 'class-validator';

export class CreateUploadDto {
  @IsString()
  filename: string;

  @IsString()
  contentBase64: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsString()
  bucket?: string;
}
