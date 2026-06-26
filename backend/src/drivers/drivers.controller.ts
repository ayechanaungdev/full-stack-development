import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';
import { AuthenticatedRequest } from '../common/types';

@ApiTags('Drivers')
@Controller('drivers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a driver',
    description: 'Add a new driver profile',
  })
  create(
    @Body() createDriverDto: CreateDriverDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const ownerId = req.user?.userId;
    return this.driversService.create({
      ...createDriverDto,
      ownerId,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List drivers',
    description: 'Get all drivers (admin or owner)',
  })
  findAll(@Request() req: AuthenticatedRequest) {
    return this.driversService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get driver by ID',
    description: 'Get a single driver details',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.driversService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update driver',
    description: 'Update driver details',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverDto: UpdateDriverDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.driversService.update(id, updateDriverDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete driver',
    description: 'Remove a driver profile',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.driversService.remove(id, req.user);
  }
}
