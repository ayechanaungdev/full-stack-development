import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createInquiryDto: CreateInquiryDto & { submittedUserId: number },
  ) {
    return this.prisma.inquiry.create({
      data: {
        submittedUserId: createInquiryDto.submittedUserId,
        type: createInquiryDto.type,
        content: createInquiryDto.content,
        bookingId: createInquiryDto.bookingId ?? null,
        status: createInquiryDto.status ?? 'opened',
      },
    });
  }
}
