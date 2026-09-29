import { PartialType } from '@nestjs/swagger';
import { CreateTonerDto } from './create-toner.dto';

export class UpdateTonerDto extends PartialType(CreateTonerDto) {}
