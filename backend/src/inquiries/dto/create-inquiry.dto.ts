import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @MinLength(3)
  type: string;

  @IsString()
  @MinLength(5)
  content: string;

  @IsOptional()
  @IsInt()
  bookingId?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
