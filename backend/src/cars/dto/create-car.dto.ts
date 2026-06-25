// src/cars/dto/create-car.dto.ts
import { IsString, IsInt, IsNumber, Min, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CarImageDto {
    @IsOptional()
    @IsInt()
    id?: number;

    @IsString()
    image_url: string;

    @IsBoolean()
    is_primary: boolean;
}

export class CreateCarDto {
    @IsString()
    brand: string;

    @IsString()
    model: string;

    @IsOptional()
    @IsInt() // Year must be an integer (e.g., 2024)
    @Min(1900) // Don't allow cars older than 1900
    year?: number;

    @IsNumber() // Price can have decimals (e.g., 50.99)
    @Min(0) // Price cannot be negative!
    pricePerDay: number;

    @IsOptional()
    @IsInt()
    ownerId?: number;

    @IsOptional()
    @IsString()
    car_type?: string;

    @IsOptional()
    @IsString()
    car_number?: string;

    @IsOptional()
    @IsInt()
    seats?: number;

    @IsOptional()
    @IsBoolean()
    has_ac?: boolean;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    postal_code?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CarImageDto)
    images?: CarImageDto[];
}
