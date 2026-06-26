import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { QueryCarDto } from './dto/query-car.dto';
import { AuthenticatedRequest } from '../common/types';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Cars')
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.car_owner)
  @ApiOperation({
    summary: 'Create a car',
    description: 'Add a new car to the inventory (admin/car_owner)',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'Car created successfully' })
  create(
    @Body() createCarDto: CreateCarDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // If owner, force ownerId to be the authenticated user's ID
    const ownerId =
      req.user.role === Role.car_owner ? req.user.userId : createCarDto.ownerId;
    return this.carsService.create({
      ...createCarDto,
      ownerId,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List cars',
    description: 'Get paginated list of cars with filters and search',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated car list with total count',
  })
  findAll(@Query() query: QueryCarDto) {
    return this.carsService.findAllPaginated(query);
  }

  @Get('price-range')
  @ApiOperation({
    summary: 'Get price range',
    description: 'Get min and max pricePerDay across all cars',
  })
  getPriceRange() {
    return this.carsService.getPriceRange();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get car by ID',
    description: 'Get a single car with full details',
  })
  @ApiResponse({ status: 200, description: 'Returns the car details' })
  @ApiResponse({ status: 404, description: 'Car not found' })
  findOne(@Param('id') id: string) {
    return this.carsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.car_owner)
  @ApiOperation({
    summary: 'Update a car',
    description: 'Update car details (admin/car_owner)',
  })
  @ApiBearerAuth('access-token')
  async update(
    @Param('id') id: string,
    @Body() updateCarDto: UpdateCarDto,
    @Request() req: AuthenticatedRequest,
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
  @ApiOperation({
    summary: 'Delete a car',
    description: 'Remove a car from inventory (admin/car_owner)',
  })
  @ApiBearerAuth('access-token')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (req.user.role === Role.car_owner) {
      const car = await this.carsService.findOne(+id);
      if (!car || car.ownerId !== req.user.userId) {
        throw new ForbiddenException('You do not own this car');
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.carsService.remove(+id);
  }
}
