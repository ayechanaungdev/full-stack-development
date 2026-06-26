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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AuthenticatedRequest } from '../common/types';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create user',
    description: 'Register a new user account',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List all users',
    description: 'Get all users (admin only)',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('check-phone/:phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Check phone availability',
    description: 'Check if a phone number is already registered',
  })
  checkPhone(
    @Param('phone') phone: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.usersService.checkPhone(
      phone,
      excludeId ? parseInt(excludeId, 10) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Get user profile details',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user profile information',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/push-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update push token',
    description: 'Update Expo push notification token',
  })
  updatePushToken(
    @Param('id', ParseIntPipe) id: number,
    @Body('expo_push_token') expoPushToken: string | null,
    @Request() req: AuthenticatedRequest,
  ) {
    // Only allow users to update their own push token
    if (req.user.userId !== id) {
      return { error: 'Unauthorized' };
    }
    return this.usersService.updatePushToken(id, expoPushToken);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Delete a user account (admin only)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
