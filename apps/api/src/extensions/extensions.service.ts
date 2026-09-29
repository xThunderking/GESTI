import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateExtensionDto } from './dto/create-extension.dto';
import type { UpdateExtensionDto } from './dto/update-extension.dto';

const extensionInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class ExtensionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.extension.findMany({
      where: { deletedAt: null },
      include: extensionInclude,
      orderBy: [{ area: 'asc' }, { extension: 'asc' }],
    });
  }

  async create(dto: CreateExtensionDto, userId: string) {
    const values = {
      extension: dto.extension.trim(),
      description: dto.description.trim(),
      area: dto.area.trim(),
    };
    await this.assertAvailable(values.extension);
    return this.prisma.extension.create({
      data: { ...values, createdById: userId, updatedById: userId },
      include: extensionInclude,
    });
  }

  async update(id: string, dto: UpdateExtensionDto, userId: string) {
    await this.findActive(id);
    const values = {
      extension: dto.extension?.trim(),
      description: dto.description?.trim(),
      area: dto.area?.trim(),
    };
    if (values.extension) await this.assertAvailable(values.extension, id);
    return this.prisma.extension.update({
      where: { id },
      data: { ...values, updatedById: userId },
      include: extensionInclude,
    });
  }

  async remove(id: string, userId: string) {
    await this.findActive(id);
    await this.prisma.extension.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    });
  }

  private async findActive(id: string) {
    const item = await this.prisma.extension.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException('Extensión no encontrada.');
    return item;
  }

  private async assertAvailable(extension: string, excludedId?: string) {
    const duplicate = await this.prisma.extension.findFirst({
      where: { extension, id: excludedId ? { not: excludedId } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Ya existe una extensión con ese valor.');
  }
}
