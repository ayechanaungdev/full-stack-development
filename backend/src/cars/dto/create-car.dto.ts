import { IsString, IsInt, IsNumber, Min, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CarImageDto {
    @ApiPropertyOptional({ description: 'Image ID (omit for new images)' })
    @IsOptional()
    @IsInt()
    id?: number;

    @ApiProperty({ example: 'https://example.com/car.jpg', description: 'Image URL' })
    @IsString()
    image_url: string;

    @ApiProperty({ example: true, description: 'Whether this is the primary image' })
    @IsBoolean()
    is_primary: boolean;
}

export class CreateCarDto {
    @ApiProperty({ example: 'Toyota', description: 'Car brand' })
    @IsString()
    brand: string;

    @ApiProperty({ example: 'Camry', description: 'Car model' })
    @IsString()
    model: string;

    @ApiPropertyOptional({ example: 2024, description: 'Manufacturing year' })
    @IsOptional()
    @IsInt()
    @Min(1900)
    year?: number;

    @ApiProperty({ example: 50.99, description: 'Price per day in USD' })
    @IsNumber()
    @Min(0)
    pricePerDay: number;

    @ApiPropertyOptional({ description: 'Owner user ID (auto-set for car_owner role)' })
    @IsOptional()
    @IsInt()
    ownerId?: number;

    @ApiPropertyOptional({ example: 'sedan', description: 'Car type (sedan, SUV, truck, etc.)' })
    @IsOptional()
    @IsString()
    car_type?: string;

    @ApiPropertyOptional({ example: 'ABC-1234', description: 'License plate number' })
    @IsOptional()
    @IsString()
    car_number?: string;

    @ApiPropertyOptional({ example: 4, description: 'Number of seats' })
    @IsOptional()
    @IsInt()
    seats?: number;

    @ApiPropertyOptional({ example: true, description: 'Has air conditioning' })
    @IsOptional()
    @IsBoolean()
    has_ac?: boolean;

    @ApiPropertyOptional({ example: 'Available', description: 'Car status' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ example: '11012', description: 'Postal code for location filter' })
    @IsOptional()
    @IsString()
    postal_code?: string;

    @ApiPropertyOptional({ example: 'Yangon, Myanmar', description: 'Location description' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ example: 'A comfortable car for long drives', description: 'Car description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ type: [CarImageDto], description: 'Car images' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CarImageDto)
    images?: CarImageDto[];
}
