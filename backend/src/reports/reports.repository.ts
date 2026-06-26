import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

@Injectable()
export class ReportsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma, 'dailyReport');
  }

  async findAllPaginated(
    where: Record<string, unknown>,
    skip: number,
    take: number,
  ) {
    return this.prisma.dailyReport.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where: Record<string, unknown>) {
    return this.prisma.dailyReport.count({ where });
  }
}
