import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('inquiries')
@UseGuards(JwtAuthGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  async create(
    @Body() createInquiryDto: CreateInquiryDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user.userId;
    return this.inquiriesService.create({
      ...createInquiryDto,
      submittedUserId: currentUserId,
      status: createInquiryDto.status ?? 'opened',
    });
  }
}
