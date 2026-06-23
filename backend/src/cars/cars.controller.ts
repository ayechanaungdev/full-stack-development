import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { QueryCarDto } from './dto/query-car.dto';


import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.car_owner)
  create(@Body() createCarDto: CreateCarDto, @Request() req: any) {
    // If owner, force ownerId to be the authenticated user's ID
    const ownerId = req.user.role === Role.car_owner ? req.user.userId : createCarDto.ownerId;
    return this.carsService.create({
      ...createCarDto,
      ownerId,
    });
  }

  @Get()
  findAll(@Query() query: QueryCarDto) {
    return this.carsService.findAllPaginated(query);
  }

  @Get('price-range')
  getPriceRange() {
    return this.carsService.getPriceRange();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.carsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.car_owner)
  async update(
    @Param('id') id: string,
    @Body() updateCarDto: UpdateCarDto,
    @Request() req: any,
  ) {
    if (req.user.role === Role.car_owner) {
      const car = await this.carsService.findOne(+id);
      if (!car || car.ownerId !== req.user.userId) {
        throw new ForbiddenException('You do not own this car');
      }
    }
    return this.carsService.update(+id, updateCarDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.car_owner)
  async remove(@Param('id') id: string, @Request() req: any) {
    if (req.user.role === Role.car_owner) {
      const car = await this.carsService.findOne(+id);
      if (!car || car.ownerId !== req.user.userId) {
        throw new ForbiddenException('You do not own this car');
      }
    }
    return this.carsService.remove(+id);
  }
}
