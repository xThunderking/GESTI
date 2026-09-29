import 'multer';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import JSZip from 'jszip';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEmailRequestDto } from './dto/create-email-request.dto';
import type { UpdateEmailRequestDto } from './dto/update-email-request.dto';

const requestInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class EmailRequestsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.emailRequest.findMany({
      where: { deletedAt: null },
      include: requestInclude,
      orderBy: [{ requestDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getTemplate() {
    const content = await readFile(this.templatePath());
    return {
      fileName: 'PLANTILLA CORREO.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      documentBase64: content.toString('base64'),
    };
  }

  async replaceTemplate(file: Express.Multer.File, userId: string) {
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new ConflictException('La plantilla debe ser un archivo Word .docx.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new ConflictException('La plantilla no puede superar 5 MB.');
    }
    try {
      const zip = await JSZip.loadAsync(file.buffer);
      if (!zip.file('word/document.xml') || !zip.file('[Content_Types].xml')) {
        throw new Error('Not a Word document');
      }
    } catch {
      throw new ConflictException('El archivo seleccionado no es un documento Word válido.');
    }
    const destination = this.templatePath();
    const temporary = `${destination}.${randomUUID()}.tmp`;
    await writeFile(temporary, file.buffer);
    await rename(temporary, destination);
    return { message: 'La plantilla fue reemplazada correctamente.', updatedById: userId };
  }

  create(dto: CreateEmailRequestDto, userId: string) {
    return this.prisma.emailRequest.create({
      data: {
        fullName: dto.fullName.trim(),
        collaboratorNo: dto.collaboratorNo.trim(),
        area: dto.area.trim(),
        position: dto.position.trim(),
        justification: dto.justification.trim(),
        suggestedEmail: dto.suggestedEmail.trim(),
        service: dto.service.trim(),
        requestingBoss: dto.requestingBoss.trim(),
        areaDirector: dto.areaDirector.trim(),
        tiResponsible: dto.tiResponsible.trim(),
        requestDate: new Date(),
        createdById: userId,
        updatedById: userId,
      },
      include: requestInclude,
    });
  }

  async update(id: string, dto: UpdateEmailRequestDto, userId: string) {
    await this.findActive(id);
    return this.prisma.emailRequest.update({
      where: { id },
      data: { ...this.toData(dto), updatedById: userId },
      include: requestInclude,
    });
  }

  async generate(id: string, userId: string) {
    const request = await this.findActive(id);
    const templatePath = this.templatePath();
    const template = await readFile(templatePath);
    const zip = await JSZip.loadAsync(template);
    const values: Record<string, string> = {
      FECHA: this.formatDate(request.requestDate),
      NOMBRECOMPLETO: request.fullName,
      NOCOLABORADOR: request.collaboratorNo,
      AREA: request.area,
      CARGO: request.position,
      JUSTIFICACION: request.justification,
      CORREOSUGERIDO: request.suggestedEmail,
      SERVICIO: request.service,
      NOMBRECOMPLETO2: request.fullName,
      JEFESOLICITANTE: request.requestingBoss,
      JEFESOLICTANTE: request.requestingBoss,
      DIRECTORAREA: request.areaDirector,
      RESPONSABLETI: request.tiResponsible,
    };

    for (const fileName of Object.keys(zip.files)) {
      if (!fileName.endsWith('.xml')) continue;
      const file = zip.file(fileName);
      if (!file) continue;
      const xml = await file.async('string');
      const replaced = Object.entries(values).reduce(
        (content, [key, value]) => content.replaceAll(`&lt;&lt;${key}&gt;&gt;`, this.escapeXml(value)),
        xml,
      );
      zip.file(fileName, replaced);
    }

    const documentBase64 = await zip.generateAsync({ type: 'base64' });
    await this.prisma.emailRequest.update({ where: { id }, data: { lastGeneratedAt: new Date(), updatedById: userId } });
    return {
      fileName: `Solicitud-correo-${request.collaboratorNo}-${this.fileDate(request.requestDate)}.docx`,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      documentBase64,
    };
  }

  async remove(id: string, userId: string) {
    await this.findActive(id);
    await this.prisma.emailRequest.update({ where: { id }, data: { deletedAt: new Date(), deletedById: userId, updatedById: userId } });
  }

  private async findActive(id: string) {
    const request = await this.prisma.emailRequest.findFirst({ where: { id, deletedAt: null } });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    return request;
  }

  private toData(dto: CreateEmailRequestDto | UpdateEmailRequestDto) {
    return {
      fullName: dto.fullName?.trim(), collaboratorNo: dto.collaboratorNo?.trim(), area: dto.area?.trim(), position: dto.position?.trim(),
      justification: dto.justification?.trim(), suggestedEmail: dto.suggestedEmail?.trim(), service: dto.service?.trim(),
      requestingBoss: dto.requestingBoss?.trim(), areaDirector: dto.areaDirector?.trim(), tiResponsible: dto.tiResponsible?.trim(),
    };
  }

  private formatDate(date: Date) {
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private fileDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private escapeXml(value: string) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  }

  private templatePath() {
    return join(__dirname, '..', '..', 'templates', 'PLANTILLA CORREO.docx');
  }
}
