import { PrismaService } from '../prisma/prisma.service';

/**
 * Base Repository Interface
 * Defines common CRUD operations that all repositories should implement
 */
export interface IBaseRepository<T> {
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
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  constructor(protected prisma: PrismaService, protected modelName: string) {}

  async create(data: any): Promise<T> {
    return (this.prisma as any)[this.modelName].create({ data });
  }

  async findAll(): Promise<T[]> {
    return (this.prisma as any)[this.modelName].findMany();
  }

  async findOne(id: number): Promise<T | null> {
    return (this.prisma as any)[this.modelName].findUnique({ where: { id } });
  }

  async update(id: number, data: any): Promise<T> {
    return (this.prisma as any)[this.modelName].update({ where: { id }, data });
  }

  async remove(id: number): Promise<T> {
    return (this.prisma as any)[this.modelName].delete({ where: { id } });
  }
}
