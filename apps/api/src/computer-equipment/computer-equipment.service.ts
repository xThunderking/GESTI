import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateComputerEquipmentDto } from './dto/create-computer-equipment.dto';
import type { UpdateComputerEquipmentDto } from './dto/update-computer-equipment.dto';

const equipmentInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
} as const;

type EquipmentValues = {
  serialNumber?: string;
  ip?: string;
  model?: string;
  ciId?: string;
  assetType?: string;
  description?: string;
  equipmentDate?: Date;
  location?: string;
  responsible?: string;
};

@Injectable()
export class ComputerEquipmentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.computerEquipment.findMany({
      where: { deletedAt: null },
      include: equipmentInclude,
      orderBy: [{ location: 'asc' }, { model: 'asc' }],
    });
  }

  async create(dto: CreateComputerEquipmentDto, userId: string) {
    const values = {
      serialNumber: dto.serialNumber.trim(),
      ip: dto.ip.trim(),
      model: dto.model.trim(),
      ciId: dto.ciId.trim(),
      assetType: dto.assetType.trim(),
      description: dto.description.trim(),
      equipmentDate: new Date(dto.equipmentDate),
      location: dto.location.trim(),
      responsible: dto.responsible.trim(),
    };
    await this.assertAvailable(values);
    return this.prisma.computerEquipment.create({
      data: { ...values, createdById: userId, updatedById: userId },
      include: equipmentInclude,
    });
  }

  async update(id: string, dto: UpdateComputerEquipmentDto, userId: string) {
    await this.findActive(id);
    const values = this.normalize(dto);
    await this.assertAvailable(values, id);
    return this.prisma.computerEquipment.update({
      where: { id },
      data: { ...values, updatedById: userId },
      include: equipmentInclude,
    });
  }

  async remove(id: string, userId: string) {
    await this.findActive(id);
    await this.prisma.computerEquipment.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    });
  }

  private normalize(dto: UpdateComputerEquipmentDto): EquipmentValues {
    return {
      serialNumber: dto.serialNumber?.trim(),
      ip: dto.ip?.trim(),
      model: dto.model?.trim(),
      ciId: dto.ciId?.trim(),
      assetType: dto.assetType?.trim(),
      description: dto.description?.trim(),
      equipmentDate: dto.equipmentDate ? new Date(dto.equipmentDate) : undefined,
      location: dto.location?.trim(),
      responsible: dto.responsible?.trim(),
    };
  }

  private async findActive(id: string) {
    const equipment = await this.prisma.computerEquipment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!equipment) throw new NotFoundException('Equipo de cómputo no encontrado.');
    return equipment;
  }

  private async assertAvailable(
    values: EquipmentValues,
    excludedId?: string,
  ) {
    const duplicate = await this.prisma.computerEquipment.findFirst({
      where: {
        id: excludedId ? { not: excludedId } : undefined,
        OR: [
          values.serialNumber ? { serialNumber: values.serialNumber } : undefined,
          values.ip ? { ip: values.ip } : undefined,
          values.ciId ? { ciId: values.ciId } : undefined,
        ].filter(Boolean) as { serialNumber?: string; ip?: string; ciId?: string }[],
      },
      select: { serialNumber: true, ip: true, ciId: true },
    });
    if (duplicate) {
      if (values.serialNumber === duplicate.serialNumber)
        throw new ConflictException('Ya existe un equipo con ese número de serie.');
      if (values.ip === duplicate.ip)
        throw new ConflictException('Ya existe un equipo con esa IP.');
      throw new ConflictException('Ya existe un equipo con ese CI-ID.');
    }
  }
}
