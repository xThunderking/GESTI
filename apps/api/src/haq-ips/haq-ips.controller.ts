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
import { CreateHaqIpDto } from './dto/create-haq-ip.dto';
import { UpdateHaqIpDto } from './dto/update-haq-ip.dto';
import { HaqIpsService } from './haq-ips.service';

@ApiTags('IPs de HAQ')
@ApiBearerAuth()
@Controller('haq-ips')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'TI')
export class HaqIpsController {
  constructor(@Inject(HaqIpsService) private readonly service: HaqIpsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar IPs de HAQ activas' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Registrar IP de HAQ' })
  create(
    @Body(
      new ValidationPipe({
        expectedType: CreateHaqIpDto,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    dto: CreateHaqIpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar IP de HAQ' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(
      new ValidationPipe({
        expectedType: UpdateHaqIpDto,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    dto: UpdateHaqIpDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar de baja IP de HAQ' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user.id);
  }
}
