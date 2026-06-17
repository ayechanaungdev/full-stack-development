import {
  IsInt,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateBookingDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsInt()
  userId: number;

  @IsInt()
  carId: number;

  @IsOptional()
  @IsInt()
  driverId?: number;
}
