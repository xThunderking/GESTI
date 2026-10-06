import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePrinterDto } from './dto/create-printer.dto';
import type { UpdatePrinterDto } from './dto/update-printer.dto';

const printerInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class PrintersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.printer.findMany({
      where: { deletedAt: null },
      include: printerInclude,
      orderBy: [{ area: 'asc' }, { model: 'asc' }],
    });
  }

  async create(dto: CreatePrinterDto, userId: string) {
    const serialNumber = dto.serialNumber.trim();
    await this.assertSerialAvailable(serialNumber);
    const ip = dto.ip.trim();
    await this.assertIpAvailable(ip);
    return this.prisma.printer.create({
      data: {
        area: dto.area.trim(),
        model: dto.model.trim(),
        serialNumber,
        ip,
        status: dto.status,
        responsible: dto.responsible.trim(),
        installationDate: new Date(dto.installationDate),
        createdById: userId,
        updatedById: userId,
      },
      include: printerInclude,
    });
  }

  async update(id: string, dto: UpdatePrinterDto, userId: string) {
    const existing = await this.prisma.printer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Impresora no encontrada.');
    const serialNumber = dto.serialNumber?.trim();
    const ip = dto.ip?.trim();
    if (serialNumber) await this.assertSerialAvailable(serialNumber, id);
    if (ip) await this.assertIpAvailable(ip, id);
    return this.prisma.printer.update({
      where: { id },
      data: {
        area: dto.area?.trim(),
        model: dto.model?.trim(),
        serialNumber,
        ip,
        status: dto.status,
        responsible: dto.responsible?.trim(),
        installationDate: dto.installationDate ? new Date(dto.installationDate) : undefined,
        updatedById: userId,
      },
      include: printerInclude,
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.printer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Impresora no encontrada.');
    await this.prisma.printer.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    });
  }

  private async assertSerialAvailable(serialNumber: string, excludedId?: string) {
    const duplicate = await this.prisma.printer.findFirst({
      where: { serialNumber, id: excludedId ? { not: excludedId } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Ya existe una impresora con ese numero de serie.');
  }

  private async assertIpAvailable(ip: string, excludedId?: string) {
    const duplicate = await this.prisma.printer.findFirst({
      where: { ip, id: excludedId ? { not: excludedId } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Ya existe una impresora con esa direccion IP.');
  }
}
