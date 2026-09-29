import { PartialType } from '@nestjs/swagger';
import { CreateComputerEquipmentDto } from './create-computer-equipment.dto';

export class UpdateComputerEquipmentDto extends PartialType(CreateComputerEquipmentDto) {}
