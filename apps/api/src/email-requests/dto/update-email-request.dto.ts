import { PartialType } from '@nestjs/swagger';
import { CreateEmailRequestDto } from './create-email-request.dto';

export class UpdateEmailRequestDto extends PartialType(CreateEmailRequestDto) {}
