import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AssignTowerIpDto } from './dto/assign-tower-ip.dto';
import type { BulkCreateTowerIpsDto } from './dto/bulk-create-tower-ips.dto';
import type { CreateTowerIpDto } from './dto/create-tower-ip.dto';
import type { UpdateTowerIpDto } from './dto/update-tower-ip.dto';

const towerIpInclude = {
  configuredBy: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
  assignments: {
    include: { assignedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
} as const;

@Injectable()
export class TowerIpsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.towerIp.findMany({
      where: { deletedAt: null },
      include: towerIpInclude,
      orderBy: [{ office: 'asc' }, { ip: 'asc' }],
    });
  }

  async create(dto: CreateTowerIpDto, userId: string) {
    const ip = dto.ip.trim();
    await this.assertIpAvailable(ip);
    return this.prisma.towerIp.create({
      data: {
        ip,
        office: dto.office.trim(),
        location: null,
        responsible: null,
        antenna: false,
        observations: null,
        configuredAt: null,
        configuredById: null,
        createdById: userId,
        updatedById: userId,
      },
      include: towerIpInclude,
    });
  }

  async createMany(dto: BulkCreateTowerIpsDto, userId: string) {
    const ips = dto.ips.map((ip) => ip.trim());
    if (new Set(ips).size !== ips.length) {
      throw new ConflictException('La lista contiene direcciones IP repetidas.');
    }
    const duplicates = await this.prisma.towerIp.findMany({
      where: { ip: { in: ips } },
      select: { ip: true },
    });
    if (duplicates.length) {
      throw new ConflictException(`Estas IP ya están registradas: ${duplicates.map(({ ip }) => ip).join(', ')}.`);
    }

    return this.prisma.$transaction(async (tx) =>
      Promise.all(
        ips.map((ip) =>
          tx.towerIp.create({
            data: {
              ip,
              office: dto.office.trim(),
              location: null,
              responsible: null,
              antenna: false,
              observations: null,
              configuredAt: null,
              configuredById: null,
              createdById: userId,
              updatedById: userId,
            },
            include: towerIpInclude,
          }),
        ),
      ),
    );
  }

  async update(id: string, dto: UpdateTowerIpDto, userId: string) {
    await this.findActive(id);
    const ip = dto.ip?.trim();
    if (ip) await this.assertIpAvailable(ip, id);
    return this.prisma.towerIp.update({
      where: { id },
      data: {
        ip,
        office: dto.office?.trim(),
        updatedById: userId,
      },
      include: towerIpInclude,
    });
  }

  assign(id: string, dto: AssignTowerIpDto, userId: string) {
    return this.saveAssignment(id, dto, userId, 'ASIGNACION');
  }

  reassign(id: string, dto: AssignTowerIpDto, userId: string) {
    return this.saveAssignment(id, dto, userId, 'REASIGNACION');
  }

  async remove(id: string, userId: string) {
    await this.findActive(id);
    await this.prisma.towerIp.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    });
  }

  private async saveAssignment(
    id: string,
    dto: AssignTowerIpDto,
    userId: string,
    assignmentType: 'ASIGNACION' | 'REASIGNACION',
  ) {
    const existing = await this.findActive(id);
    const isAssigned = existing.configuredAt !== null;
    if (assignmentType === 'ASIGNACION' && isAssigned) {
      throw new ConflictException('Esta IP ya está asignada. Usa la opción de reasignar.');
    }
    if (assignmentType === 'REASIGNACION' && !isAssigned) {
      throw new ConflictException('Esta IP todavía no está asignada. Usa la opción de asignar.');
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.towerIp.updateMany({
        where: {
          id,
          deletedAt: null,
          configuredAt: assignmentType === 'ASIGNACION' ? null : { not: null },
        },
        data: {
          responsible: dto.responsible.trim(),
          location: dto.location.trim(),
          antenna: dto.antenna,
          observations: dto.observations?.trim() || null,
          configuredAt: now,
          configuredById: userId,
          updatedById: userId,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('El estado de asignación de esta IP cambió. Actualiza la lista e inténtalo de nuevo.');
      }

      await tx.towerIpAssignment.create({
        data: {
          towerIpId: id,
          assignmentType,
          responsible: dto.responsible.trim(),
          location: dto.location.trim(),
          antenna: dto.antenna,
          observations: dto.observations?.trim() || null,
          assignedById: userId,
        },
      });

      return tx.towerIp.findUnique({ where: { id }, include: towerIpInclude });
    });
  }

  private async findActive(id: string) {
    const item = await this.prisma.towerIp.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException('IP no encontrada.');
    return item;
  }

  private async assertIpAvailable(ip: string, excludedId?: string) {
    const duplicate = await this.prisma.towerIp.findFirst({
      where: { ip, id: excludedId ? { not: excludedId } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Ya existe un registro con esa IP.');
  }
}
