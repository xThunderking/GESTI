import {
  Body,
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
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { PrintersService } from './printers.service';

@ApiTags('Impresoras')
@ApiBearerAuth()
@Controller('printers')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'TI')
export class PrintersController {
  constructor(@Inject(PrintersService) private readonly printersService: PrintersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar impresoras activas' })
  findAll() {
    return this.printersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Registrar impresora' })
  create(
    @Body(new ValidationPipe({ expectedType: CreatePrinterDto, forbidNonWhitelisted: true, transform: true, whitelist: true }))
    dto: CreatePrinterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.printersService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar impresora' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ expectedType: UpdatePrinterDto, forbidNonWhitelisted: true, transform: true, whitelist: true }))
    dto: UpdatePrinterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.printersService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar de baja una impresora' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.printersService.remove(id, user.id);
  }
}
