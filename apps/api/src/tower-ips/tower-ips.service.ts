import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTowerIpDto } from './dto/create-tower-ip.dto';
import type { UpdateTowerIpDto } from './dto/update-tower-ip.dto';

const towerIpInclude = {
  configuredBy: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
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
        location: dto.location.trim(),
        responsible: dto.responsible.trim(),
        antenna: dto.antenna,
        observations: dto.observations?.trim() || null,
        configuredById: userId,
        createdById: userId,
        updatedById: userId,
      },
      include: towerIpInclude,
    });
  }

  async update(id: string, dto: UpdateTowerIpDto, userId: string) {
    const existing = await this.prisma.towerIp.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('IP no encontrada.');
    const ip = dto.ip?.trim();
    if (ip) await this.assertIpAvailable(ip, id);
    return this.prisma.towerIp.update({
      where: { id },
      data: {
        ip,
        office: dto.office?.trim(),
        location: dto.location?.trim(),
        responsible: dto.responsible?.trim(),
        antenna: dto.antenna,
        observations: dto.observations === undefined ? undefined : dto.observations.trim() || null,
        updatedById: userId,
        configuredById: userId,
        configuredAt: new Date(),
      },
      include: towerIpInclude,
    });
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.towerIp.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('IP no encontrada.');
    await this.prisma.towerIp.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    });
  }

  private async assertIpAvailable(ip: string, excludedId?: string) {
    const duplicate = await this.prisma.towerIp.findFirst({
      where: { ip, id: excludedId ? { not: excludedId } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Ya existe un registro con esa IP.');
  }
}
