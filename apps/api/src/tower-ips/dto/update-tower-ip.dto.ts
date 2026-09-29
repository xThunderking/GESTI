import { PartialType } from '@nestjs/swagger';
import { CreateTowerIpDto } from './create-tower-ip.dto';

export class UpdateTowerIpDto extends PartialType(CreateTowerIpDto) {}
