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
import { CreateComputerEquipmentDto } from './dto/create-computer-equipment.dto';
import { UpdateComputerEquipmentDto } from './dto/update-computer-equipment.dto';
import { ComputerEquipmentService } from './computer-equipment.service';

@ApiTags('Equipos de cómputo')
@ApiBearerAuth()
@Controller('computer-equipment')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'TI')
export class ComputerEquipmentController {
  constructor(
    @Inject(ComputerEquipmentService) private readonly service: ComputerEquipmentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar equipos de cómputo activos' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Registrar equipo de cómputo' })
  create(
    @Body(
      new ValidationPipe({
        expectedType: CreateComputerEquipmentDto,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    dto: CreateComputerEquipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar equipo de cómputo' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateComputerEquipmentDto,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    dto: UpdateComputerEquipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar de baja un equipo de cómputo' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }
}
