import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCarDto {
  @ApiPropertyOptional({ example: 0, description: 'Page number (0-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'Available', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Toyota', description: 'Search keyword (brand, model, car_number)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Toyota', description: 'Filter by exact brand' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: '11012', description: 'Filter by postal code' })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional({ example: 'sedan', description: 'Filter by car type' })
  @IsOptional()
  @IsString()
  car_type?: string;

  @ApiPropertyOptional({ example: 4, description: 'Filter by minimum seats' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  seats?: number;

  @ApiPropertyOptional({ example: 20, description: 'Minimum price per day' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maximum price per day' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ownerId?: number;

  @ApiPropertyOptional({ example: '2024-06-01', description: 'Start date for availability filter' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-06-10', description: 'End date for availability filter' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
