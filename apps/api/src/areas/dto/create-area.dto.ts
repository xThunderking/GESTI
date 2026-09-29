import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'Radiologia' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Área encargada de estudios de imagenología.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
