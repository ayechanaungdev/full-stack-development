// src/cars/dto/create-car.dto.ts
import { IsString, IsInt, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateCarDto {
    @IsString()
    brand: string;

    @IsString()
    model: string;

    @IsInt() // Year must be an integer (e.g., 2024)
    @Min(1900) // Don't allow cars older than 1900
    year: number;

    @IsNumber() // Price can have decimals (e.g., 50.99)
    @Min(0) // Price cannot be negative!
    pricePerDay: number;

}
