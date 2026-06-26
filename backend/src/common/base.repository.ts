/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { PrismaService } from '../prisma/prisma.service';

/**
 * Base Repository Interface
 * Defines common CRUD operations that all repositories should implement
 */
export interface IBaseRepository<T = any> {
  create(data: any): Promise<T>;
  findAll(): Promise<T[]>;
  findOne(id: number): Promise<T | null>;
  update(id: number, data: any): Promise<T>;
  remove(id: number): Promise<T>;
}

/**
 * Base Repository Class
 * Provides common functionality for all repositories
 */
export abstract class BaseRepository<T = any> implements IBaseRepository<T> {
  constructor(
    protected prisma: PrismaService,
    protected modelName: string,
  ) {}

  create(data: any): Promise<T> {
    return (this.prisma as any)[this.modelName].create({ data });
  }

  findAll(): Promise<T[]> {
    return (this.prisma as any)[this.modelName].findMany();
  }

  findOne(id: number): Promise<T | null> {
    return (this.prisma as any)[this.modelName].findUnique({ where: { id } });
  }

  update(id: number, data: any): Promise<T> {
    return (this.prisma as any)[this.modelName].update({ where: { id }, data });
  }

  remove(id: number): Promise<T> {
    return (this.prisma as any)[this.modelName].delete({ where: { id } });
  }
}
