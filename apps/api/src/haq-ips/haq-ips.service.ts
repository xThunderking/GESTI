import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateHaqIpDto } from './dto/create-haq-ip.dto';
import type { UpdateHaqIpDto } from './dto/update-haq-ip.dto';

const haqIpInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class HaqIpsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.haqIp.findMany({
      where: { deletedAt: null },
      include: haqIpInclude,
      orderBy: [{ area: 'asc' }, { ip: 'asc' }],
    });
  }

  async create(dto: CreateHaqIpDto, userId: string) {
    const values = {
      ip: dto.ip.trim(),
      area: dto.area.trim(),
      responsible: dto.responsible.trim(),
      username: dto.username.trim(),
      observations: dto.observations?.trim() || null,
    };
    await this.assertIpAvailable(values.ip, undefined);
    return this.prisma.haqIp.create({
      data: { ...values, createdById: userId, updatedById: userId },
      include: haqIpInclude,
    });
  }

  async update(id: string, dto: UpdateHaqIpDto, userId: string) {
    await this.findActive(id);
    const values = this.normalize(dto);
    if (values.ip) await this.assertIpAvailable(values.ip, id);
    return this.prisma.haqIp.update({
      where: { id },
      data: { ...values, updatedById: userId },
      include: haqIpInclude,
    });
  }

  async remove(id: string, userId: string) {
    await this.findActive(id);
    await this.prisma.haqIp.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: userId, updatedById: userId },
    });
  }

  private normalize(dto: CreateHaqIpDto | UpdateHaqIpDto) {
    return {
      ip: dto.ip?.trim(),
      area: dto.area?.trim(),
      responsible: dto.responsible?.trim(),
      username: dto.username?.trim(),
      observations: dto.observations?.trim() || null,
    };
  }

  private async findActive(id: string) {
    const item = await this.prisma.haqIp.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException('IP de HAQ no encontrada.');
    return item;
  }

  private async assertIpAvailable(ip: string | undefined, excludedId: string | undefined) {
    if (!ip) return;
    const duplicate = await this.prisma.haqIp.findFirst({
      where: { ip, id: excludedId ? { not: excludedId } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Ya existe una IP de HAQ con ese valor.');
  }
}
