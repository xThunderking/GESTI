import { PartialType } from '@nestjs/swagger';
import { CreateHaqIpDto } from './create-haq-ip.dto';

export class UpdateHaqIpDto extends PartialType(CreateHaqIpDto) {}
