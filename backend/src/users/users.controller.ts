import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('check-phone/:phone')
  @UseGuards(JwtAuthGuard)
  checkPhone(
    @Param('phone') phone: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.usersService.checkPhone(phone, excludeId ? parseInt(excludeId, 10) : undefined);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/push-token')
  @UseGuards(JwtAuthGuard)
  updatePushToken(
    @Param('id', ParseIntPipe) id: number,
    @Body('expo_push_token') expoPushToken: string,
    @Request() req: any,
  ) {
    // Only allow users to update their own push token
    if (req.user.userId !== id) {
      return { error: 'Unauthorized' };
    }
    return this.usersService.updatePushToken(id, expoPushToken);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
