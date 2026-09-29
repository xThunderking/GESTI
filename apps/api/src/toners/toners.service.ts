import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTonerDto } from './dto/create-toner.dto';
import type { UpdateTonerDto } from './dto/update-toner.dto';

const tonerInclude = {
  printer: { select: { id: true, model: true, serialNumber: true, area: true } },
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  deletedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TonersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.toner.findMany({ where: { deletedAt: null }, include: tonerInclude, orderBy: [{ model: 'asc' }, { color: 'asc' }] });
  }

  async create(dto: CreateTonerDto, userId: string) {
    await this.assertPrinterAvailable(dto.printerId);
    return this.prisma.toner.create({ data: { model: dto.model.trim(), color: dto.color.trim(), printerId: dto.printerId, createdById: userId, updatedById: userId }, include: tonerInclude });
  }

  async update(id: string, dto: UpdateTonerDto, userId: string) {
    await this.findActive(id);
    if (dto.printerId) await this.assertPrinterAvailable(dto.printerId);
    return this.prisma.toner.update({ where: { id }, data: { model: dto.model?.trim(), color: dto.color?.trim(), printerId: dto.printerId, updatedById: userId }, include: tonerInclude });
  }

  async remove(id: string, userId: string) {
    await this.findActive(id);
    await this.prisma.toner.update({ where: { id }, data: { deletedAt: new Date(), deletedById: userId, updatedById: userId } });
  }

  private async findActive(id: string) {
    const toner = await this.prisma.toner.findFirst({ where: { id, deletedAt: null } });
    if (!toner) throw new NotFoundException('Toner no encontrado.');
    return toner;
  }

  private async assertPrinterAvailable(printerId: string) {
    const printer = await this.prisma.printer.findFirst({ where: { id: printerId, deletedAt: null }, select: { id: true } });
    if (!printer) throw new ConflictException('La impresora seleccionada no existe o está dada de baja.');
  }
}
