import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDriverDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsString()
  license_img_url?: string;

  @IsOptional()
  @IsString()
  nrc?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
