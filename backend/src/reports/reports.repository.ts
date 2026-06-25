import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/base.repository';

@Injectable()
export class ReportsRepository extends BaseRepository<any> {
  constructor(prisma: PrismaService) {
    super(prisma, 'dailyReport');
  }

  async findAllPaginated(where: any, skip: number, take: number): Promise<any[]> {
    return this.prisma.dailyReport.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where: any): Promise<number> {
    return this.prisma.dailyReport.count({ where });
  }
}
