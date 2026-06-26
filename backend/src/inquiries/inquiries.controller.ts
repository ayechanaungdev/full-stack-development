import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import type { AuthenticatedRequest } from '../common/types';

@ApiTags('Inquiries')
@Controller('inquiries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create inquiry',
    description: 'Submit a customer inquiry',
  })
  async create(
    @Body() createInquiryDto: CreateInquiryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user.userId;
    return this.inquiriesService.create({
      ...createInquiryDto,
      submittedUserId: currentUserId,
      status: createInquiryDto.status ?? 'opened',
    });
  }
}
