import 'multer';
import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateEmailRequestDto } from './dto/create-email-request.dto';
import { UpdateEmailRequestDto } from './dto/update-email-request.dto';
import { EmailRequestsService } from './email-requests.service';

@ApiTags('Solicitudes de correo institucional')
@ApiBearerAuth()
@Controller('email-requests')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'TI')
export class EmailRequestsController {
  constructor(@Inject(EmailRequestsService) private readonly service: EmailRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes de correo institucional' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Registrar solicitud de correo institucional' })
  create(
    @Body(new ValidationPipe({ expectedType: CreateEmailRequestDto, forbidNonWhitelisted: true, transform: true, whitelist: true }))
    dto: CreateEmailRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar solicitud de correo institucional' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ expectedType: UpdateEmailRequestDto, forbidNonWhitelisted: true, transform: true, whitelist: true }))
    dto: UpdateEmailRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Post(':id/generate')
  @ApiOperation({ summary: 'Generar el formato Word con los datos de la solicitud' })
  generate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.generate(id, user.id);
  }

  @Get('template')
  @ApiOperation({ summary: 'Descargar la plantilla actual de correo institucional' })
  getTemplate() {
    return this.service.getTemplate();
  }

  @Post('template')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('template'))
  @ApiOperation({ summary: 'Reemplazar la plantilla de correo institucional' })
  async replaceTemplate(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Selecciona un archivo Word .docx.');
    return this.service.replaceTemplate(file, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar de baja una solicitud' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }
}
