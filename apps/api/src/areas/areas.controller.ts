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
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreasService } from './areas.service';

@ApiTags('Áreas')
@ApiBearerAuth()
@Controller('areas')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('ADMIN', 'SUPERVISOR', 'TI')
export class AreasController {
  constructor(@Inject(AreasService) private readonly areasService: AreasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar áreas activas' })
  findAll() {
    return this.areasService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear área' })
  create(
    @Body(new ValidationPipe({ expectedType: CreateAreaDto, forbidNonWhitelisted: true, transform: true, whitelist: true }))
    dto: CreateAreaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.areasService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar área' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ expectedType: UpdateAreaDto, forbidNonWhitelisted: true, transform: true, whitelist: true }))
    dto: UpdateAreaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.areasService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dar de baja un área' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.areasService.remove(id, user.id);
  }
}
