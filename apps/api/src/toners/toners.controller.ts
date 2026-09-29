import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateTonerDto } from './dto/create-toner.dto';
import { UpdateTonerDto } from './dto/update-toner.dto';
import { TonersService } from './toners.service';

@ApiTags('Toners')
@ApiBearerAuth()
@Controller('toners')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'TI')
export class TonersController {
  constructor(@Inject(TonersService) private readonly service: TonersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar toners activos' })
  findAll() { return this.service.findAll(); }

  @Post()
  @ApiOperation({ summary: 'Registrar toner' })
  create(@Body(new ValidationPipe({ expectedType: CreateTonerDto, forbidNonWhitelisted: true, transform: true, whitelist: true })) dto: CreateTonerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar toner' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ValidationPipe({ expectedType: UpdateTonerDto, forbidNonWhitelisted: true, transform: true, whitelist: true })) dto: UpdateTonerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar de baja toner' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }
}
