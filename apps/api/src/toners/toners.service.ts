import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTonerDto } from './dto/create-toner.dto';
import type { UpdateTonerDto } from './dto/update-toner.dto';
import type { AdjustTonerStockDto } from './dto/adjust-toner-stock.dto';
import type { RemoveTonerStockDto } from './dto/remove-toner-stock.dto';

const tonerInclude = {
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  deletedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TonersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.toner.findMany({
      where: { deletedAt: null },
      include: tonerInclude,
      orderBy: [{ model: 'asc' }, { color: 'asc' }],
    });
  }

  async create(dto: CreateTonerDto, userId: string) {
    return this.prisma.toner.create({
      data: {
        model: dto.model.trim(),
        color: dto.color.trim(),
        printerName: dto.printerName.trim(),
        quantity: dto.quantity,
        createdById: userId,
        updatedById: userId,
      },
      include: tonerInclude,
    });
  }

  async update(id: string, dto: UpdateTonerDto, userId: string) {
    await this.findActive(id);
    return this.prisma.toner.update({
      where: { id },
      data: {
        model: dto.model?.trim(),
        color: dto.color?.trim(),
        printerName: dto.printerName?.trim(),
        quantity: dto.quantity,
        updatedById: userId,
      },
      include: tonerInclude,
    });
  }

  async remove(id: string, userId: string) {
    await this.findActive(id);
    await this.prisma.toner.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    });
  }

  async addStock(id: string, dto: AdjustTonerStockDto) {
    const updated = await this.prisma.toner.updateMany({
      where: { id, deletedAt: null },
      data: { quantity: { increment: dto.quantity } },
    });
    if (updated.count !== 1) throw new NotFoundException('Toner no encontrado.');
    return this.findActive(id);
  }

  async removeStock(id: string, dto: RemoveTonerStockDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const toner = await tx.toner.findFirst({ where: { id, deletedAt: null } });
      if (!toner) throw new NotFoundException('Toner no encontrado.');

      const printer = await tx.printer.findFirst({
        where: { id: dto.printerId, deletedAt: null },
        select: { id: true, model: true, area: true, serialNumber: true, ip: true },
      });
      if (!printer) throw new NotFoundException('Impresora no encontrada.');

      const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
      if (!user) throw new NotFoundException('Usuario no encontrado.');

      const updated = await tx.toner.updateMany({
        where: { id, deletedAt: null, quantity: { gte: dto.quantity } },
        data: { quantity: { decrement: dto.quantity } },
      });
      if (updated.count !== 1) {
        throw new ConflictException('No hay suficiente toner en stock para esa cantidad.');
      }

      return tx.tonerMovement.create({
        data: {
          tonerId: toner.id,
          tonerModel: toner.model,
          quantity: dto.quantity,
          printerId: printer.id,
          printerName: `${printer.model} - ${printer.area} - ${printer.serialNumber}${printer.ip ? ` - ${printer.ip}` : ''}`,
          userId,
          userName: user.name,
        },
      });
    });
  }

  async findHistory(id: string) {
    await this.findActive(id);
    return this.prisma.tonerMovement.findMany({
      where: { tonerId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllHistory() {
    return this.prisma.tonerMovement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findActive(id: string) {
    const toner = await this.prisma.toner.findFirst({ where: { id, deletedAt: null } });
    if (!toner) throw new NotFoundException('Toner no encontrado.');
    return toner;
  }
}
