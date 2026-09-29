import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAreaDto } from './dto/create-area.dto';
import type { UpdateAreaDto } from './dto/update-area.dto';

const areaInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class AreasService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.areas.findMany({
      where: { deletedAt: null },
      include: areaInclude,
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateAreaDto, userId: string) {
    const name = dto.name.trim();
    await this.assertNameAvailable(name);
    return this.prisma.areas.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        createdById: userId,
        updatedById: userId,
      },
      include: areaInclude,
    });
  }

  async update(id: string, dto: UpdateAreaDto, userId: string) {
    const existing = await this.prisma.areas.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Área no encontrada.');
    const name = dto.name?.trim();
    if (name) await this.assertNameAvailable(name, id);
    return this.prisma.areas.update({
      where: { id },
      data: {
        name,
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
        updatedById: userId,
      },
      include: areaInclude,
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.areas.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Área no encontrada.');
    await this.prisma.areas.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    });
  }

  private async assertNameAvailable(name: string, excludedId?: string) {
    const duplicate = await this.prisma.areas.findFirst({
      where: { name, id: excludedId ? { not: excludedId } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Ya existe un área con ese nombre.');
  }
}
