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
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  create(@Body() createDriverDto: CreateDriverDto, @Request() req: any) {
    const ownerId = req.user?.userId;
    return this.driversService.create({
      ...createDriverDto,
      ownerId,
    });
  }

  @Get()
  findAll(@Request() req: any) {
    return this.driversService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.driversService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverDto: UpdateDriverDto,
    @Request() req: any,
  ) {
    return this.driversService.update(id, updateDriverDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.driversService.remove(id, req.user);
  }
}
