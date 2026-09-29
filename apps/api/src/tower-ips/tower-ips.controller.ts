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
import { CreateTowerIpDto } from './dto/create-tower-ip.dto';
import { UpdateTowerIpDto } from './dto/update-tower-ip.dto';
import { TowerIpsService } from './tower-ips.service';

@ApiTags('IPs Torre Médica')
@ApiBearerAuth()
@Controller('tower-ips')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'TI')
export class TowerIpsController {
  constructor(@Inject(TowerIpsService) private readonly towerIpsService: TowerIpsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar IPs activas de la Torre Médica' })
  findAll() {
    return this.towerIpsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Registrar IP de Torre Médica' })
  create(
    @Body(new ValidationPipe({ expectedType: CreateTowerIpDto, forbidNonWhitelisted: true, transform: true, whitelist: true }))
    dto: CreateTowerIpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.towerIpsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar IP de Torre Médica' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ expectedType: UpdateTowerIpDto, forbidNonWhitelisted: true, transform: true, whitelist: true }))
    dto: UpdateTowerIpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.towerIpsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar de baja IP de Torre Médica' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.towerIpsService.remove(id, user.id);
  }
}
