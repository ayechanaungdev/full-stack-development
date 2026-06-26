import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(private reportsRepository: ReportsRepository) {}

  async findAll(
    userId: number,
    filters?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { ownerId: userId };

    if (filters?.startDate || filters?.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters?.startDate) {
        createdAt.gte = new Date(filters.startDate);
      }
      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      this.reportsRepository.findAllPaginated(where, skip, limit),
      this.reportsRepository.count(where),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: number, userId: number): Promise<any> {
    const report = (await this.reportsRepository.findOne(id)) as {
      ownerId: number;
    } | null;
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return report;
  }

  async markAsRead(id: number, userId: number): Promise<any> {
    const report = (await this.reportsRepository.findOne(id)) as {
      ownerId: number;
    } | null;
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    if (report.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.reportsRepository.update(id, { isRead: true });
  }
}
